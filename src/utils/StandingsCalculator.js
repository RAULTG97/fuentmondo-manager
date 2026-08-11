/**
 * Calculates the Head-to-Head standings based on a list of rounds data.
 * Season 26/27: All data comes from the API – no historical file dependency.
 *
 * @param {Array} roundsData - Array of round objects
 * @param {Array} [allTeams]  - Optional full team list from calendar (for zero-point fallback)
 * @returns {Array} Sorted standings array
 */
export function calculateH2HStandings(roundsData, allTeams = []) {
    const stats = {};

    roundsData.forEach(round => {
        if (!round.matches) return;

        // Build a round-specific map for index resolution (1-indexed)
        const roundTeams = new Map();
        if (round.ranking) {
            round.ranking.forEach((t, idx) => roundTeams.set(idx + 1, t));
        }

        round.matches.forEach(match => {
            const [p1Idx, p2Idx] = match.p || [];
            const [score1, score2] = match.m || [0, 0];

            let team1, team2;

            if (p1Idx !== undefined && p2Idx !== undefined && roundTeams.size > 0) {
                team1 = roundTeams.get(p1Idx);
                team2 = roundTeams.get(p2Idx);
            }

            // Fallback to direct IDs/Names if ranking resolution failed
            if (!team1 && match.homeTeamId) {
                team1 = { _id: match.homeTeamId, name: match.homeName || 'Unknown' };
            }
            if (!team2 && match.awayTeamId) {
                team2 = { _id: match.awayTeamId, name: match.awayName || 'Unknown' };
            }

            if (!team1 || !team2) return;

            updateTeamStats(stats, team1, score1, score2, round.number, team2.name);
            updateTeamStats(stats, team2, score2, score1, round.number, team1.name);
        });
    });

    // Final processing for each team
    Object.values(stats).forEach(s => {
        if (s.matchHistory) {
            s.matchHistory.sort((a, b) => b.round - a.round);
        }
    });

    // If we have a full team list (from calendar), add any team not yet tracked with 0 points
    if (allTeams && allTeams.length > 0) {
        allTeams.forEach(t => {
            const id = t._id || t.id;
            if (id && !stats[id]) {
                stats[id] = createZeroStats(id, t.name || t.n || 'Unknown');
            }
        });
    }

    // Sort: Points desc → GF desc
    return Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.gf - a.gf;
    });
}

/**
 * Creates a zero-point stats object (used for teams not yet in any played round)
 */
function createZeroStats(id, name) {
    return {
        id,
        name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        gf: 0,
        ga: 0,
        hist_pts: 0,
        hist_gen: 0,
        matchHistory: []
    };
}

/**
 * Helper to update or initialize team statistics
 */
function updateTeamStats(stats, team, gf, ga, roundNum, opponentName) {
    const id = team._id || team.id;

    if (!stats[id]) {
        stats[id] = createZeroStats(id, team.name || 'Unknown');
    }

    const s = stats[id];
    s.played++;
    s.gf += gf;
    s.ga += ga;

    let result = '';
    if (gf > ga) {
        s.won++;
        s.points += 3;
        result = 'V';
    } else if (gf < ga) {
        s.lost++;
        result = 'D';
    } else {
        s.drawn++;
        s.points += 1;
        result = 'E';
    }

    s.matchHistory.push({ round: roundNum, opponentName, result });
}
