/**
 * Check Updates Script
 * Run by GitHub Actions to check for new rounds/scores
 * HYBRID STRATEGY V3: 
 * 1. Get Metadata (RoundId/Num) from /1/userteam/rounds
 * 2. Get Matches/Teams from /5/ranking/matches
 * 3. Map integer IDs to ObjectIds via ARRAY INDEX (pId - 1)
 * 4. Fetch details (Lineup/Captain) via /1/userteam/roundlineup
 */
const admin = require('firebase-admin');
const axios = require('axios');

// 1. Initialize Firebase Admin
let db, msg;
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = serviceAccountRaw ? JSON.parse(serviceAccountRaw) : null;

if (!serviceAccount || !serviceAccount.project_id) {
    console.error('Missing or invalid FIREBASE_SERVICE_ACCOUNT env var');
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    msg = admin.messaging();
} catch (e) {
    console.error('Firebase Init Error:', e);
    process.exit(1);
}

// Configuration
const CONFIG = {
    CHAMPIONSHIP_ID: process.env.VITE_CHAMPIONSHIP_ID || '6598143af1e53905facfcc6d',
    BASE_URL: 'https://api.futmondo.com',
    AUTH: {
        TOKEN: process.env.VITE_INTERNAL_TOKEN || 'e1c9_5554f9913726b6e2563b78e8200c5e5b',
        USER_ID: process.env.VITE_INTERNAL_USER_ID || '55e4de47d26f276304fcc222'
    }
};

async function checkUpdates() {
    try {
        console.log('Starting Update Check (Hybrid V3)...');

        // A. Get Last State from Firestore
        const docRef = db.collection('app_state').doc('last_checked');
        let lastState = {};
        try {
            const doc = await docRef.get();
            lastState = doc.exists ? doc.data() : {};
        } catch (dbError) {
            console.error('Warning: Failed to fetch from Firestore. Proceeding empty.');
            lastState = {};
        }

        // B. Fetch Round Metadata (Legacy API)
        const PIVOT_USERTEAM_ID = '65981926d220e05de3fdc762';
        console.log('Fetching round metadata...');
        const metaResp = await axios.post(`${CONFIG.BASE_URL}/1/userteam/rounds`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: { championshipId: CONFIG.CHAMPIONSHIP_ID, userteamId: PIVOT_USERTEAM_ID },
            answer: {}
        });

        const rounds = metaResp.data.answer || metaResp.data;
        if (!Array.isArray(rounds)) throw new Error('Invalid Rounds Metadata response');

        const activeRound = rounds.find(r => r.status === 'current') || rounds[rounds.length - 1];
        const targetRoundNum = activeRound.number;
        const targetRoundId = activeRound.id || activeRound._id;
        const targetRoundStatus = activeRound.status;

        console.log(`Target Round: ${targetRoundNum} (ID: ${targetRoundId}, Status: ${targetRoundStatus})`);

        // C. Fetch Live Match Data (Enfrentamientos API)
        console.log('Fetching live match data...');
        const dataResp = await axios.post(`${CONFIG.BASE_URL}/5/ranking/matches`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: { championshipId: CONFIG.CHAMPIONSHIP_ID },
            answer: {}
        }, { headers: { 'Content-Type': 'application/json' }, timeout: 20000 });

        const data = dataResp.data.answer || dataResp.data;
        const allRounds = data.rounds || [];
        const teamsList = data.teams || []; // ORDERED ARRAY for indexing

        console.log(`Teams available: ${teamsList.length}`);

        // E. Find Matches for Target Round
        let targetMatches = [];
        let matchGroup = allRounds.find(group => group.length > 0 && group[0].id && group[0].id.r === targetRoundNum);

        if (!matchGroup) {
            const offsetNum = targetRoundNum > 19 ? targetRoundNum - 19 : targetRoundNum;
            matchGroup = allRounds.find(group => group.length > 0 && group[0].id && group[0].id.r === offsetNum);
            if (matchGroup) console.log(`Found matches via offset logic (r=${offsetNum})`);
        } else {
            console.log(`Found matches via exact match (r=${targetRoundNum})`);
        }

        targetMatches = matchGroup || [];
        console.log(`Found ${targetMatches.length} matches.`);

        // F. Extract Users and Fetch Lineups (Using Array Index Mapping)
        const userTeamIds = [];
        targetMatches.forEach(m => {
            if (m.p) {
                m.p.forEach(pIndex => {
                    // pIndex is 1-based index into data.teams
                    // e.g. pIndex 1 maps to teamsList[0]
                    const teamObj = teamsList[pIndex - 1];
                    if (teamObj && teamObj._id) {
                        userTeamIds.push(teamObj._id);
                    } else {
                        console.warn(`Warning: Could not resolve team at index ${pIndex}`);
                    }
                });
            }
        });

        // Unique IDs
        const uniqueUserTeamIds = [...new Set(userTeamIds)];
        console.log(`Fetching lineups for ${uniqueUserTeamIds.length} teams...`);

        const teamPointsMap = new Map();
        const captainsMap = new Map();

        // Helper to fetch lineup
        const fetchLineup = async (teamId) => {
            try {
                const res = await axios.post(`${CONFIG.BASE_URL}/1/userteam/roundlineup`, {
                    header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
                    query: { championshipId: CONFIG.CHAMPIONSHIP_ID, userteamId: teamId, round: targetRoundId },
                    answer: {}
                });
                const lData = res.data.answer || res.data;
                const list = lData.players?.initial || lData.players || lData.lineup || [];

                // Sum points
                const total = list.reduce((sum, p) => sum + (p.points || 0), 0);
                teamPointsMap.set(teamId, total);

                // Find Captain
                const captain = list.find(p => p.captain || p.cpt);
                const capName = captain ? (captain.name || captain.nick || 'Unknown') : 'None';
                captainsMap.set(teamId, capName);

            } catch (e) {
                teamPointsMap.set(teamId, 0);
                captainsMap.set(teamId, 'Error');
            }
        };

        // Batch execution
        const chunkSize = 5;
        for (let i = 0; i < uniqueUserTeamIds.length; i += chunkSize) {
            const chunk = uniqueUserTeamIds.slice(i, i + chunkSize);
            await Promise.all(chunk.map(fetchLineup));
        }

        // G. Compute Hash
        const sortedIds = Array.from(teamPointsMap.keys()).sort();
        const teamPointsHash = sortedIds.map(tid => `${tid}:${teamPointsMap.get(tid)}`).join('|');
        const captainsHash = sortedIds.map(tid => `${tid}:${captainsMap.get(tid)}`).join('|');
        const masterHash = `${teamPointsHash}#${captainsHash}`;

        console.log(`Master Hash Length: ${masterHash.length}`);

        // H. Notify Logic
        let notify = false;
        let notificationTitle = '';
        let notificationBody = '';

        if (!lastState.round || lastState.round !== targetRoundNum) {
            notify = true;
            notificationTitle = '¡Nueva Jornada!';
            notificationBody = `La Jornada ${targetRoundNum} está en juego.`;
        } else if (lastState.status !== targetRoundStatus) {
            notify = true;
            notificationTitle = 'Estado Actualizado';
            notificationBody = `La Jornada ${targetRoundNum} pasa a: ${targetRoundStatus}.`;
        } else if (lastState.hash && lastState.hash !== masterHash && targetRoundStatus === 'current') {
            notify = true;
            notificationTitle = '🔔 Cambios en Puntos/Capitanes';
            notificationBody = `Actualización en J${targetRoundNum}. Revisa alineaciones.`;
        }

        if (notify) {
            console.log('Change detected! Sending notification...');
            const message = {
                notification: { title: notificationTitle, body: notificationBody },
                topic: 'general'
            };
            await msg.send(message);
            console.log('Notification sent.');

            await docRef.set({
                round: targetRoundNum,
                status: targetRoundStatus,
                hash: masterHash,
                lastUpdate: new Date().toISOString()
            });
        } else {
            console.log('No significant changes.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkUpdates();
