/**
 * Script to get teams for the new season from existing championship IDs
 */

const axios = require('axios');

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

// Same IDs - just the new season is being prepared
const CHAMP_IDS = {
    champions: "6598143af1e53905facfcc6d",
    ligaML: "65981dd8f1fa9605fbefe305",
    copa: "697663371311f0fd5379a446"
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
        return response.data?.answer;
    } catch (error) {
        return { error: error.message, status: error.response?.status };
    }
}

async function main() {
    console.log("=== Obteniendo equipos de la nueva temporada ===\n");

    for (const [name, id] of Object.entries(CHAMP_IDS)) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`CAMPEONATO: ${name} (${id})`);
        console.log('='.repeat(50));
        
        // Try ranking/matches to get team list
        console.log(`\n📋 /5/ranking/matches:`);
        const rankingData = await internalPost('/5/ranking/matches', { championshipId: id });
        
        if (rankingData && !rankingData.error && rankingData !== 'api.error.general') {
            const teams = rankingData.teams || [];
            console.log(`  Equipos encontrados: ${teams.length}`);
            if (teams.length > 0) {
                teams.forEach((t, i) => {
                    console.log(`  ${i+1}. ${t.name} (ID: ${t._id})`);
                });
            }
            
            const rounds = rankingData.rounds || [];
            console.log(`  Jornadas: ${rounds.length}`);
        } else {
            console.log(`  Resultado: ${JSON.stringify(rankingData)}`);
        }

        // Try userteam/rounds with the stored userteam IDs
        const userteamIds = {
            champions: "65981926d220e05de3fdc762",
            copa: "69766337c15cdb2bd57b94c0",
            ligaML: null
        };
        
        if (userteamIds[name]) {
            console.log(`\n📋 /1/userteam/rounds (userteamId: ${userteamIds[name]}):`);
            const rounds = await internalPost('/1/userteam/rounds', { 
                championshipId: id, 
                userteamId: userteamIds[name]
            });
            if (rounds && Array.isArray(rounds)) {
                console.log(`  Total jornadas: ${rounds.length}`);
                if (rounds.length > 0) {
                    console.log(`  Primera jornada:`, JSON.stringify(rounds[0]));
                    console.log(`  Última jornada:`, JSON.stringify(rounds[rounds.length - 1]));
                }
            } else {
                console.log(`  Resultado:`, JSON.stringify(rounds));
            }
        }
    }
}

main().catch(console.error);
