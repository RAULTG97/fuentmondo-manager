import historicalRankings from '../data/historical_rankings.json';
import { resolveTeamName } from './TeamResolver';

/**
 * Calculates the Head-to-Head standings based on a list of rounds data.
 * Optimized for clarity and consistency with the new resolution patterns.
 * 
 * @param {Array} roundsData - Array of round objects
 * @returns {Array} Sorted standings array
 */
export function calculateH2HStandings(roundsData) {
    const stats = {};
    const historicalMap = new Map();

    // Pre-cache historical data for faster lookup
    Object.entries(historicalRankings).forEach(([name, data]) => {
        historicalMap.set(resolveTeamName(name), data);
    });

    roundsData.forEach(round => {
        if (!round.matches || !round.ranking) return;

        // Build a round-specific map for index resolution (1-indexed)
        const roundTeams = new Map();
        round.ranking.forEach((t, idx) => roundTeams.set(idx + 1, t));

        round.matches.forEach(match => {
            const [p1Idx, p2Idx] = match.p || [];
            const [score1, score2] = match.m || [0, 0];

            if (p1Idx === undefined || p2Idx === undefined) return;

            const team1 = roundTeams.get(p1Idx);
            const team2 = roundTeams.get(p2Idx);

            if (!team1 || !team2) return;

            updateTeamStats(stats, team1, score1, score2, historicalMap);
            updateTeamStats(stats, team2, score2, score1, historicalMap);
        });
    });

    // Sort: Total Points (Current + Hist) > Total General (Current + Hist)
    return Object.values(stats).sort((a, b) => {
        const totalA = a.points + a.hist_pts;
        const totalB = b.points + b.hist_pts;

        if (totalB !== totalA) return totalB - totalA;

        const genA = a.gf + a.hist_gen;
        const genB = b.gf + b.hist_gen;
        return genB - genA;
    });
}

/**
 * Helper to update or initialize team statistics
 */
function updateTeamStats(stats, team, gf, ga, historicalMap) {
    const id = team._id;

    if (!stats[id]) {
        const hist = historicalMap.get(resolveTeamName(team.name)) || { pts_totales: 0, pts_generales: 0 };
        stats[id] = {
            id,
            name: team.name || "Unknown",
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            points: 0,
            gf: 0,
            ga: 0,
            hist_pts: hist.pts_totales,
            hist_gen: hist.pts_generales
        };
    }

    const s = stats[id];
    s.played++;
    s.gf += gf;
    s.ga += ga;

    if (gf > ga) {
        s.won++;
        s.points += 3;
    } else if (gf < ga) {
        s.lost++;
    } else {
        s.drawn++;
        s.points += 1;
    }
}
