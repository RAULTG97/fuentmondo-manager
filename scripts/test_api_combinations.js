import axios from 'axios';

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

const CHAMP_ID = "6598143af1e53905facfcc6d"; // 1a Div
const J23_STR_ID = "6868f3a9ca97b13338e6ce20";

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
    console.log("Testing J23 Ranking combinations...");

    const combinations = [
        { roundNumber: 23, roundId: J23_STR_ID },
        { roundId: J23_STR_ID },
        { roundNumber: 23 },
        { round: J23_STR_ID },
        { round: 23 }
    ];

    for (const combo of combinations) {
        console.log(`\nCombo: ${JSON.stringify(combo)}`);
        const res = await internalPost('/1/ranking/round', {
            championshipId: CHAMP_ID,
            ...combo
        });
        if (res && res.answer && typeof res.answer !== 'string') {
            console.log("SUCCESS! Got ranking data.");
            if (res.answer.ranking) console.log(`Ranking length: ${res.answer.ranking.length}`);
            break;
        } else {
            console.log(`Failed: ${res.answer || res.error}`);
        }
    }
}

test();
