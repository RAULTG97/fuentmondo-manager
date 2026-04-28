import axios from 'axios';

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

const CHAMP_ID = "6598143af1e53905facfcc6d"; // 1a Div

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
        return { error: error.message };
    }
}

async function test() {
    // 1. Get rounds to find J21 ID
    const roundsRes = await internalPost('/1/userteam/rounds', { championshipId: CHAMP_ID, userteamId: "65981926d220e05de3fdc762" });
    const j21 = roundsRes.answer.find(r => r.number === 21);
    console.log(`J21 ID: ${j21.id}`);

    const res = await internalPost('/1/ranking/round', {
        championshipId: CHAMP_ID,
        roundNumber: 21,
        roundId: j21.id
    });

    if (res && res.answer && res.answer.ranking) {
        console.log("SUCCESS for J21!");
    } else {
        console.log(`Failed for J21: ${JSON.stringify(res.answer)}`);
    }
}

test();
