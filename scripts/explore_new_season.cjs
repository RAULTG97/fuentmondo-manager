/**
 * Script to explore the Futmondo API and discover new season data
 * Usage: node scripts/explore_new_season.cjs
 */

const axios = require('axios');

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

// Known old season IDs (2025/26)
const OLD_CHAMP_IDS = {
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
        console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
        return null;
    }
}

async function externalGet(path) {
    try {
        const response = await axios.get(`https://api.futmondo.com/external/kong${path}`, {
            params: { apiKey: CONFIG.API_KEY },
            headers: {
                'Origin': 'https://app.futmondo.com',
                'Referer': 'https://app.futmondo.com/',
            }
        });
        return response.data?.answer || response.data;
    } catch (error) {
        console.error(`Error calling ${path}:`, error.response?.data || error.message);
        return null;
    }
}

async function main() {
    console.log("===========================================");
    console.log(" FUENTMONDO - Nueva Temporada API Explorer");
    console.log("===========================================\n");

    // 1. Get user championships list
    console.log("📋 1. Obteniendo championships del usuario...");
    const userChamps = await internalPost('/1/userteam/championships', {});
    if (userChamps) {
        console.log("Resultado championships:", JSON.stringify(userChamps, null, 2));
    }

    // 2. Try to get user profile with championships
    console.log("\n📋 2. Obteniendo perfil de usuario...");
    const userProfile = await internalPost('/1/user/get', {});
    if (userProfile) {
        console.log("Resultado user/get:", JSON.stringify(userProfile, null, 2));
    }

    // 3. Get championship list / all championships
    console.log("\n📋 3. Listando todos los campeonatos del usuario...");
    const champList = await internalPost('/1/championship/list', {});
    if (champList) {
        console.log("Resultado championship/list:", JSON.stringify(champList, null, 2));
    }

    // 4. Try championships endpoint
    console.log("\n📋 4. Probando championships endpoint...");
    const champData = await internalPost('/1/championships', {});
    if (champData) {
        console.log("Resultado championships:", JSON.stringify(champData, null, 2));
    }

    // 5. Get userteams/championships 
    console.log("\n📋 5. Probando userteam list...");
    const userteamList = await internalPost('/1/userteam/list', {});
    if (userteamList) {
        console.log("Resultado userteam/list:", JSON.stringify(userteamList, null, 2));
    }

    // 6. Check rounds for old championship (to see if new rounds are there or it's truly new)
    console.log("\n📋 6. Comprobando rounds de los campeonatos existentes...");
    for (const [name, id] of Object.entries(OLD_CHAMP_IDS)) {
        console.log(`\n  -- ${name} (${id}) --`);
        const rounds = await internalPost('/1/userteam/rounds', { 
            championshipId: id, 
            userteamId: "55e4de47d26f276304fcc222" 
        });
        if (rounds) {
            const roundList = rounds.rounds || rounds || [];
            if (Array.isArray(roundList) && roundList.length > 0) {
                const maxRound = Math.max(...roundList.map(r => r.number || r.round || 0));
                console.log(`  Total jornadas: ${roundList.length}, Max jornada: ${maxRound}`);
                if (roundList.length > 0) {
                    console.log(`  Última jornada:`, JSON.stringify(roundList[roundList.length - 1], null, 2));
                }
            } else {
                console.log("  No rounds or unexpected format:", JSON.stringify(rounds, null, 2));
            }
        }
    }

    // 7. Try calendar endpoint for new data
    console.log("\n📋 7. Probando calendar endpoint para campeonatos...");
    for (const [name, id] of Object.entries(OLD_CHAMP_IDS)) {
        console.log(`\n  -- Calendar ${name} --`);
        const cal = await internalPost('/1/championship/calendar', { championshipId: id });
        if (cal) {
            const teams = cal.teams || cal.participants || [];
            console.log(`  Equipos en calendario: ${teams.length}`);
            if (teams.length > 0) {
                console.log(`  Primeros 3 equipos:`, teams.slice(0, 3).map(t => t.name || t.n));
            }
        }
    }

    // 8. Get ranking for round 1 of Champions to see new teams
    console.log("\n📋 8. Buscando datos de jornada 1 de nueva temporada...");
    for (const [name, id] of Object.entries(OLD_CHAMP_IDS)) {
        console.log(`\n  -- Round 1 ranking ${name} --`);
        const r1 = await internalPost('/1/ranking/round', { 
            championshipId: id, 
            roundNumber: 1,
            roundId: 1
        });
        if (r1) {
            const ranking = r1.ranking || [];
            console.log(`  Equipos en jornada 1: ${ranking.length}`);
            if (ranking.length > 0) {
                console.log(`  Equipos:`, ranking.map(t => t.name).join(', '));
            } else {
                console.log(`  Respuesta:`, JSON.stringify(r1, null, 2));
            }
        }
    }
}

main().catch(console.error);
