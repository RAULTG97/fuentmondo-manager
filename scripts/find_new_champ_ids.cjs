/**
 * Script to find new season championship IDs via Futmondo API
 */

const axios = require('axios');

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

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
        const status = error.response?.status;
        const data = error.response?.data;
        return { error: error.message, status, data };
    }
}

async function main() {
    console.log("=== Buscando nuevos IDs de campeonato ===\n");

    // Try /5/championship endpoints (Copa uses /5/ prefix)
    const endpointsToTry = [
        ['/5/championship/list', {}],
        ['/5/championship/get', {}],
        ['/5/user/championships', {}],
        ['/5/user/get', {}],
        ['/1/user/leagues', {}],
        ['/1/league/list', {}],
        ['/5/league/list', {}],
        ['/1/userteam/get', { userteamId: CONFIG.INTERNAL_USER_ID }],
        ['/1/userteam/seasons', {}],
        ['/1/season/list', {}],
        ['/5/season/list', {}],
    ];

    for (const [ep, q] of endpointsToTry) {
        console.log(`Probando: ${ep}`);
        const res = await internalPost(ep, q);
        if (!res?.error && res?.answer !== 'api.error.general') {
            console.log(`  ✅ RESPUESTA:`, JSON.stringify(res, null, 2));
        } else {
            console.log(`  ❌ Error: ${res?.error || res?.answer}`);
        }
    }

    // Try the userteams endpoint that's used in the app:
    // Based on the app code: /1/userteam/rounds
    console.log("\n=== Probando con userteamId alternativo ===\n");
    
    // Try to get userteam list
    const endpoints2 = [
        '/1/userteam/rounds',
        '/5/userteam/rounds',
    ];

    // The app uses userteamId: "65981926d220e05de3fdc762" for Champions
    // Let's try to find the new userteam IDs
    const possibleUserteamIds = [
        "65981926d220e05de3fdc762", // old Champions userteam
        "69766337c15cdb2bd57b94c0", // old Copa userteam
        CONFIG.INTERNAL_USER_ID,
    ];

    for (const ut of possibleUserteamIds) {
        console.log(`\nTesting userteamId: ${ut}`);
        const res = await internalPost('/1/userteam/rounds', { 
            userteamId: ut
        });
        console.log(`  Resultado:`, JSON.stringify(res?.answer || res, null, 2).substring(0, 300));
    }
}

main().catch(console.error);
