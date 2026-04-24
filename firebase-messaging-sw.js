
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging-compat.js');
var firebaseConfig = {
    "apiKey": "AIzaSyCLkO_uE7KmGUjJO_eBZGF3Uij7n0J0CVI",
    "authDomain": "fuentmondo.firebaseapp.com",
    "projectId": "fuentmondo",
    "storageBucket": "fuentmondo.firebasestorage.app",
    "messagingSenderId": "537395973791",
    "appId": "1:537395973791:web:81e9a41b5346dccb8fdcaa"
};

try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        // Manual showNotification removed to avoid duplicates. 
        // When a message contains a 'notification' object, FCM automatically handles 
        // showing the notification in the background.
    });

    self.addEventListener('notificationclick', (event) => {
        event.notification.close();

        const urlToOpen = new URL('/fuentmondo-manager/', self.location.origin).href;

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((windowClients) => {
                    // Check if there is already a window open with this URL
                    for (let i = 0; i < windowClients.length; i++) {
                        const client = windowClients[i];
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // If no existing window, open a new one
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    });
} catch (e) {
    console.error("Firebase Messaging SW Initialization Failed", e);
}
