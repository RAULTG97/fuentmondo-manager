
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { NotificationService } from "./notificationService";

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

export const FirebaseService = {
    init: async () => {
        try {
            // Validate config presence
            if (!firebaseConfig.apiKey) {
                console.error("FIREBASE CONFIG MISSING: apiKey is empty. Check your .env file.");
                return;
            }

            const app = initializeApp(firebaseConfig);
            messaging = getMessaging(app);

            // Listener para mensajes en primer plano (Foreground)
            onMessage(messaging, (payload) => {
                console.log('Message received. ', payload);
                const { title, body } = payload.notification || {};

                // Usar nuestro servicio de notificaciones para mostrarlo
                NotificationService.notify(title || 'Fuentmondo', {
                    body: body,
                    tag: 'firebase-msg'
                });
            });

            console.log('Firebase Initialized Successfully');
        } catch (e) {
            console.error('Firebase Init Critical Error:', e);
        }
    },

    requestPermission: async () => {
        if (!messaging) {
            console.error("Firebase Messaging not initialized");
            return null;
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('Notification Permission Status:', permission);

            if (permission === 'granted') {
                const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
                if (!vapidKey) {
                    console.error('ERROR: VITE_FIREBASE_VAPID_KEY is missing in .env!');
                    return null;
                }

                console.log('Getting token with VAPID Key length:', vapidKey.length);

                // Use the existing Service Worker (sw.js) for Firebase
                const registration = await navigator.serviceWorker.ready;
                console.log('Using SW Registration:', registration.scope);

                const token = await getToken(messaging, {
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: registration
                });

                console.log('FCM Token Success:', token);
                return token;
            } else {
                console.warn('Notification permission denied or dismissed.');
            }
        } catch (err) {
            console.error('An error occurred while retrieving token:', err);
            // Common error: "Messaging: A problem occurred while subscribing the user to FCM..."
            if (err.code === 'messaging/permission-blocked') {
                console.error('User blocked notifications.');
            }
        }
        return null;
    }
};
