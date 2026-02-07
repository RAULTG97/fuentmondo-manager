
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { NotificationService } from "./notificationService";

// Only log in development
const DEBUG = import.meta.env.DEV;
const log = (...args) => DEBUG && console.log('[Firebase]', ...args);
const logError = (...args) => console.error('[Firebase]', ...args); // Errors always show

// Configuración de Firebase (Se rellenará luego)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let messaging = null;
let app = null;

export const FirebaseService = {
    init: async () => {
        try {
            // Validate config presence
            if (!firebaseConfig.apiKey) {
                logError("CONFIG MISSING: apiKey is empty. Check your .env file.");
                return;
            }

            app = initializeApp(firebaseConfig);
            messaging = getMessaging(app);

            // Listener para mensajes en primer plano (Foreground)
            onMessage(messaging, (payload) => {
                log('Message received.', payload);
                const { title, body } = payload.notification || {};

                // Usar nuestro servicio de notificaciones para mostrarlo
                NotificationService.notify(title || 'Fuentmondo', {
                    body: body,
                    tag: 'firebase-msg'
                });
            });

            log('Initialized Successfully');
        } catch (e) {
            logError('Init Critical Error:', e);
        }
    },

    requestPermission: async () => {
        if (!messaging) {
            logError("Messaging not initialized");
            return null;
        }

        try {
            const permission = await Notification.requestPermission();
            log('Notification Permission Status:', permission);

            if (permission === 'granted') {
                const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
                if (!vapidKey) {
                    logError('VITE_FIREBASE_VAPID_KEY is missing in .env!');
                    return null;
                }

                log('Getting token with VAPID Key length:', vapidKey.length);

                // Use the existing Service Worker (sw.js) for Firebase
                const registration = await navigator.serviceWorker.ready;
                log('Using SW Registration:', registration.scope);

                const token = await getToken(messaging, {
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: registration
                });

                log('FCM Token obtained (length):', token?.length);

                // Save token to Firestore
                try {
                    const db = getFirestore(app); // Ensure getFirestore is imported
                    const tokenRef = doc(db, 'fcm_tokens', token);
                    await setDoc(tokenRef, {
                        token: token,
                        updatedAt: new Date().toISOString(),
                        userAgent: navigator.userAgent
                    }, { merge: true });
                    log('Token saved to Firestore');
                } catch (saveError) {
                    logError('Error saving token to Firestore:', saveError);
                }

                return token;
            } else {
                log('Notification permission denied or dismissed.');
            }
        } catch (err) {
            logError('Error retrieving token:', err.message || err);

            // Detailed Logging for Debugging (only in dev)
            if (DEBUG) {
                if (err.message && err.message.includes('unregistered-notification-sender')) {
                    logError('VAPID Key mismatch or invalid sender ID.');
                } else if (err.code === 'messaging/permission-blocked') {
                    logError('User blocked notifications.');
                } else if (err.code === 'messaging/unsupported-browser') {
                    logError('Browser not supported (Are you in Home Screen Mode on iOS?)');
                } else if (err.message && err.message.includes('Missing or insufficient permissions')) {
                    logError('Permissions missing.');
                }
            }

            // Allow caller to see the error
            throw err;
        }
        return null;
    }
};
