/**
 * Script to find new season championship IDs via activechampionships endpoint
 */

const axios = require('axios');

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

async function internalPost(endpoint, query, version = '') {
    try {
        const response = await axios.post(`https://api.futmondo.com${version}${endpoint}`, {
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
    console.log("=== Buscando campeonatos activos de la nueva temporada ===\n");

    // 1. Try the activechampionships endpoint (used in check-updates.cjs)
    console.log("1. /2/user/activechampionships:");
    const active = await internalPost('/user/activechampionships', 
        { excludeGeneral: false, includeProphets: true }, '/2');
    console.log(JSON.stringify(active, null, 2));

    // 2. Try getting all championships of user
    console.log("\n2. /2/championship/list:");
    const list2 = await internalPost('/championship/list', {}, '/2');
    console.log(JSON.stringify(list2, null, 2));

    // 3. Try userteam without championshipId
    console.log("\n3. /2/userteam/list:");
    const utl = await internalPost('/userteam/list', {}, '/2');
    console.log(JSON.stringify(utl, null, 2));

    // 4. Try ranking/matches with no ID to see if it gives us something
    console.log("\n4. /5/ranking/matches (no ID):");
    const rm = await internalPost('/ranking/matches', {}, '/5');
    const answerStr = JSON.stringify(rm, null, 2);
    console.log(answerStr.substring(0, 1000));

    // 5. Try to find via /5/championship/seasons or similar
    console.log("\n5. /5/championship/get:");
    const cg = await internalPost('/championship/get', {}, '/5');
    console.log(JSON.stringify(cg, null, 2));

    // 6. Try the actual app endpoint that loads user's championships
    console.log("\n6. /1/userteam/userchampionships:");
    const uc = await internalPost('/userteam/userchampionships', {}, '/1');
    console.log(JSON.stringify(uc, null, 2));

    // 7. Try /2/user/data or /2/user/profile
    console.log("\n7. /2/user/data:");
    const ud = await internalPost('/user/data', {}, '/2');
    console.log(JSON.stringify(ud, null, 2).substring(0, 2000));
}

main().catch(console.error);
