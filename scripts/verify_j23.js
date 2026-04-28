import axios from 'axios';

const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",
};

const CHAMPIONSHIPS = [
    { id: "6598143af1e53905facfcc6d", name: "1a Div", userteamId: "65981926d220e05de3fdc762" },
    { id: "65981dd8f1fa9605fbefe305", name: "2a Div", userteamId: "" }
];

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
        return null;
    }
}

async function verify() {
    for (const champ of CHAMPIONSHIPS) {
        console.log(`\nChecking ${champ.name}...`);
        const roundsRes = await internalPost('/1/userteam/rounds', { championshipId: champ.id, userteamId: champ.userteamId });
        if (roundsRes && roundsRes.answer) {
            const j23 = roundsRes.answer.find(r => r.number === 23);
            console.log("J23:", JSON.stringify(j23, null, 2));
        } else {
            console.log("Failed to get rounds.");
            if (roundsRes) console.log("Response:", JSON.stringify(roundsRes, null, 2));
        }
    }
}

verify();
