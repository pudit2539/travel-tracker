// public/sw.js
const CACHE_NAME = 'travel-tracker-cache-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy with cache fallback for offline mode
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, chrome extensions, and third-party APIs (Supabase, Google Maps, Open-Meteo)
  if (
    event.request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('open-meteo.com')
  ) {
    return;
  }

  // Network first: try network, if offline fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful static assets
        if (
          response &&
          response.status === 200 &&
          (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.json'))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
