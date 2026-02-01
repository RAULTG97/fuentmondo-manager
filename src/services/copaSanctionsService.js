import { getInternalCup, getInternalLineup, getInternalRounds } from './api';

// Helper to wait to avoid rate limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const CopaSanctionsService = {
    // Cache for historical sanctions to avoid re-calculating
    // key: roundId -> result object
    _cache: {},

    /**
     * Calculate all sanctions for a specific Copa Round
     * @param {string} championshipId 
     * @param {object} roundData - The round object from cup data (has matches)
     * @param {number} roundNumber - The official cup round number (1, 2, 3...)
     */
    async calculateRoundSanctions(championshipId, roundData, roundNumber) {
        const cacheKey = `${championshipId}_${roundNumber}`;
        if (CopaSanctionsService._cache[cacheKey]) return CopaSanctionsService._cache[cacheKey];

        const matches = roundData.matches || [];
        const sanctions = [];
        const teamScores = []; // { teamName, teamId, score }
        const allCaptains = []; // { teamName, teamId, captainName, captainPoints }
        const allPlayers = []; // { teamName, teamId, playerName, playerPoints, playerId, clubId }

        // 1. Fetch Lineups & Gather Data
        // We do this sequentially or in limited batches to be nice to the API
        const matchesWithLineups = [];


        for (const match of matches) {
            const home = match.home;
            const away = match.away;

            // Skip placeholders/byes for now (handle "Not played first 2 rounds" later)
            if (!home?.team || !away?.team) continue;

            const homeId = home.team.id;
            const awayId = away.team.id;
            // The "roundId" for fetching lineup might be different from cup round number.
            // Usually we need the "championship roundId". 
            // In API response, match often has 'roundId' or similar. 
            // BUT cup matches happen in specific championship rounds.
            // Let's assume we can get the correct roundId from the match or pass it.
            // NOTE: The user prompt says "Recuerda que para hacer esas llamadas puedes autenticarte..."
            // It doesn't clarify where roundId comes from for the lineup call.
            // Cup rounds map to championship rounds. `roundData` usually has `roundId` (the global one).
            const globalRoundId = roundData.roundId || match.roundId;

            if (!globalRoundId) {
                continue;
            }

            // Fetch Lineups
            // Adding delay to avoid rate limiting
            await delay(100);
            const homeLineupData = await getInternalLineup(championshipId, homeId, globalRoundId);
            await delay(100);
            const awayLineupData = await getInternalLineup(championshipId, awayId, globalRoundId);

            matchesWithLineups.push({
                match,
                globalRoundId,
                home: { ...home, lineup: CopaSanctionsService._extractLineup(homeLineupData) },
                away: { ...away, lineup: CopaSanctionsService._extractLineup(awayLineupData) }
            });
        }

        // 2. Process Data for Sanctions
        matchesWithLineups.forEach(({ home, away }) => {
            // Collect Scores
            if (home.team) teamScores.push({ name: home.team.name, id: home.team.id, score: home.score || CopaSanctionsService._sumLineup(home.lineup) });
            if (away.team) teamScores.push({ name: away.team.name, id: away.team.id, score: away.score || CopaSanctionsService._sumLineup(away.lineup) });

            // Collect Players & Captains
            [home, away].forEach(side => {
                if (!side.team) return;
                const lineup = side.lineup || [];
                const captain = lineup.find(p => p.captain) || lineup[0]; // Fallback if no captain marked? Usually there is one.

                if (captain) {
                    allCaptains.push({
                        teamName: side.team.name,
                        teamId: side.team.id,
                        captainName: captain.name,
                        captainPoints: captain.points || 0,
                        captainId: captain.id
                    });
                }

                lineup.forEach(p => {
                    allPlayers.push({
                        teamName: side.team.name,
                        teamId: side.team.id,
                        playerName: p.name,
                        playerPoints: p.points || 0,
                        playerId: p.id,
                        club: p.club, // Assuming club info is here
                        clubId: p.teamId || p.clubId, // Verify structure
                        isCaptain: !!p.captain
                    });
                });

                // Rule: Same Club Players + Captain (1€)
                CopaSanctionsService._checkSameClubSanction(side, sanctions, roundNumber);
            });

            // Rule: Repeated Player in Matchup (1€)
            // Rule: Repeated Captain in Matchup (2€/1€)
            CopaSanctionsService._checkMatchupRepetitions(home, away, sanctions, roundNumber);
        });

        // Rule: 3 Worst Teams
        CopaSanctionsService._checkWorstScores(teamScores, sanctions, roundNumber);

        // Rule: Worst Captain (1€)
        CopaSanctionsService._checkWorstCaptain(allCaptains, sanctions, roundNumber);

        // Rule: Worst Player (1€)
        CopaSanctionsService._checkWorstPlayer(allPlayers, sanctions, roundNumber);

        // Rule: Missed First 2 Rounds (5€) - "Aquellos equipos participantes que no jueguen los dos primeros partidos"
        // This is now handled in scanCopaAndCalculate globally as it requires checking history across rounds.

        const results = {
            roundNumber,
            sanctions,
            calculatedAt: new Date().toISOString()
        };

        this._cache[cacheKey] = results;
        return results;
    },

    /**
     * Fetch Captain usage history for the entire Cup
     * Returns object in format expected by CaptainsPanel: { [teamId]: { name, captainHistory: [{ round, player }] } }
     */
    async getAllCaptainsHistory(championshipId, cupData) {
        // Reuse the comprehensive scanner if possible, or keep this specific fetcher.
        // For efficiency, let's make a unified method "scanCopaAndCalculate" that does everything.
        const result = await this.scanCopaAndCalculate(championshipId, cupData);
        return result.captainHistory;
    },

    /**
     * Scans the entire Copa (all rounds, all matches), fetches lineups,
     * and calculates ALL sanctions and captain history.
     * Returns: { 
     *   sanctions: [ { team, amount, reason, round } ],
     *   captainHistory: { [teamId]: { name, history: [{ round, player }] } },
     *   teamStats: { [teamId]: { name, total: 0, breakdown: [] } }
     * }
     */
    async scanCopaAndCalculate(championshipId, cupData) {
        const result = {
            sanctions: [],
            captainHistory: {}, // teamId -> { name, captainHistory: [] }
            teamStats: {}       // teamId -> { id, name, total: 0, breakdown: [], captainHistory: [] }
        };

        const rounds = cupData.rounds || [];
        const matchesToProcess = [];

        // 1. Gather all participants first to ensure EVERY team is represented
        const allParticipantsMap = new Map(); // teamName -> teamId
        rounds.forEach(round => {
            (round.matches || []).forEach(m => {
                if (m.home?.team) allParticipantsMap.set(m.home.team.name, m.home.team.id || m.home.team._id);
                if (m.away?.team) allParticipantsMap.set(m.away.team.name, m.away.team.id || m.away.team._id);
            });
        });

        // Initialize teamStats for everyone
        allParticipantsMap.forEach((teamId, teamName) => {
            result.teamStats[teamId] = { id: teamId, name: teamName, total: 0, breakdown: [], captainHistory: [] };
            result.captainHistory[teamId] = { name: teamName, captainHistory: [] };
        });

        // 2. Identify and gather matches to process
        rounds.forEach(round => {
            if (!round.matches || round.matches.length === 0) return;

            const effectiveRoundId = round.id || round._id || round.roundId;

            if (!effectiveRoundId) return;

            round.matches.forEach(match => {
                if (match.home?.team && match.away?.team) {
                    // Detect if this match has multiple legs (based on score array length or roundIds)
                    // If round has multiple associated roundIds, or match has a specific legs array
                    const legs = match.legs || [effectiveRoundId]; // Fallback if no specific legs defined

                    legs.forEach((legRoundId, legIdx) => {
                        matchesToProcess.push({
                            match,
                            roundNum: round.number,
                            legNum: legIdx + 1,
                            effectiveRoundId: legRoundId
                        });
                    });
                }
            });
        });


        // 3. Fetch Lineups with Concurrency Control
        const CHUNK_SIZE = 5;
        for (let i = 0; i < matchesToProcess.length; i += CHUNK_SIZE) {
            const chunk = matchesToProcess.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async ({ match, roundNum, effectiveRoundId, legNum }) => {
                if (!match) return;
                try {
                    const homeId = match.home.team.id || match.home.team._id;
                    const homeL = await getInternalLineup(championshipId, homeId, effectiveRoundId);
                    const homePlayers = CopaSanctionsService._extractLineup(homeL);

                    const awayId = match.away.team.id || match.away.team._id;
                    const awayL = await getInternalLineup(championshipId, awayId, effectiveRoundId);
                    const awayPlayers = CopaSanctionsService._extractLineup(awayL);

                    // A. Update Captains History
                    CopaSanctionsService._recordCaptain(result, homeId, match.home.team.name, homePlayers, `${roundNum}.${legNum}`);
                    CopaSanctionsService._recordCaptain(result, awayId, match.away.team.name, awayPlayers, `${roundNum}.${legNum}`);

                    // B. Store Lineups for UI detail view
                    CopaSanctionsService._recordLineup(result, homeId, match.home.team.name, homePlayers, roundNum, CopaSanctionsService._sumLineup(homePlayers));
                    CopaSanctionsService._recordLineup(result, awayId, match.away.team.name, awayPlayers, roundNum, CopaSanctionsService._sumLineup(awayPlayers));

                    // C. Round Sanctions (Repetitions, Same Club)
                    const roundSanctions = [];
                    CopaSanctionsService._checkMatchupRepetitions({ team: match.home.team, lineup: homePlayers }, { team: match.away.team, lineup: awayPlayers }, roundSanctions, roundNum);
                    CopaSanctionsService._checkSameClubSanction({ team: match.home.team, lineup: homePlayers }, roundSanctions, roundNum);
                    CopaSanctionsService._checkSameClubSanction({ team: match.away.team, lineup: awayPlayers }, roundSanctions, roundNum);

                    result.sanctions.push(...roundSanctions);

                    // Store scores/performances for round-level calculations
                    if (!result.roundScores) result.roundScores = {};
                    if (!result.roundScores[roundNum]) result.roundScores[roundNum] = [];
                    const hScore = CopaSanctionsService._sumLineup(homePlayers);
                    const aScore = CopaSanctionsService._sumLineup(awayPlayers);
                    result.roundScores[roundNum].push({ teamId: homeId, name: match.home.team.name, score: hScore });
                    result.roundScores[roundNum].push({ teamId: awayId, name: match.away.team.name, score: aScore });

                    if (!result.roundPerformances) result.roundPerformances = {};
                    if (!result.roundPerformances[roundNum]) result.roundPerformances[roundNum] = { captains: [], players: [] };

                    const isCaptain = (p) => {
                        const val = !!p.captain || p.role === 'captain' || p.cpt;
                        return val;
                    };


                    const hCap = homePlayers.find(isCaptain);
                    if (hCap) {
                        result.roundPerformances[roundNum].captains.push({
                            teamId: homeId,
                            name: match.home.team.name,
                            captainName: hCap.name || hCap.playerName || 'Capitán',
                            points: hCap.points || 0
                        });
                    }

                    const aCap = awayPlayers.find(isCaptain);
                    if (aCap) {
                        result.roundPerformances[roundNum].captains.push({
                            teamId: awayId,
                            name: match.away.team.name,
                            captainName: aCap.name || aCap.playerName || 'Capitán',
                            points: aCap.points || 0
                        });
                    }

                    homePlayers.forEach(p => result.roundPerformances[roundNum].players.push({
                        teamId: homeId,
                        name: match.home.team.name,
                        playerName: p.name || p.playerName || 'Jugador',
                        points: p.points || 0
                    }));
                    awayPlayers.forEach(p => result.roundPerformances[roundNum].players.push({
                        teamId: awayId,
                        name: match.away.team.name,
                        playerName: p.name || p.playerName || 'Jugador',
                        points: p.points || 0
                    }));

                } catch (e) {
                    console.error(`Error processing match ${match.id}:`, e);
                }
            }));
            await delay(100);
        }

        // 4. Post-Process Round-Level Sanctions
        if (result.roundScores) {
            Object.keys(result.roundScores).forEach(rNum => {
                CopaSanctionsService._checkWorstScores(result.roundScores[rNum], result.sanctions, Number(rNum));
            });
        }
        if (result.roundPerformances) {
            Object.keys(result.roundPerformances).forEach(rNum => {
                const roundPerf = result.roundPerformances[rNum];
                CopaSanctionsService._checkWorstCaptain(roundPerf.captains, result.sanctions, Number(rNum));
                CopaSanctionsService._checkWorstPlayer(roundPerf.players, result.sanctions, Number(rNum));
            });
        }

        // 5. Sanction for Not Playing Round 1 & 2 (Byes in both)
        const playedInR1 = new Set();
        const playedInR2 = new Set();

        matchesToProcess.forEach(m => {
            if (m.roundNum === 1) {
                playedInR1.add(m.match.home.team.name);
                playedInR1.add(m.match.away.team.name);
            }
            if (m.roundNum === 2) {
                playedInR2.add(m.match.home.team.name);
                playedInR2.add(m.match.away.team.name);
            }
        });

        allParticipantsMap.forEach((teamId, teamName) => {
            const missed1 = !playedInR1.has(teamName);

            if (missed1) {
                result.sanctions.push({
                    team: teamName,
                    amount: 5,
                    reason: 'No juega Ronda 1 (Recibe sanción por empezar más tarde)',
                    round: 1
                });
            }
        });

        // 6. Transform to teamStats format for UI
        CopaSanctionsService._compileStats(result);

        return result;
    },


    _recordCaptain(result, teamId, teamName, players, roundNum) {
        if (!result.teamStats[teamId]) {
            result.teamStats[teamId] = { id: teamId, name: teamName, total: 0, breakdown: [], captainHistory: [] };
        }
        // Also populate simple captainHistory for compatibility
        if (!result.captainHistory[teamId]) {
            result.captainHistory[teamId] = { name: teamName, captainHistory: [] };
        }

        const isCaptain = (p) => !!p.captain || p.role === 'captain' || p.cpt;
        const captain = players.find(isCaptain);
        if (captain) {
            const playerName = captain.name || captain.playerName || 'Desconocido';
            const entry = { round: roundNum, player: playerName, warning: false, alert: false };
            result.teamStats[teamId].captainHistory.push(entry);
            result.captainHistory[teamId].captainHistory.push(entry);
        }
    },

    _recordLineup(result, teamId, teamName, players, roundNum, score) {
        if (!result.teamStats[teamId]) {
            result.teamStats[teamId] = { id: teamId, name: teamName, total: 0, breakdown: [], captainHistory: [] };
        }
        const stats = result.teamStats[teamId];
        // Record the most recent lineup found (highest round number)
        if (!stats.lastMatchData || roundNum >= stats.lastMatchData.round) {
            stats.lastMatchData = {
                round: roundNum,
                score: score,
                lineup: players
            };
        }
    },

    _compileStats(result) {
        // Aggregate sanctions into teamStats
        result.sanctions.forEach(s => {
            // Find team ID by name (inefficient but workable since we stored name)
            const teamId = Object.keys(result.teamStats).find(id => result.teamStats[id].name === s.team);
            if (teamId) {
                result.teamStats[teamId].total += s.amount;
                result.teamStats[teamId].breakdown.push({
                    round: s.round,
                    type: 'Sanción Copa',
                    detail: s.reason,
                    cost: s.amount
                });
            } else {
                // Or create entry if team had no captain but got sanctioned (unlikely but possible)
            }
        });

        // Mark repeated captains warnings
        Object.values(result.teamStats).forEach(team => {
            const counts = {};
            team.captainHistory.forEach(h => {
                counts[h.player] = (counts[h.player] || 0) + 1;
            });

            team.captainHistory.forEach(h => {
                if (counts[h.player] === 2) h.warning = true;
                if (counts[h.player] >= 3) h.alert = true;
            });
        });
    },

    // --- Helpers ---

    _extractLineup(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.lineup && Array.isArray(data.lineup)) return data.lineup;
        if (data.players && data.players.initial && Array.isArray(data.players.initial)) return data.players.initial;
        if (data.players && Array.isArray(data.players)) return data.players;
        return [];
    },

    _sumLineup(lineup) {
        return lineup.reduce((sum, p) => sum + (p.points || 0), 0);
    },

    _checkWorstScores(teamScores, sanctions, round) {
        if (teamScores.length < 3) return;

        // Sort ascending
        const sorted = [...teamScores].sort((a, b) => a.score - b.score);

        // Find distinct worst scores
        const uniqueScores = [...new Set(sorted.map(s => s.score))].sort((a, b) => a - b);

        // Worst (2€)
        if (uniqueScores.length > 0) {
            const score1 = uniqueScores[0];
            const worstTeams = sorted.filter(t => t.score === score1);
            worstTeams.forEach(t => sanctions.push({
                team: t.name,
                amount: 2,
                reason: `Peor puntuación de la ronda (${score1} pts)`,
                round
            }));
        }

        // 2nd Worst (1.5€)
        if (uniqueScores.length > 1) {
            const score2 = uniqueScores[1];
            const secondWorstTeams = sorted.filter(t => t.score === score2);
            secondWorstTeams.forEach(t => sanctions.push({
                team: t.name,
                amount: 1.5,
                reason: `2ª Peor puntuación de la ronda (${score2} pts)`,
                round
            }));
        }

        // 3rd Worst (1€)
        if (uniqueScores.length > 2) {
            const score3 = uniqueScores[2];
            const thirdWorstTeams = sorted.filter(t => t.score === score3);
            thirdWorstTeams.forEach(t => sanctions.push({
                team: t.name,
                amount: 1,
                reason: `3ª Peor puntuación de la ronda (${score3} pts)`,
                round
            }));
        }
    },

    _checkWorstCaptain(allCaptains, sanctions, round) {
        if (allCaptains.length === 0) return;
        const minPoints = Math.min(...allCaptains.map(c => c.points));

        allCaptains.filter(c => c.points === minPoints).forEach(c => {
            sanctions.push({
                team: c.name,
                amount: 1,
                reason: `Capitán con peor puntuación (${c.captainName}, ${minPoints} pts)`,
                round
            });
        });
    },

    _checkWorstPlayer(allPlayers, sanctions, round) {
        if (allPlayers.length === 0) return;
        const minPoints = Math.min(...allPlayers.map(p => p.points));

        // "Si tiene varios jugadores con la peor puntuación solo computa a uno."
        // So we group by team first.
        const sanctionedTeams = new Set();

        allPlayers.filter(p => p.points === minPoints).forEach(p => {
            if (!sanctionedTeams.has(p.teamId)) {
                sanctions.push({
                    team: p.name,
                    amount: 1,
                    reason: `Jugador con peor puntuación de la jornada (${p.playerName}, ${minPoints} pts)`,
                    round
                });
                sanctionedTeams.add(p.teamId);
            }
        });
    },

    _checkMatchupRepetitions(home, away, sanctions, round) {
        if (!home.team || !away.team) return;

        const getPId = (p) => String(p.id || p._id || p.playerId || '');
        const homeIds = new Set(home.lineup.map(getPId).filter(id => id && id !== 'undefined' && id !== 'null'));
        const awayIds = new Set(away.lineup.map(getPId).filter(id => id && id !== 'undefined' && id !== 'null'));

        const homeCaptain = home.lineup.find(p => p.captain);
        const awayCaptain = away.lineup.find(p => p.captain);

        // Repeated Players (excluding captains logic which is handled separately or overrides?)
        // "Si tienen el mismo capitán... (en este caso no se aplicaría la sanción de jugador repetido, si no la de capitán repetido)"

        // Find common player IDs
        const commonIds = [...homeIds].filter(id => awayIds.has(id));

        commonIds.forEach(id => {
            const homeP = home.lineup.find(p => getPId(p) === id);
            const awayP = away.lineup.find(p => getPId(p) === id);

            if (!homeP || !awayP) return;

            const playerName = homeP.name || homeP.playerName || awayP.name || awayP.playerName || 'Jugador';

            const isCaptain = (p) => !!p.captain || p.role === 'captain' || p.cpt;
            const isHomeCap = isCaptain(homeP);
            const isAwayCap = isCaptain(awayP);

            if (isHomeCap && isAwayCap) {
                // Both are captain
                sanctions.push({
                    team: home.team.name,
                    amount: 2,
                    reason: `Capitán repetido (${playerName})`,
                    round
                });
                sanctions.push({
                    team: away.team.name,
                    amount: 2,
                    reason: `Capitán repetido (${awayP.name})`,
                    round
                });
            } else if (isHomeCap || isAwayCap) {
                // One is captain, the other is not
                // "El equipo que tiene alineado al jugador sin ser capitán paga 1€ de sanción"
                const offender = isHomeCap ? away : home;
                const offenderP = isHomeCap ? awayP : homeP; // The one who is NOT captain

                sanctions.push({
                    team: offender.team.name,
                    amount: 1,
                    reason: `Alineado jugador que es capitán rival (${playerName})`,
                    round
                });
            } else {
                // Neither is captain -> Normal repeated player
                // "Por cada jugador que se este alineado en los dos equipos: 1€ de sanción."
                // Does this mean BOTH pay? "Por cada jugador... 1€ de sanción". Usually means both.
                // "Se comparan los jugadores... 1€ de sanción". Assuming both pay 1€ per repeated player.
                sanctions.push({
                    team: home.team.name,
                    amount: 1,
                    reason: `Jugador repetido (${playerName})`,
                    round
                });
                sanctions.push({
                    team: away.team.name,
                    amount: 1,
                    reason: `Jugador repetido (${awayP.name})`,
                    round
                });
            }
        });
    },

    _checkSameClubSanction(side, sanctions, round) {
        if (!side.team || !side.lineup) return;

        // Group by club
        const byClub = {};
        side.lineup.forEach(p => {
            // Need to be careful about club property. 
            // In some API responses it's `teamId` (club id) or `clubId`. 
            // Assuming `p.club` or `p.clubId` exists.
            const clubId = p.clubId || p.teamId; // Adjust based on real API response
            if (!clubId) return;

            if (!byClub[clubId]) byClub[clubId] = [];
            byClub[clubId].push(p);
        });

        // "Si un equipo alinea a dos jugadores que sean del mismo club, y uno de ellos es el capitán, eso supone una sanción de 1€."
        Object.values(byClub).forEach(players => {
            if (players.length >= 2) {
                const isCaptain = (p) => !!p.captain || p.role === 'captain' || p.cpt;
                const hasCaptain = players.some(isCaptain);
                if (hasCaptain) {
                    sanctions.push({
                        team: side.team.name,
                        amount: 1,
                        reason: `2 jugadores mismo club y uno capitán (${players[0].club || 'mismo club'})`,
                        round
                    });
                }
            }
        });
    }
};
