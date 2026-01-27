/**
 * Logic for calculating financial sanctions in the Fuentmondo tournament.
 */

import historicalCaptains from '../data/historical_captains.json';
import { resolveTeamName, normalizeName } from './TeamResolver';

const isCaptain = (p) => p && (p.captain === true || p.cpt === true || p.cpt === 1 || p.role === 'captain');

// normalizeName is now provided by TeamResolver

export function calculateSanctions(roundsData, teamList = []) {
    const teamStats = {};
    const normalizedNameToId = {};

    // Initialize stats and name mapping
    teamList.forEach(team => {
        const tid = team.id || team._id;
        teamStats[tid] = {
            id: tid,
            name: team.name,
            total: 0,
            breakdown: [],
            captainHistory: [], // [ { round, player, count, warning, alert } ]
            roundActivity: {}
        };
        normalizedNameToId[resolveTeamName(team.name)] = tid;
    });

    const teamCaptainCounts = {};
    const sanctionsRegistry = {}; // { teamId: { playerName: { outTeamUntil: roundNum, noCaptUntil: roundNum } } }
    const infractions = []; // { teamId, teamName, player, round, type, cost }

    // PRE-PROCESS HISTORICAL CAPTAINS (Rounds 1-19)
    // We need to find all rounds in historical data to determine sanction windows correctly
    const allHistoricalRounds = Object.keys(historicalCaptains).map(Number).sort((a, b) => a - b);
    const maxHistoricalRound = allHistoricalRounds.length > 0 ? allHistoricalRounds[allHistoricalRounds.length - 1] : 0;

    allHistoricalRounds.forEach(roundNum => {
        const rNum = parseInt(roundNum);
        const roundData = historicalCaptains[roundNum];
        Object.keys(roundData).forEach(histName => {
            const teamId = normalizedNameToId[resolveTeamName(histName)];
            if (!teamId) return;

            const playerName = roundData[histName];
            if (!playerName || playerName === 'N/A') return;

            const normalizedPlayer = normalizeName(playerName);

            // 1. Check if this player was already sanctioned and is committing an infraction in J1-J19
            const activeSanctions = sanctionsRegistry[teamId]?.[normalizedPlayer];
            if (activeSanctions) {
                let infType = '';
                if (rNum <= activeSanctions.outTeamUntil) {
                    infType = 'Alineación Sancionado (Historical)';
                } else if (rNum <= activeSanctions.noCaptUntil) {
                    infType = 'Capitán Sancionado (Historical)';
                }

                if (infType) {
                    infractions.push({
                        teamId,
                        teamName: teamStats[teamId].name,
                        player: playerName,
                        round: rNum,
                        type: 'Infracción Histórica: ' + infType,
                        cost: 5
                    });
                    teamStats[teamId].total += 5;
                    teamStats[teamId].breakdown.push({
                        round: rNum,
                        type: 'Infracción: ' + infType,
                        detail: `${playerName} (Baja activa en J${rNum})`,
                        cost: 5
                    });
                }
            }

            if (!teamCaptainCounts[teamId]) teamCaptainCounts[teamId] = {};
            teamCaptainCounts[teamId][normalizedPlayer] = (teamCaptainCounts[teamId][normalizedPlayer] || 0) + 1;
            const count = teamCaptainCounts[teamId][normalizedPlayer];

            // Add to history
            teamStats[teamId].captainHistory.push({
                round: rNum,
                player: playerName,
                count,
                warning: count % 3 === 2,
                alert: count % 3 === 0,
                isHistorical: true
            });

            // If a multiple of 3 is reached, set/reset sanction windows
            if (count > 0 && count % 3 === 0) {
                if (!sanctionsRegistry[teamId]) sanctionsRegistry[teamId] = {};
                sanctionsRegistry[teamId][normalizedPlayer] = {
                    outTeamUntil: rNum + 3,
                    noCaptUntil: rNum + 6,
                    playerName // Keep original for display
                };
            }
        });
    });

    const sortedRounds = [...roundsData].sort((a, b) => (a.number || 0) - (b.number || 0));

    sortedRounds.forEach(round => {
        if (!round.matches) return;

        const roundScores = [];
        let roundMinCaptainPts = Infinity;
        let roundMinPlayerPts = Infinity;
        const currentRoundCaptains = [];
        const currentRoundPlayers = [];

        const roundMap = {};
        if (round.ranking) {
            round.ranking.forEach((t, idx) => {
                const tid = t._id;
                roundMap[idx + 1] = t;
                if (!teamStats[tid]) {
                    teamStats[tid] = { id: tid, name: t.name, total: 0, breakdown: [], captainHistory: [], roundActivity: {} };
                }
            });
        }

        round.matches.forEach(match => {
            const teamA = roundMap[match.p[0]];
            const teamB = roundMap[match.p[1]];
            if (!teamA || !teamB) return;

            const lineups = { A: match.lineupA || [], B: match.lineupB || [] };

            [{ t: teamA, l: lineups.A, o: lineups.B }, { t: teamB, l: lineups.B, o: lineups.A }].forEach(side => {
                const teamId = side.t._id;
                const lineup = side.l;
                const other = side.o;

                if (!lineup || lineup.length === 0) return;

                teamStats[teamId].roundActivity[round.number] = true;

                const score = lineup.reduce((acc, p) => acc + (p.points || 0), 0);
                roundScores.push({ teamId, score });

                const captain = lineup.find(isCaptain);

                lineup.forEach(p => {
                    const pts = p.points || 0;
                    if (pts < roundMinPlayerPts) roundMinPlayerPts = pts;
                    currentRoundPlayers.push({ teamId, points: pts, name: p.name });

                    // Check for active sanctions/infractions
                    const normalizedP = normalizeName(p.name);
                    const activeSanctions = sanctionsRegistry[teamId]?.[normalizedP];
                    if (activeSanctions) {
                        // 1. Out of team check
                        if (round.number <= activeSanctions.outTeamUntil) {
                            infractions.push({
                                teamId,
                                teamName: side.t.name,
                                player: p.name,
                                round: round.number,
                                type: 'Jugador Sancionado (Fuera del equipo)',
                                cost: 5
                            });
                            teamStats[teamId].total += 5;
                            teamStats[teamId].breakdown.push({
                                round: round.number,
                                type: 'Infracción: Alineación Sancionado',
                                detail: `${p.name} (Baja hasta J${activeSanctions.outTeamUntil})`,
                                cost: 5
                            });
                        }
                        // 2. No captain check
                        else if (isCaptain(p) && round.number <= activeSanctions.noCaptUntil) {
                            infractions.push({
                                teamId,
                                teamName: side.t.name,
                                player: p.name,
                                round: round.number,
                                type: 'Jugador Sancionado (Sin capitanía)',
                                cost: 5
                            });
                            teamStats[teamId].total += 5;
                            teamStats[teamId].breakdown.push({
                                round: round.number,
                                type: 'Infracción: Capitán Sancionado',
                                detail: `${p.name} (Sin capitanía hasta J${activeSanctions.noCaptUntil})`,
                                cost: 5
                            });
                        }
                    }

                    if (isCaptain(p)) {
                        if (pts < roundMinCaptainPts) roundMinCaptainPts = pts;
                        currentRoundCaptains.push({ teamId, points: pts, name: p.name });

                        // History & Warnings
                        if (!teamCaptainCounts[teamId]) teamCaptainCounts[teamId] = {};
                        const normalizedP = normalizeName(p.name);
                        teamCaptainCounts[teamId][normalizedP] = (teamCaptainCounts[teamId][normalizedP] || 0) + 1;
                        const count = teamCaptainCounts[teamId][normalizedP];

                        teamStats[teamId].captainHistory.push({
                            round: round.number, player: p.name, count,
                            warning: count % 3 === 2, alert: count % 3 === 0
                        });

                        // Set sanction if it hits a multiple of 3
                        if (count > 0 && count % 3 === 0) {
                            if (!sanctionsRegistry[teamId]) sanctionsRegistry[teamId] = {};
                            sanctionsRegistry[teamId][normalizedP] = {
                                outTeamUntil: round.number + 3,
                                noCaptUntil: round.number + 6,
                                playerName: p.name
                            };
                        }

                        if (count > 1) {
                            const penalty = count - 1;
                            teamStats[teamId].total += penalty;
                            teamStats[teamId].breakdown.push({
                                round: round.number, type: 'Capitán Repetido', detail: `${p.name} (${count}ª vez)`, cost: penalty
                            });
                        }

                        // Same club logic
                        const clubs = {};
                        lineup.forEach(pl => { const c = pl.team || pl.club; if (c) clubs[c] = (clubs[c] || 0) + 1; });
                        const captClub = p.team || p.club;
                        if (captClub && clubs[captClub] >= 2) {
                            teamStats[teamId].total += 2;
                            teamStats[teamId].breakdown.push({ round: round.number, type: '2 Jugadores + Capitán mismo club', detail: `Club: ${captClub}`, cost: 2 });
                        }
                    }
                });

                // H2H
                if (other.length > 0) {
                    const otherPids = new Set(other.map(x => x.player_id || x.id));
                    const captO = other.find(isCaptain);

                    lineup.forEach(p => {
                        if (otherPids.has(p.player_id || p.id)) {
                            teamStats[teamId].total += 0.5;
                            teamStats[teamId].breakdown.push({ round: round.number, type: 'Jugador Repetido H2H', detail: p.name, cost: 0.5 });
                        }
                    });

                    if (captain && captO) {
                        const idM = captain.player_id || captain.id;
                        const idO = captO.player_id || captO.id;
                        if (idM === idO) {
                            teamStats[teamId].total += 2;
                            teamStats[teamId].breakdown.push({ round: round.number, type: 'Capitán Repetido H2H', detail: captain.name, cost: 2 });
                        } else {
                            const regularPids = new Set(lineup.filter(x => !isCaptain(x)).map(x => x.player_id || x.id));
                            if (regularPids.has(idO)) {
                                teamStats[teamId].total += 2;
                                teamStats[teamId].breakdown.push({ round: round.number, type: 'Tengo al Capitán rival (Regular)', detail: captO.name, cost: 2 });
                            }
                        }
                    }
                }
            });
        });

        // Team Performance
        const uniqueScores = [...new Set(roundScores.map(s => s.score))].sort((a, b) => a - b);
        if (uniqueScores.length >= 1) {
            roundScores.filter(s => s.score === uniqueScores[0]).forEach(s => {
                teamStats[s.teamId].total += 2;
                teamStats[s.teamId].breakdown.push({ round: round.number, type: 'Peor Equipo (1º)', detail: `${s.score} pts`, cost: 2 });
            });
        }
        if (uniqueScores.length >= 2) {
            roundScores.filter(s => s.score === uniqueScores[1]).forEach(s => {
                teamStats[s.teamId].total += 1.5;
                teamStats[s.teamId].breakdown.push({ round: round.number, type: 'Peor Equipo (2º)', detail: `${s.score} pts`, cost: 1.5 });
            });
        }
        if (uniqueScores.length >= 3) {
            roundScores.filter(s => s.score === uniqueScores[2]).forEach(s => {
                teamStats[s.teamId].total += 1;
                teamStats[s.teamId].breakdown.push({ round: round.number, type: 'Peor Equipo (3º)', detail: `${s.score} pts`, cost: 1 });
            });
        }

        // Captain/Player Performance
        if (roundMinCaptainPts !== Infinity) {
            currentRoundCaptains.filter(c => c.points === roundMinCaptainPts).forEach(c => {
                teamStats[c.teamId].total += 1;
                teamStats[c.teamId].breakdown.push({ round: round.number, type: 'Peor Capitán', detail: `${c.name} (${c.points} pts)`, cost: 1 });
            });
        }
        if (roundMinPlayerPts !== Infinity) {
            currentRoundPlayers.filter(p => p.points === roundMinPlayerPts).forEach(p => {
                teamStats[p.teamId].total += 1;
                teamStats[p.teamId].breakdown.push({ round: round.number, type: 'Peor Jugador', detail: `${p.name} (${p.points} pts)`, cost: 1 });
            });
        }
    });

    // Registration Fee - ONLY for "COPA PIRAÑA" championship
    // Note: We'll need to pass the championship name to the calculator
    if (teamList.__championshipName && teamList.__championshipName.toUpperCase().includes('COPA PIRAÑA')) {
        Object.values(teamStats).forEach(team => {
            const roundNums = Object.keys(team.roundActivity).map(n => parseInt(n)).sort((a, b) => a - b);
            if (roundNums.length > 0 && roundNums[0] > 2) {
                team.total += 5;
                team.breakdown.unshift({ round: roundNums[0], type: 'Tasa Inscripción (Acceso directo)', detail: 'Exención Fase Previa', cost: 5 });
            }
        });
    }

    // Prepare active sanctions list for the UI
    const activeSanctionsList = [];
    Object.keys(sanctionsRegistry).forEach(tid => {
        const teamName = teamStats[tid]?.name || "Desconocido";
        Object.keys(sanctionsRegistry[tid]).forEach(normalizedName => {
            const s = sanctionsRegistry[tid][normalizedName];
            activeSanctionsList.push({
                teamId: tid,
                teamName,
                player: s.playerName || normalizedName,
                outTeamUntil: s.outTeamUntil,
                noCaptUntil: s.noCaptUntil
            });
        });
    });

    return {
        teamStats,
        infractions,
        activeSanctions: activeSanctionsList
    };
}
