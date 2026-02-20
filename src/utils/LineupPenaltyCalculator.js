/**
 * LineupPenaltyCalculator.js
 *
 * Utility to calculate penalties for teams that field fewer than 11 players.
 * Rule: -5 points per missing player (e.g. 10 players → -5 pts; 9 → -10 pts).
 *
 * This affects matchup scores, and consequently the standings.
 */

const MAX_PLAYERS = 11;
const PENALTY_PER_MISSING = 5;

/**
 * Given a lineup array, returns penalty info.
 *
 * @param {Array} lineup - Array of player objects
 * @param {number} [maxPlayers=11] - Maximum expected players in the lineup
 * @returns {{ missingPlayers: number, penaltyPoints: number }}
 *   penaltyPoints is always <= 0 (negative or zero)
 */
export function calcLineupPenalty(lineup, maxPlayers = MAX_PLAYERS) {
    const count = Array.isArray(lineup) ? lineup.length : 0;
    const missing = Math.max(0, maxPlayers - count);
    return {
        missingPlayers: missing,
        penaltyPoints: missing > 0 ? -(missing * PENALTY_PER_MISSING) : 0
    };
}

/**
 * Computes the final score for a team taking into account lineup penalty.
 *
 * @param {number} rawScore - Raw sum of player points
 * @param {Array} lineup - Array of player objects
 * @returns {{ finalScore: number, penaltyPoints: number, missingPlayers: number }}
 */
export function computeFinalScore(rawScore, lineup) {
    const { penaltyPoints, missingPlayers } = calcLineupPenalty(lineup);
    return {
        finalScore: rawScore + penaltyPoints,
        penaltyPoints,
        missingPlayers
    };
}
