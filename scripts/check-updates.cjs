/**
 * Check Updates Script
 * Run by GitHub Actions to check for new rounds/scores
 * HYBRID STRATEGY V4: 
 * 1. Get Metadata (RoundId/Num) from /1/userteam/rounds
 * 2. Get Matches/Teams from /5/ranking/matches (ALL GROUPS)
 * 3. Map integer IDs to ObjectIds via ARRAY INDEX (pId - 1)
 * 4. Fetch details (Lineup/Captain) via /1/userteam/roundlineup
 * 5. Subscribe all FCM tokens to 'general' topic before sending
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
        console.log('Starting Update Check (Hybrid V4 with Topic Subscription)...');

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

        // E. Find Matches for Target Round (ALL GROUPS)
        // Groups are arrays of matches. We want ALL matches that belong to targetRoundNum across ALL groups.
        let targetMatches = [];

        // Iterate every group
        allRounds.forEach((group, index) => {
            if (!Array.isArray(group) || group.length === 0) return;

            // Check if this group belongs to the target round
            // Usually all matches in a group belong to the same round.
            const firstMatch = group[0];
            const rNum = firstMatch.id ? firstMatch.id.r : null;

            let isTarget = false;
            if (rNum === targetRoundNum) {
                isTarget = true;
            } else if (targetRoundNum > 19 && rNum === (targetRoundNum - 19)) {
                // Verify offset logic (e.g. Round 20 -> r=1)
                isTarget = true;
                //  console.log(`Found match group for J${targetRoundNum} via offset (r=${rNum}) at index ${index}`);
            }

            if (isTarget) {
                targetMatches = targetMatches.concat(group);
            }
        });

        console.log(`Found ${targetMatches.length} matches across all groups.`);

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
                        // console.warn(`Warning: Could not resolve team at index ${pIndex}`);
                    }
                });
            }
        });

        // Unique IDs
        const uniqueUserTeamIds = [...new Set(userTeamIds)];
        console.log(`Fetching lineups for ${uniqueUserTeamIds.length} unique teams...`);

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

        // --- SUBSCRIBE TOKENS TO TOPIC ---
        try {
            const tokensSnapshot = await db.collection('fcm_tokens').get();
            const tokens = [];
            tokensSnapshot.forEach(doc => {
                if (doc.data().token) tokens.push(doc.data().token);
            });

            if (tokens.length > 0) {
                console.log(`Subscribing ${tokens.length} tokens to 'general'...`);
                // Subscribe in batches of 1000 (Firebase limit)
                const topicName = 'general';
                for (let i = 0; i < tokens.length; i += 1000) {
                    const batch = tokens.slice(i, i + 1000);
                    const response = await msg.subscribeToTopic(batch, topicName);
                    console.log(`Subscribed batch ${i / 1000 + 1}: Success ${response.successCount}, Fail ${response.failureCount}`);
                }
            } else {
                console.log('No tokens found in fcm_tokens collection to subscribe.');
            }
        } catch (subError) {
            console.error('Error subscribing tokens to topic:', subError);
            // Don't crash main logic
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
            // Update timestamp anyway to show it ran? No, keeps history clean.
            // But we might want to update hash if it changed but no notify (e.g. not current)
            if (lastState.hash !== masterHash) {
                await docRef.set({
                    round: targetRoundNum,
                    status: targetRoundStatus,
                    hash: masterHash,
                    lastUpdate: new Date().toISOString()
                }, { merge: true });
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkUpdates();
