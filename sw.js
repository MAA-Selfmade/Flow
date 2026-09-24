// Minimal service worker: gør Flow installérbar. Ingen offline-cache af data (Firestore har sin egen).
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
