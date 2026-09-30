// Always fetch the current GitHub Pages document; keep no stale offline copy.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(new Request(event.request, {cache: 'no-store'})));
  }
});
