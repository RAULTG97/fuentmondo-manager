/**
 * Normalizes round numbers from the API to handle anomalies (e.g., 31.5 instead of 32).
 * Ensures sequential, integer round numbers while preserving chronological order.
 * 
 * Robustness features:
 * 1. If the API fixes itself (removes decimals), it behaves as before.
 * 2. If the API is shifted (e.g. J34 comes as 'number: 33'), it remaps it to 34.
 * 3. If the API returns J34 correctly as 'number: 34', it respects it.
 *
 * @param {Array} rounds - The raw rounds array from the API
 * @returns {Array} - The normalized rounds array
 */
export const normalizeRoundNumbers = (rounds) => {
    if (!rounds || !Array.isArray(rounds)) return rounds;

    // Process a copy and sort by original number ascending
    const sortedRounds = [...rounds].sort((a, b) => a.number - b.number);
    
    let nextAvailable = 1;
    
    return sortedRounds.map(round => {
        const rawNum = round.number;
        let targetNumber;

        if (Number.isInteger(rawNum) && rawNum >= 34) {
            // ROBUSTNESS FOR J34+: 
            // If the API already provides a correct integer >= 34, we trust it 
            // UNLESS it would cause a collision with a previously shifted round.
            targetNumber = Math.max(rawNum, nextAvailable);
        } else {
            // ANOMALY ZONE (J32/J33):
            // Use ceil to turn 31.5 into 32, and use nextAvailable to push 
            // subsequent rounds forward if they are shifted in the API.
            targetNumber = Math.max(Math.ceil(rawNum), nextAvailable);
        }
        
        // Track the next number to avoid duplicates
        nextAvailable = targetNumber + 1;
        
        return {
            ...round,
            number: targetNumber
        };
    });
};
