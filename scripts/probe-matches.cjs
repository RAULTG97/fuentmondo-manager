const axios = require('axios');

const CONFIG = {
    CHAMPIONSHIP_ID: process.env.VITE_CHAMPIONSHIP_ID || '6598143af1e53905facfcc6d',
    BASE_URL: 'https://api.futmondo.com',
    AUTH: {
        TOKEN: process.env.VITE_INTERNAL_TOKEN || 'e1c9_5554f9913726b6e2563b78e8200c5e5b',
        USER_ID: process.env.VITE_INTERNAL_USER_ID || '55e4de47d26f276304fcc222'
    }
};

async function probe() {
    try {
        console.log('Probing /5/ranking/matches...');
        const res = await axios.post(`${CONFIG.BASE_URL}/5/ranking/matches`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: { championshipId: CONFIG.CHAMPIONSHIP_ID },
            answer: {}
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Node.js)'
            }
        });

        const data = res.data.answer || res.data;
        const keys = Object.keys(data);
        console.log('Top level keys:', keys);

        if (data.current) {
            console.log('Current Data (first item):', JSON.stringify(data.current[0] || 'empty'));
        }
        if (data.rounds) {
            console.log('Rounds count:', data.rounds.length);
            const lastRound = data.rounds[data.rounds.length - 1];
            console.log('Last Round:', JSON.stringify(lastRound));
        }

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

probe();
