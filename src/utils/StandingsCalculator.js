import historicalRankings from '../data/historical_rankings.json';
import { resolveTeamName } from './TeamResolver';

// normalizeName is now provided by TeamResolver, but we can keep a local alias if needed
// or just use resolveTeamName directly where relevant.

/**
 * Calculates the Head-to-Head standings based on a list of rounds data.
 * Each round object should contain a 'matches' array.
 * 
 * @param {Array} roundsData - Array of round objects (from getInternalRankingRound)
 * @returns {Array} Sorted standings array
 */
export function calculateH2HStandings(roundsData) {
    const stats = {}; // { teamId: { played, won, drawn, lost, points, gf, ga, name, hist_pts, hist_gen } }

    // Create a mapping from normalized name to historical data for easier lookup
    const normalizedHist = {};
    Object.keys(historicalRankings).forEach(name => {
        normalizedHist[resolveTeamName(name)] = historicalRankings[name];
    });

    roundsData.forEach(round => {
        if (!round.matches) return;

        // Create map for THIS ROUND (Indices 1..20 -> Real ID/Name)
        const roundMap = {};
        if (round.ranking) {
            round.ranking.forEach((t, idx) => {
                const pos = idx + 1;
                roundMap[pos] = t; // { _id, name, ... }
            });
        }

        round.matches.forEach(match => {
            const pIds = match.p || []; // Indices! e.g. [1, 2]
            const scores = match.m || [0, 0];

            if (pIds.length < 2) return;

            // Resolve indices to Real IDs
            const t1 = roundMap[pIds[0]];
            const t2 = roundMap[pIds[1]];

            if (!t1 || !t2) return; // Skip if mapping fails

            const idA = t1._id;
            const idB = t2._id;
            const scoreA = scores[0];
            const scoreB = scores[1];

            // Initialize stats if not present
            if (!stats[idA]) {
                const hist = normalizedHist[resolveTeamName(t1.name)] || { pts_totales: 0, pts_generales: 0 };
                stats[idA] = initStats(idA, t1.name, hist.pts_totales, hist.pts_generales);
            }
            if (!stats[idB]) {
                const hist = normalizedHist[resolveTeamName(t2.name)] || { pts_totales: 0, pts_generales: 0 };
                stats[idB] = initStats(idB, t2.name, hist.pts_totales, hist.pts_generales);
            }

            // Update Played, GF, GA
            stats[idA].played++;
            stats[idB].played++;
            stats[idA].gf += scoreA;
            stats[idA].ga += scoreB;
            stats[idB].gf += scoreB;
            stats[idB].ga += scoreA;

            // Determine Result
            if (scoreA > scoreB) {
                stats[idA].won++;
                stats[idA].points += 3;
                stats[idB].lost++;
            } else if (scoreB > scoreA) {
                stats[idB].won++;
                stats[idB].points += 3;
                stats[idA].lost++;
            } else {
                stats[idA].drawn++;
                stats[idA].points += 1;
                stats[idB].drawn++;
                stats[idB].points += 1;
            }
        });
    });

    // Convert to array and sort
    // Sort criteria: Total Points > Total General
    const standings = Object.values(stats).sort((a, b) => {
        const totalA = a.points + a.hist_pts;
        const totalB = b.points + b.hist_pts;
        if (totalB !== totalA) return totalB - totalA;

        const genA = a.gf + a.hist_gen;
        const genB = b.gf + b.hist_gen;
        return genB - genA;
    });

    return standings;
}

function initStats(id, name, hist_pts = 0, hist_gen = 0) {
    return {
        id,
        name: name || "Unknown",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        gf: 0,
        ga: 0,
        hist_pts,
        hist_gen
    };
}
