/**
 * Get Champions Fuentmondo teams for new season
 */

const axios = require('axios');

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

const CHAMP_ID = "6598143af1e53905facfcc6d"; // Champions Fuentmondo
const USERTEAM_ID = "65981926d220e05de3fdc762"; // El Huracán CF

async function internalPost(endpoint, query) {
    try {
        const response = await axios.post(`https://api.futmondo.com${endpoint}`, {
            header: {
                token: CONFIG.INTERNAL_TOKEN,
                userid: CONFIG.INTERNAL_USER_ID
            },
            query: query,
            answer: {}
        }, {
            params: { apiKey: CONFIG.API_KEY },
            headers: {
                'Origin': 'https://app.futmondo.com',
                'Referer': 'https://app.futmondo.com/',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        return { error: error.message, status: error.response?.status };
    }
}

async function main() {
    console.log("=== Champions Fuentmondo - Equipo data ===\n");

    const endpoints = [
        ['/1/championship/get', { championshipId: CHAMP_ID }],
        ['/1/ranking/get', { championshipId: CHAMP_ID }],
        ['/1/ranking/round', { championshipId: CHAMP_ID, roundNumber: 0, roundId: 0 }],
        ['/5/ranking/get', { championshipId: CHAMP_ID }],
        ['/5/championship/members', { championshipId: CHAMP_ID }],
        ['/1/championship/members', { championshipId: CHAMP_ID }],
        ['/1/userteam/championship', { championshipId: CHAMP_ID, userteamId: USERTEAM_ID }],
        ['/5/userteam/championship', { championshipId: CHAMP_ID, userteamId: USERTEAM_ID }],
        ['/2/championship/get', { championshipId: CHAMP_ID }],
        ['/2/championship/ranking', { championshipId: CHAMP_ID }],
        ['/1/ranking/ranking', { championshipId: CHAMP_ID }],
    ];

    for (const [ep, query] of endpoints) {
        const res = await internalPost(ep, query);
        const answer = res?.answer;
        if (answer && answer !== 'api.error.general' && answer !== 'api.error.invalid') {
            console.log(`✅ ${ep}:`);
            const str = JSON.stringify(answer, null, 2);
            console.log(str.substring(0, 2000));
        } else {
            console.log(`❌ ${ep}: ${answer || res?.error || 'error'}`);
        }
    }
}

main().catch(console.error);
