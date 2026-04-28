const axios = require('axios');
const CONFIG = {
    API_KEY: '840fd852-5a3d-4286-9f5b-59d4c7b8973b',
    INTERNAL_TOKEN: '32ea-574d-773a-442c-a226-068a-7732-4752',
    INTERNAL_USER_ID: '638848d6728ac7cd0b047a06'
};

const internalApi = axios.create({
    baseURL: 'https://api.futmondo.com',
    headers: { 'Content-Type': 'application/json' }
});

const internalPost = (endpoint, query) => {
    return internalApi.post(endpoint, {
        header: {
            token: CONFIG.INTERNAL_TOKEN,
            userid: CONFIG.INTERNAL_USER_ID
        },
        query: query,
        answer: {}
    }).then(res => res.data.answer);
};

async function test() {
    const championshipId = '6669f913d7d4285d390066ee'; // COPA PIRAÑA ID
    try {
        console.log("Fetching Cup Data...");
        const response = await internalApi.post('/5/cup/get', {
            header: {
                token: CONFIG.INTERNAL_TOKEN,
                userid: CONFIG.INTERNAL_USER_ID
            },
            query: { championshipId },
            answer: {}
        });
        
        const cup = response.data.answer;
        if (!cup || !cup.rounds) {
            console.log("API Structure Response:", JSON.stringify(response.data, null, 2));
            return;
        }

        console.log("Rounds found:", cup.rounds.length);
        const round1 = cup.rounds.find(r => r.number === 1);
        if (round1) {
            console.log("Round 1 ID:", round1.id || round1._id);
            console.log("Round 1 Match 1:", JSON.stringify(round1.matches[0], null, 2));
        } else {
            console.log("Round 1 not found in:", cup.rounds.map(r => r.number));
        }

    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}

test();
