/**
 * Check Updates Script
 * Run by GitHub Actions to check for new rounds/scores
 */
const admin = require('firebase-admin');
const axios = require('axios');

// 1. Initialize Firebase Admin
// Expects FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
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
const CONFIG = {
    CHAMPIONSHIP_ID: process.env.VITE_CHAMPIONSHIP_ID || '6064d4fd8a7251711287661b', // Default or from env
    FUTMONDO_API_KEY: process.env.VITE_API_KEY, // From project env
    FUTMONDO_BASE_URL: 'https://api.futmondo.com/external/kong'
};

async function checkUpdates() {
    try {
        console.log('Starting update check...');

        // A. Get Last State from Firestore
        const docRef = db.collection('app_state').doc('last_checked');
        const doc = await docRef.get();
        const lastState = doc.exists ? doc.data() : {};

        // B. Fetch Current Data (Example: Rounds)
        // We need to fetch the rounds to see if a new one is active or has points
        const response = await axios.get(`${CONFIG.FUTMONDO_BASE_URL}/championship/${CONFIG.CHAMPIONSHIP_ID}/rounds`, {
            params: { apiKey: CONFIG.FUTMONDO_API_KEY }
        });

        const rounds = response.data;
        if (!rounds || !Array.isArray(rounds)) {
            throw new Error('Invalid API response');
        }

        const currentRound = rounds.find(r => r.status === 'current') || rounds[rounds.length - 1];

        // C. Compare
        let notify = false;
        let notificationTitle = '';
        let notificationBody = '';

        if (!lastState.round || lastState.round !== currentRound.number) {
            // New Round Started
            notify = true;
            notificationTitle = '¡Nueva Jornada!';
            notificationBody = `La Jornada ${currentRound.number} está en juego.`;
        } else if (lastState.status !== currentRound.status) {
            // Status Changed (e.g. from current to finalized)
            notify = true;
            notificationTitle = 'Jornada Actualizada';
            notificationBody = `La Jornada ${currentRound.number} ha cambiado a ${currentRound.status}.`;
        }

        // We can add more logic here (e.g. check standard points sum to see if they changed)

        if (notify) {
            console.log('Change detected! Sending notification...');

            // D. Send Notification
            const message = {
                notification: {
                    title: notificationTitle,
                    body: notificationBody
                },
                topic: 'general'
            };

            await msg.send(message);
            console.log('Notification sent:', message);

            // E. Update State
            await docRef.set({
                round: currentRound.number,
                status: currentRound.status,
                lastUpdate: new Date().toISOString()
            });
        } else {
            console.log('No significant changes.');
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUpdates();
