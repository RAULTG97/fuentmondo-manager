const admin = require('firebase-admin');

// Service Account from Env
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('ERROR: FIREBASE_SERVICE_ACCOUNT env var missing');
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

async function sendTest() {
    console.log('--- MANUAL TEST NOTIFICATION ---');

    // 1. Get Tokens
    const snapshot = await db.collection('fcm_tokens').get();
    if (snapshot.empty) {
        console.log('No tokens found in fcm_tokens collection.');
        return;
    }

    const tokens = snapshot.docs.map(doc => doc.id);
    console.log(`Found ${tokens.length} tokens.`);

    // 2. Send Message
    const payload = {
        tokens: tokens, // Multicast to all registered devices
        notification: {
            title: 'Test Manual Futmondo',
            body: 'Verificación del sistema de notificaciones.',
        },
        data: {
            url: 'https://raultg97.github.io/fuentmondo-manager/'
        }
    };

    try {
        const response = await messaging.sendEachForMulticast(payload);
        console.log(`Success: ${response.successCount}, Failure: ${response.failureCount}`);

        if (response.failureCount > 0) {
            const cleanupPromises = [];
            response.responses.forEach((resp, idx) => {
                const token = tokens[idx];
                if (!resp.success) {
                    const error = resp.error;
                    console.error(`Error sending to ${token}:`, error.code);

                    if (error.code === 'messaging/registration-token-not-registered' ||
                        error.code === 'messaging/invalid-argument') {
                        console.log(`🗑️ Deleting invalid token: ${token}`);
                        // Delete the document where ID is the token (since we used token as doc ID in previous steps? Wait, let's check saving logic)
                        // Actually, let's query by field 'token' just to be safe, or assume doc ID is token if we set it that way.
                        // In client: await setDoc(doc(db, "fcm_tokens", token), ... ) -> YES, Doc ID is the token.
                        const deleteOp = db.collection('fcm_tokens').doc(token).delete();
                        cleanupPromises.push(deleteOp);
                    }
                }
            });

            if (cleanupPromises.length > 0) {
                await Promise.all(cleanupPromises);
                console.log(`✨ Cleaned up ${cleanupPromises.length} invalid tokens.`);
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

sendTest().catch(console.error);
