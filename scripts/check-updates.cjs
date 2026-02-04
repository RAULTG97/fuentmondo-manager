/**
 * Check Updates Script
 * Run by GitHub Actions to check for new rounds/scores
 */
const admin = require('firebase-admin');
const axios = require('axios');

// 1. Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!serviceAccount.project_id) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT env var');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const msg = admin.messaging();

// Configuration
// Ideally these come from Secrets. Fallback to hardcoded for compatibility if env missing (but warn).
const CONFIG = {
    CHAMPIONSHIP_ID: process.env.VITE_CHAMPIONSHIP_ID || '6598143af1e53905facfcc6d', // Default to Champions
    BASE_URL: 'https://api.futmondo.com',
    AUTH: {
        TOKEN: process.env.VITE_INTERNAL_TOKEN || 'e1c9_5554f9913726b6e2563b78e8200c5e5b',
        USER_ID: process.env.VITE_INTERNAL_USER_ID || '55e4de47d26f276304fcc222'
    }
};

async function checkUpdates() {
    try {
        console.log('Starting Advanced Update Check...');

        // A. Get Last State from Firestore
        const docRef = db.collection('app_state').doc('last_checked');
        const doc = await docRef.get();
        const lastState = doc.exists ? doc.data() : {};

        // B. Fetch Rounds (Internal API)
        const PIVOT_USERTEAM_ID = '65981926d220e05de3fdc762';

        const roundsResp = await axios.post(`${CONFIG.BASE_URL}/1/userteam/rounds`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: { championshipId: CONFIG.CHAMPIONSHIP_ID, userteamId: PIVOT_USERTEAM_ID },
            answer: {}
        });

        const rounds = roundsResp.data.answer || roundsResp.data;
        if (!Array.isArray(rounds)) throw new Error('Invalid Rounds API response');

        const currentRound = rounds.find(r => r.status === 'current') || rounds[rounds.length - 1];

        // C. Fetch Live Ranking/Scores
        const rankingResp = await axios.post(`${CONFIG.BASE_URL}/1/ranking/round`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: {
                championshipId: CONFIG.CHAMPIONSHIP_ID,
                roundNumber: currentRound.number,
                roundId: currentRound._id
            },
            answer: {}
        });

        const rankingData = rankingResp.data.answer || rankingResp.data;
        const ranking = rankingData.ranking || [];


        // Calculate Hash of TEAM Points (Faster/Simpler)
        const teamPointsHash = ranking
            .map(t => `${t._id}:${t.points || 0}`)
            .sort()
            .join('|');

        // D. Fetch Lineups for Captains Hash (Batched Concurrent Requests)
        let captainsHash = '';
        if (currentRound.status === 'current') {
            console.log('Fetching lineups for captains...');
            const teams = ranking.map(t => t._id);
            const captains = [];

            // Helper to fetch lineup and extract captain
            const fetchLineup = async (teamId) => {
                try {
                    const res = await axios.post(`${CONFIG.BASE_URL}/1/userteam/roundlineup`, {
                        header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                        query: { championshipId: CONFIG.CHAMPIONSHIP_ID, userteamId: teamId, round: currentRound._id },
                        answer: {}
                    });
                    const data = res.data.answer || res.data;
                    const list = data.players?.initial || data.players || data.lineup || [];
                    const captain = list.find(p => p.cpt || p.captain);
                    const captainName = captain ? (captain.name || captain.nick || 'Unknown') : 'None';
                    return `${teamId}:${captainName}`;
                } catch (e) {
                    return `${teamId}:Error`;
                }
            };

            // Process in chunks
            const chunkSize = 5;
            for (let i = 0; i < teams.length; i += chunkSize) {
                const chunk = teams.slice(i, i + chunkSize);
                const results = await Promise.all(chunk.map(fetchLineup));
                captains.push(...results);
            }

            captainsHash = captains.sort().join('|');
            console.log(`Captains Hash: ${captainsHash.substring(0, 50)}...`);
        }

        // Combine hashes
        const masterHash = `${teamPointsHash}#${captainsHash}`;

        console.log(`Current Round: ${currentRound.number} (${currentRound.status})`);
        console.log(`Master Hash Length: ${masterHash.length}`);

        // E. Compare logic
        let notify = false;
        let notificationTitle = '';
        let notificationBody = '';

        if (!lastState.round || lastState.round !== currentRound.number) {
            // New Round
            notify = true;
            notificationTitle = '¡Nueva Jornada!';
            notificationBody = `La Jornada ${currentRound.number} está en juego.`;
        } else if (lastState.status !== currentRound.status) {
            // Status changed
            notify = true;
            notificationTitle = 'Estado Actualizado';
            notificationBody = `La Jornada ${currentRound.number} pasa a: ${currentRound.status}.`;
        } else if (lastState.hash && lastState.hash !== masterHash && currentRound.status === 'current') {
            // Hash Changed
            notify = true;
            notificationTitle = '🔔 Actualización Fuentmondo';
            notificationBody = `Han cambiado puntos o capitanes en la J${currentRound.number}. Revisa las sanciones.`;
        }

        // F. Notify and Save
        if (notify) {
            console.log('Change detected! Sending notification...');

            const message = {
                notification: {
                    title: notificationTitle,
                    body: notificationBody
                },
                topic: 'general'
            };

            await msg.send(message);
            console.log('Notification sent:', message);

            await docRef.set({
                round: currentRound.number,
                status: currentRound.status,
                hash: masterHash,
                lastUpdate: new Date().toISOString()
            });
        } else {
            console.log('No significant changes.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Data:', error.response.data);
        process.exit(1);
    }
}

checkUpdates();
