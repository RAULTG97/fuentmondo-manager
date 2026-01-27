const rank = require('./src/data/historical_rankings.json');
const capt = require('./src/data/historical_captains.json');

const rankNames = Object.keys(rank);
const captNames = new Set();
// Historical captains has rounds 1..19 as keys
Object.values(capt).forEach(round => {
    Object.keys(round).forEach(team => captNames.add(team));
});

const missingInCapt = rankNames.filter(n => !captNames.has(n));
const missingInRank = Array.from(captNames).filter(n => !rank[n]);

console.log('--- MISSING IN CAPTAINS (Rankings names not in Captains) ---');
missingInCapt.forEach(n => console.log(n));

console.log('--- MISSING IN RANKINGS (Captains names not in Rankings) ---');
missingInRank.forEach(n => console.log(n));
