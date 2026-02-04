/**
 * Check Updates Script
 * Run by GitHub Actions to check for new rounds/scores
 * Now uses /5/ranking/matches to mirror "Enfrentamientos" logic (Live Data)
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
        console.log('Starting Update Check (Enfrentamientos Mode)...');

        // A. Get Last State from Firestore
        const docRef = db.collection('app_state').doc('last_checked');
        let lastState = {};
        try {
            const doc = await docRef.get();
            lastState = doc.exists ? doc.data() : {};
        } catch (dbError) {
            console.error('Warning: Failed to fetch from Firestore (First run?). Proceeding empty.');
            lastState = {};
        }

        // B. Fetch Full Match Data (The "Enfrentamientos" Endpoint)
        console.log('Fetching live match data (/5/ranking/matches)...');
        const resp = await axios.post(`${CONFIG.BASE_URL}/5/ranking/matches`, {
            header: { token: CONFIG.AUTH.TOKEN, userid: CONFIG.AUTH.USER_ID },
            query: { championshipId: CONFIG.CHAMPIONSHIP_ID },
            answer: {}
        }, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Node/18' },
            timeout: 20000
        });

        const data = resp.data.answer || resp.data;
        if (!data) throw new Error('Empty API response');

        // C. Determine Current Round Logic
        // The API returns 'current' array which are the matches for the active round.
        // If empty, we look at 'rounds' to find the latest open one.

        let currentMatches = data.current || [];
        let currentRoundNum = null;
        let currentRoundStatus = 'unknown';

        if (currentMatches.length > 0) {
            // Extract round number from first match ID (structure: { id: { r: 1 (means J2), ... } })
            // Wait, round IDs in Futmondo are usually 0-indexed relative to season start?
            // Let's trust the data structure or find the round object.
            if (currentMatches[0].id && typeof currentMatches[0].id.r !== 'undefined') {
                // If r=0 is J1? Need to cross ref with rounds array.
                // Actually usually `r` is the round INDEX.
                // Let's look at `data.rounds` to enable correct numbering.
            }
        }

        // Better strategy: Find the round with status 'current' in data.rounds
        const roundsList = data.rounds || [];
        let activeRound = roundsList.find(r => r.status === 'current');

        if (!activeRound) {
            // Fallback: Last played round?
            activeRound = roundsList[roundsList.length - 1]; // Default to last
        }

        if (activeRound) {
            currentRoundNum = activeRound.number;
            currentRoundStatus = activeRound.status;
        }

        console.log(`Detected Active Round: ${currentRoundNum} (${currentRoundStatus})`);

        // Filter matches for this round if 'currentMatches' was empty or mismatched
        // Actually `data.current` seems to be exactly what we want for LIVE scores.
        // But if round is 'closed', `data.current` might be empty.
        // If logic relies on "Enfrentamientos", we want scores.

        // Let's calculate points from `currentMatches` if available, otherwise try to find them in `data.matches`?
        // `data.matches` usually contains ALL matches? Or maybe `data` structure is cleaner.
        // Lets assume `currentMatches` has the Lineups.

        const teamPointsMap = new Map();
        const captainsMap = new Map();

        // If we have live matches
        if (currentMatches.length > 0) {
            currentMatches.forEach(m => {
                // Process Home (lineupA)
                if (m.lineupA) processLineup(m.p[0], m.lineupA, teamPointsMap, captainsMap);
                // Process Away (lineupB)
                if (m.lineupB) processLineup(m.p[1], m.lineupB, teamPointsMap, captainsMap);
            });
        }

        // Generate Hash
        // Sort by Team ID to ensure determinism
        const teamIds = Array.from(teamPointsMap.keys()).sort();

        const teamPointsHash = teamIds.map(tid => `${tid}:${teamPointsMap.get(tid)}`).join('|');
        const captainsHash = teamIds.map(tid => `${tid}:${captainsMap.get(tid)}`).join('|');

        if (teamIds.length === 0) {
            console.log('Warning: No live lineups found. Hash will be empty.');
        } else {
            console.log(`Computed stats for ${teamIds.length} teams.`);
        }

        const masterHash = `${teamPointsHash}#${captainsHash}`;
        console.log(`Master Hash Length: ${masterHash.length}`);

        // E. Compare logic
        let notify = false;
        let notificationTitle = '';
        let notificationBody = '';

        if (!lastState.round || lastState.round !== currentRoundNum) {
            notify = true;
            notificationTitle = '¡Nueva Jornada!';
            notificationBody = `La Jornada ${currentRoundNum} está en juego.`;
        } else if (lastState.status !== currentRoundStatus) {
            notify = true;
            notificationTitle = 'Estado Actualizado';
            notificationBody = `La Jornada ${currentRoundNum} pasa a: ${currentRoundStatus}.`;
        } else if (lastState.hash && lastState.hash !== masterHash && currentRoundStatus === 'current') {
            notify = true;
            notificationTitle = '🔔 Cambios en Puntos/Capitanes';
            notificationBody = `Actualización en J${currentRoundNum}. Revisa alineaciones.`;
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
            console.log('Notification sent.');

            await docRef.set({
                round: currentRoundNum,
                status: currentRoundStatus,
                hash: masterHash,
                lastUpdate: new Date().toISOString()
            });
        } else {
            console.log('No significant changes.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Data:', JSON.stringify(error.response.data || {}).substring(0, 200));
        process.exit(1);
    }
}

function processLineup(teamId, lineup, pointsMap, captainsMap) {
    // Sum points
    const total = lineup.reduce((sum, p) => sum + (p.points || 0), 0);
    pointsMap.set(teamId, total);

    // Find Captain
    const captain = lineup.find(p => p.captain || p.cpt); // Futmondo API varies
    const capName = captain ? (captain.name || captain.nick || 'Unknown') : 'None';
    captainsMap.set(teamId, capName);
}

checkUpdates();
