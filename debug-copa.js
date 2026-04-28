// Debug script to inspect Copa API data structure
import { getInternalCup } from './api.js';

const COPA_CHAMPIONSHIP_ID = '67780c9a0c1c5e0e9c3c4e4e'; // Copa Piraña ID

async function debugCopaData() {
    console.log('=== DEBUGGING COPA PIRAÑA API DATA ===\n');

    try {
        const cupData = await getInternalCup(COPA_CHAMPIONSHIP_ID);

        console.log('1. RAW CUP DATA STRUCTURE:');
        console.log('Type:', Array.isArray(cupData) ? 'Array' : 'Object');
        console.log('Keys:', Object.keys(cupData));
        console.log('\n');

        const rounds = Array.isArray(cupData) ? cupData : (cupData?.rounds || []);
        console.log('2. ROUNDS FOUND:', rounds.length);
        console.log('\n');

        // Focus on Round 1 (should have 1.1 and 1.2)
        const round1Rounds = rounds.filter(r => Math.floor(r.number) === 1);
        console.log('3. ROUND 1 OBJECTS:', round1Rounds.length);
        round1Rounds.forEach((r, idx) => {
            console.log(`\n   Round ${idx + 1}:`);
            console.log('   - number:', r.number);
            console.log('   - roundId:', r.roundId || r.id || r._id);
            console.log('   - matches count:', r.matches?.length || 0);

            if (r.matches && r.matches.length > 0) {
                console.log('   - First match sample:');
                const m = r.matches[0];
                console.log('     * home:', m.home?.team?.name);
                console.log('     * away:', m.away?.team?.name);
                console.log('     * matchId:', m._id || m.id || m.roundId);
            }
        });

        console.log('\n4. TOTAL MATCHES IN ROUND 1:');
        const totalMatches = round1Rounds.reduce((sum, r) => sum + (r.matches?.length || 0), 0);
        console.log('   Total:', totalMatches);
        console.log('   Expected: 32 (16 eliminatorias × 2 partidos)');

        console.log('\n5. SAMPLE PAIRING CHECK:');
        if (round1Rounds.length >= 2) {
            const r1Matches = round1Rounds[0].matches || [];
            const r2Matches = round1Rounds[1].matches || [];

            if (r1Matches.length > 0 && r2Matches.length > 0) {
                const m1 = r1Matches[0];
                const m2 = r2Matches[0];

                console.log('   Round 1.1 first match:', m1.home?.team?.name, 'vs', m1.away?.team?.name);
                console.log('   Round 1.2 first match:', m2.home?.team?.name, 'vs', m2.away?.team?.name);

                const sameTeams = (
                    (m1.home?.team?.name === m2.home?.team?.name && m1.away?.team?.name === m2.away?.team?.name) ||
                    (m1.home?.team?.name === m2.away?.team?.name && m1.away?.team?.name === m2.home?.team?.name)
                );
                console.log('   Same pairing?', sameTeams ? 'YES ✓' : 'NO ✗');
            }
        }

    } catch (error) {
        console.error('ERROR:', error);
    }
}

debugCopaData();
