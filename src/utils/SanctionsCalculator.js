/**
 * Logic for calculating financial sanctions in the Fuentmondo tournament.
 * Optimized for performance and readability.
 */

import historicalCaptains from '../data/historical_captains.json';
import { resolveTeamName, normalizeName } from './TeamResolver';
import { CONFIG } from '../config';

const isCaptain = (p) => p && (p.captain === true || p.cpt === true || p.cpt === 1 || p.role === 'captain');

// Memoization helpers
const normalizationCache = new Map();
const cachedNormalize = (name) => {
    if (!normalizationCache.has(name)) {
        normalizationCache.set(name, normalizeName(name));
    }
    return normalizationCache.get(name);
};

const teamResolutionCache = new Map();
const cachedResolveTeam = (name) => {
    if (!teamResolutionCache.has(name)) {
        teamResolutionCache.set(name, resolveTeamName(name));
    }
    return teamResolutionCache.get(name);
};

/**
 * Main calculation entry point
 */
export function calculateSanctions(roundsData, teamList = []) {
    const teamStats = {};
    const normalizedNameToId = {};
    const { matches_out, matches_no_captain } = CONFIG.SANCTION_RULES;

    // Initialize state
    teamList.forEach(team => {
        const tid = team.id || team._id;
        teamStats[tid] = createInitialTeamStats(tid, team.name);
        normalizedNameToId[cachedResolveTeam(team.name)] = tid;
    });

    const teamCaptainCounts = {}; // { teamId: { normalizedPlayer: count } }
    const sanctionsRegistry = {}; // { teamId: { normalizedPlayer: { outTeamUntil, noCaptUntil } } }
    const infractions = [];

    // 1. Historical Processing (J1-J19)
    processHistoricalData(teamStats, normalizedNameToId, teamCaptainCounts, sanctionsRegistry, infractions);

    // 2. Tournament Rounds Processing
    const sortedRounds = [...roundsData].sort((a, b) => (a.number || 0) - (b.number || 0));

    sortedRounds.forEach(round => {
        if (!round.matches) return;

        const roundData = processRound(
            round,
            teamStats,
            teamCaptainCounts,
            sanctionsRegistry,
            infractions,
            matches_out,
            matches_no_captain
        );

        // Apply Performance Penalties (worst teams/players)
        applyPerformancePenalties(round, roundData, teamStats);
    });

    // 3. Copa Special Fees
    applyCopaFees(teamList, teamStats);

    return {
        teamStats,
        infractions,
        activeSanctions: formatActiveSanctions(sanctionsRegistry, teamStats)
    };
}

/**
 * Helper to create initial team structure
 */
function createInitialTeamStats(id, name) {
    return {
        id,
        name,
        total: 0,
        breakdown: [],
        captainHistory: [],
        roundActivity: {}
    };
}

/**
 * Logic for historical data processing
 */
function processHistoricalData(teamStats, normalizedNameToId, teamCaptainCounts, sanctionsRegistry, infractions) {
    const allHistoricalRounds = Object.keys(historicalCaptains).map(Number).sort((a, b) => a - b);

    allHistoricalRounds.forEach(rNum => {
        const roundData = historicalCaptains[rNum];
        Object.keys(roundData).forEach(histName => {
            const teamId = normalizedNameToId[cachedResolveTeam(histName)];
            if (!teamId) return;

            const playerName = roundData[histName];
            if (!playerName || playerName === 'N/A') return;

            const normPlayer = cachedNormalize(playerName);

            // Check existing sanctions
            const active = sanctionsRegistry[teamId]?.[normPlayer];
            if (active) {
                const infType = rNum <= active.outTeamUntil ? 'Alineación Sancionado' :
                    (rNum <= active.noCaptUntil ? 'Capitán Sancionado' : null);

                if (infType) {
                    registerInfraction(teamId, playerName, rNum, `Infracción Histórica: ${infType}`, teamStats, infractions);
                }
            }

            // Update captain counts & history
            if (!teamCaptainCounts[teamId]) teamCaptainCounts[teamId] = {};
            teamCaptainCounts[teamId][normPlayer] = (teamCaptainCounts[teamId][normPlayer] || 0) + 1;
            const count = teamCaptainCounts[teamId][normPlayer];

            teamStats[teamId].captainHistory.push({
                round: rNum,
                player: playerName,
                count,
                warning: count % 3 === 2,
                alert: count % 3 === 0,
                isHistorical: true
            });

            // Set New Sanction
            if (count > 0 && count % 3 === 0) {
                if (!sanctionsRegistry[teamId]) sanctionsRegistry[teamId] = {};
                sanctionsRegistry[teamId][normPlayer] = {
                    outTeamUntil: rNum + 3,
                    noCaptUntil: rNum + 6,
                    playerName
                };
            }
        });
    });
}

/**
 * Logic for single round processing
 */
function processRound(round, teamStats, teamCaptainCounts, sanctionsRegistry, infractions, mOut, mNoCapt) {
    const roundScores = [];
    const currentRoundCaptains = [];
    const currentRoundPlayers = [];
    const roundMap = {};

    if (round.ranking) {
        round.ranking.forEach((t, idx) => {
            roundMap[idx + 1] = t;
            if (!teamStats[t._id]) teamStats[t._id] = createInitialTeamStats(t._id, t.name);
        });
    }

    round.matches.forEach(match => {
        const teamA = roundMap[match.p[0]];
        const teamB = roundMap[match.p[1]];
        if (!teamA || !teamB) return;

        const lineups = [
            { t: teamA, l: match.lineupA || [], o: match.lineupB || [] },
            { t: teamB, l: match.lineupB || [], o: match.lineupA || [] }
        ];

        lineups.forEach(({ t, l, o }) => {
            const teamId = t._id;
            if (!l || l.length === 0) return;

            teamStats[teamId].roundActivity[round.number] = true;
            const score = l.reduce((acc, p) => acc + (p.points || 0), 0);
            roundScores.push({ teamId, score });

            const otherPids = new Set(o.map(p => p.player_id || p.id));
            const captO = o.find(isCaptain);
            const myCaptain = l.find(isCaptain);

            l.forEach(p => {
                const pts = p.points || 0;
                const normP = cachedNormalize(p.name);
                currentRoundPlayers.push({ teamId, points: pts, name: p.name });

                // Check active sanctions
                const active = sanctionsRegistry[teamId]?.[normP];
                if (active) {
                    if (round.number <= active.outTeamUntil) {
                        registerInfraction(teamId, p.name, round.number, 'Jugador Sancionado (Fuera del equipo)', teamStats, infractions, 5);
                    } else if (isCaptain(p) && round.number <= active.noCaptUntil) {
                        registerInfraction(teamId, p.name, round.number, 'Jugador Sancionado (Sin capitanía)', teamStats, infractions, 5);
                    }
                }

                // H2H Repeating Player
                if (otherPids.has(p.player_id || p.id)) {
                    addPenalty(teamId, round.number, 'Jugador Repetido H2H', p.name, 0.5, teamStats);
                }

                if (isCaptain(p)) {
                    currentRoundCaptains.push({ teamId, points: pts, name: p.name });

                    // Captain repetitive count
                    if (!teamCaptainCounts[teamId]) teamCaptainCounts[teamId] = {};
                    teamCaptainCounts[teamId][normP] = (teamCaptainCounts[teamId][normP] || 0) + 1;
                    const count = teamCaptainCounts[teamId][normP];

                    teamStats[teamId].captainHistory.push({
                        round: round.number, player: p.name, count,
                        warning: count % 3 === 2, alert: count % 3 === 0
                    });

                    if (count > 0 && count % 3 === 0) {
                        if (!sanctionsRegistry[teamId]) sanctionsRegistry[teamId] = {};
                        sanctionsRegistry[teamId][normP] = {
                            outTeamUntil: round.number + 3,
                            noCaptUntil: round.number + 6,
                            playerName: p.name
                        };
                    }

                    if (count > 1) {
                        addPenalty(teamId, round.number, 'Capitán Repetido', `${p.name} (${count}ª vez)`, count - 1, teamStats);
                    }

                    // Club Logic
                    const clubs = {};
                    l.forEach(pl => { const c = pl.team || pl.club; if (c) clubs[c] = (clubs[c] || 0) + 1; });
                    const captClub = p.team || p.club;
                    if (captClub && clubs[captClub] >= 2) {
                        addPenalty(teamId, round.number, '2 Jugadores + Capitán mismo club', `Club: ${captClub}`, 2, teamStats);
                    }

                    // H2H Captain logic
                    if (captO) {
                        const idM = p.player_id || p.id;
                        const idO = captO.player_id || captO.id;
                        if (idM === idO) {
                            addPenalty(teamId, round.number, 'Capitán Repetido H2H', p.name, 2, teamStats);
                        } else {
                            const regularPids = new Set(l.filter(x => !isCaptain(x)).map(x => x.player_id || x.id));
                            if (regularPids.has(idO)) {
                                addPenalty(teamId, round.number, 'Tengo al Capitán rival (Regular)', captO.name, 2, teamStats);
                            }
                        }
                    }
                }
            });
        });
    });

    return { roundScores, currentRoundCaptains, currentRoundPlayers };
}

/**
 * Performance-based penalties (Worst team, Worst captain, etc.)
 */
function applyPerformancePenalties(round, data, teamStats) {
    const { roundScores, currentRoundCaptains, currentRoundPlayers } = data;

    // Worst Teams
    const uniqueScores = [...new Set(roundScores.map(s => s.score))].sort((a, b) => a - b);
    const penalties = [2, 1.5, 1];
    uniqueScores.slice(0, 3).forEach((score, idx) => {
        roundScores.filter(s => s.score === score).forEach(s => {
            addPenalty(s.teamId, round.number, `Peor Equipo (${idx + 1}º)`, `${score} pts`, penalties[idx], teamStats);
        });
    });

    // Worst Captain
    if (currentRoundCaptains.length > 0) {
        const minCapPts = Math.min(...currentRoundCaptains.map(c => c.points));
        currentRoundCaptains.filter(c => c.points === minCapPts).forEach(c => {
            addPenalty(c.teamId, round.number, 'Peor Capitán', `${c.name} (${c.points} pts)`, 1, teamStats);
        });
    }

    // Worst Player
    if (currentRoundPlayers.length > 0) {
        const minPlayerPts = Math.min(...currentRoundPlayers.map(p => p.points));
        currentRoundPlayers.filter(p => p.points === minPlayerPts).forEach(p => {
            addPenalty(p.teamId, round.number, 'Peor Jugador', `${p.name} (${p.points} pts)`, 1, teamStats);
        });
    }
}

/**
 * Registration fees for specific tournaments
 */
function applyCopaFees(teamList, teamStats) {
    const isCopa = teamList.__championshipName?.toUpperCase().includes('COPA PIRAÑA');
    if (!isCopa) return;

    Object.values(teamStats).forEach(team => {
        const roundNums = Object.keys(team.roundActivity).map(Number).sort((a, b) => a - b);
        if (roundNums.length > 0 && roundNums[0] > 2) {
            team.total += 5;
            team.breakdown.unshift({
                round: roundNums[0],
                type: 'Tasa Inscripción (Acceso directo)',
                detail: 'Exención Fase Previa',
                cost: 5
            });
        }
    });
}

/**
 * Common helper for adding penalties
 */
function addPenalty(teamId, round, type, detail, cost, teamStats) {
    if (!teamStats[teamId]) return;
    teamStats[teamId].total += cost;
    teamStats[teamId].breakdown.push({ round, type, detail, cost });
}

/**
 * Helper for registering infractions
 */
function registerInfraction(teamId, playerName, round, type, teamStats, infractions, cost = 5) {
    infractions.push({
        teamId,
        teamName: teamStats[teamId]?.name || 'Unknown',
        player: playerName,
        round,
        type,
        cost
    });
    addPenalty(teamId, round, `Infracción: ${type}`, playerName, cost, teamStats);
}

/**
 * Format the sanctions registry into a list for the UI
 */
function formatActiveSanctions(registry, teamStats) {
    const list = [];
    Object.keys(registry).forEach(tid => {
        const teamName = teamStats[tid]?.name || "Desconocido";
        Object.entries(registry[tid]).forEach(([norm, s]) => {
            list.push({
                teamId: tid,
                teamName,
                player: s.playerName || norm,
                outTeamUntil: s.outTeamUntil,
                noCaptUntil: s.noCaptUntil
            });
        });
    });
    return list;
}
