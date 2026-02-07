
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
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '/fuentmondo-manager/logo.jpeg'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (e) {
    console.error("Firebase Messaging SW Initialization Failed", e);
}
