// Import Firebase Messaging logic (merged worker)
try {
    importScripts('./firebase-messaging-sw.js');
} catch (e) {
    console.error("Failed to import firebase-messaging-sw.js into sw.js", e);
}

const CACHE_NAME = 'fuentmondo-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.ico',
    './icon-192.png',
    './icon-512.png',
    './logo.jpeg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Ignore Firestore/Firebase requests (let them go to network directly)
    if (e.request.url.includes('firestore.googleapis.com') ||
        e.request.url.includes('googleapis.com') ||
        e.request.method !== 'GET') {
        return;
    }

    // Dynamic caching strategy
    e.respondWith(
        caches.match(e.request).then((res) => {
            if (res) return res;
            return fetch(e.request).then((response) => {
                // Return original response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
                return response;
            });
        })
    );
});
