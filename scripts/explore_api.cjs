const axios = require('axios');

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

const CHAMP_IDS = {
    champions: "6598143af1e53905facfcc6d",
    ligaML: "65981dd8f1fa9605fbefe305",
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
    for (const [name, id] of Object.entries(CHAMP_IDS)) {
        console.log(`\n=== ${name} (${id}) ===`);
        
        console.log(`\n📋 /1/championship/get:`);
        const champ = await internalPost('/1/championship/get', { championshipId: id });
        if (champ && !champ.error) {
            console.log(`  Nombre: ${champ.name}`);
            console.log(`  Equipos inscritos: ${champ.users ? champ.users.length : 0}`);
            if (champ.users) {
                console.log(`  Ejemplo equipos:`, champ.users.slice(0, 3).map(u => u.name).join(', '));
            }
        } else {
            console.log(`  Error:`, champ);
        }

        console.log(`\n📋 /5/championship/classification:`);
        const classification = await internalPost('/5/championship/classification', { championshipId: id });
        if (classification && !classification.error && classification !== 'api.error.general') {
            const list = classification.classification || [];
            console.log(`  Clasificación (equipos): ${list.length}`);
            if (list.length > 0) {
                console.log(`  Ejemplo:`, list.slice(0, 3).map(c => `${c.teamName} (${c.points} pts)`));
            }
        } else {
            console.log(`  Error o vacío:`, classification);
        }

        console.log(`\n📋 /5/ranking/matches (con rounds=true):`);
        const ranking = await internalPost('/5/ranking/matches', { championshipId: id, rounds: true });
        if (ranking && !ranking.error && ranking !== 'api.error.general') {
            console.log(`  Equipos: ${ranking.teams?.length}`);
            console.log(`  Jornadas del calendario: ${ranking.rounds?.length}`);
        } else {
            console.log(`  Error o vacío:`, ranking);
        }
    }
}

main().catch(console.error);
