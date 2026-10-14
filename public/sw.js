const CACHE_NAME = 'famschicht-shell-v0.3.13';

self.addEventListener('install', event => {
  const scope = self.registration.scope;
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        scope,
        `${scope}index.html`,
        `${scope}manifest.webmanifest`,
        `${scope}apple-touch-icon.png`,
      ]).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match(`${self.registration.scope}index.html`);
      if (shell) return shell;
    }
    return new Response('FamSchicht ist gerade offline. Bitte später erneut versuchen.', {
      status: 503,
      headers: {'Content-Type': 'text/plain; charset=utf-8'},
    });
  }
}

