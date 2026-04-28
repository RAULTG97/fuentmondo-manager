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

        // 1. Get J23 ID
        const roundsRes = await internalPost('/1/userteam/rounds', { championshipId: champ.id, userteamId: champ.userteamId });
        if (!roundsRes || !roundsRes.answer) {
            console.log("Failed to get rounds.");
            continue;
        }

        const j23 = roundsRes.answer.find(r => r.number === 23);
        if (!j23) {
            console.log("Jornada 23 not found.");
            continue;
        }

        console.log(`J23 ID: ${j23.id}, Status: ${j23.status}`);

        // 2. Get ranking for J23
        const rankingRes = await internalPost('/1/ranking/round', {
            championshipId: champ.id,
            roundNumber: 23,
            roundId: j23.id
        });

        if (rankingRes && rankingRes.answer && rankingRes.answer.ranking) {
            console.log("Ranking Sample (Top 5):");
            rankingRes.answer.ranking.slice(0, 5).forEach(t => {
                console.log(`- ${t.name}: ${t.points} pts`);
            });

            if (rankingRes.answer.matches) {
                console.log("\nMatches (Scores appearing in Ranking API):");
                rankingRes.answer.matches.forEach((m, idx) => {
                    const scores = m.m || [0, 0];
                    console.log(`Match ${idx + 1}: [${m.p[0]}] vs [${m.p[1]}] -> ${scores[0]} - ${scores[1]}`);
                });
            }
        } else {
            console.log("Failed to get ranking or no ranking data.");
            if (rankingRes) console.log("Response:", JSON.stringify(rankingRes, null, 2));
        }
    }
}

verify();
