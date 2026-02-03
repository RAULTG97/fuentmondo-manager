/**
 * Fuentmondo Manager - Tournament Web Worker (Vite Optimized)
 * Optimized version: Import using absolute paths or ensure Vite worker build.
 */

import { calculateH2HStandings } from '../utils/StandingsCalculator.js';
import { calculateSanctions } from '../utils/SanctionsCalculator.js';

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        switch (type) {
            case 'CALCULATE_ALL':
                const { roundsData, teamList, championshipName } = payload;
                if (championshipName) teamList.__championshipName = championshipName;

                // Perform calculations
                const standings = calculateH2HStandings(roundsData);
                const sanctions = calculateSanctions(roundsData, teamList);

                // ENRICHMENT: Inject lastMatchData into standings teams
                // This was previously lost during the migration to the worker
                const standingsWithEnrichment = standings.map(team => {
                    const tid = team.id || team._id;

                    // Find the last round where this team actually played
                    const playedRounds = [...roundsData]
                        .sort((a, b) => (b.number || 0) - (a.number || 0))
                        .filter(r => r.matches && r.matches.some(m => m.homeTeamId === tid || m.awayTeamId === tid));

                    if (playedRounds.length > 0) {
                        const lastR = playedRounds[0];
                        const lastM = lastR.matches.find(m => m.homeTeamId === tid || m.awayTeamId === tid);
                        const isHome = lastM.homeTeamId === tid;

                        team.lastMatchData = {
                            round: lastR.number,
                            score: isHome ? lastM.homeScore : lastM.awayScore,
                            lineup: isHome ? lastM.lineupA : lastM.lineupB,
                            opponentName: isHome ? lastM.awayName : lastM.homeName,
                            opponentId: isHome ? lastM.awayTeamId : lastM.homeTeamId
                        };
                    }
                    return team;
                });

                self.postMessage({
                    type: 'CALCULATION_SUCCESS',
                    payload: { standings: standingsWithEnrichment, sanctions }
                });
                break;

            case 'CALCULATE_STANDINGS':
                const resStandings = calculateH2HStandings(payload.roundsData);
                self.postMessage({
                    type: 'STANDINGS_SUCCESS',
                    payload: resStandings
                });
                break;

            default:
                console.warn('[Worker] Unknown message type:', type);
        }
    } catch (error) {
        console.error('[Worker Error]', error);
        self.postMessage({
            type: 'CALCULATION_ERROR',
            error: error.message
        });
    }
};
