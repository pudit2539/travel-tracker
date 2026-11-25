// public/sw.js
const CACHE_NAME = 'travel-tracker-cache-v5';
const IMAGE_CACHE_NAME = 'travel-tracker-images-v5';
const MAX_IMAGE_CACHE_ITEMS = 80;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png',
  '/app-logo.png',
];

const PLACE_IMAGE_HOSTS = [
  'lh3.googleusercontent.com',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'images.unsplash.com',
];

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const excess = keys.slice(0, keys.length - maxItems);
      await Promise.all(excess.map((req) => cache.delete(req)));
    }
  } catch {
    // ignore cache trim errors
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy with query-insensitive subway fallback & place image caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 1. Place photo API (single thumbnail) & external place image hosts: Stale-While-Revalidate for offline subway viewing
  const isPlacePhotoApi =
    url.pathname === '/api/place-photo' && url.searchParams.get('candidates') !== '1';
  const isExternalPlaceImage = PLACE_IMAGE_HOSTS.some((host) => url.hostname.includes(host));

  if (isPlacePhotoApi || isExternalPlaceImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
              trimCache(IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_ITEMS);
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // Skip other third-party APIs (Supabase auth/DB, Google Maps tiles, AI APIs, Weather)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('frankfurter.dev') ||
    url.hostname.includes('er-api.com')
  ) {
    return;
  }

  // 2. App shell, pages & static assets: Network-first with query-agnostic `/trips/[id]` fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const isCacheable =
            url.pathname.startsWith('/_next/static/') ||
            url.pathname.startsWith('/icons/') ||
            url.pathname.endsWith('.ico') ||
            url.pathname.endsWith('.json') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            event.request.mode === 'navigate';

          if (isCacheable) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
              // Also store clean pathname key for navigation so ?view=readonly or ?invite=... works offline in subway tunnels
              if (event.request.mode === 'navigate' && url.search) {
                cache.put(new Request(url.origin + url.pathname), response.clone());
              }
            });
          }
        }
        return response;
      })
      .catch(async () => {
        // 1. Try exact match from offline cache
        const exactCached = await caches.match(event.request);
        if (exactCached) return exactCached;

        // 2. Try query-insensitive match (e.g., /trips/[id]?view=readonly or ?_rsc=...)
        const cleanPathCached =
          (await caches.match(url.origin + url.pathname)) ||
          (await caches.match(event.request, { ignoreSearch: true }));
        if (cleanPathCached) return cleanPathCached;

        // 3. If navigating to a trip page while in a subway tunnel, match any cached /trips/ shell before falling back to /
        if (event.request.mode === 'navigate') {
          if (url.pathname.startsWith('/trips/')) {
            const cache = await caches.open(CACHE_NAME);
            const keys = await cache.keys();
            const tripShellReq = keys.find((req) => {
              try {
                return new URL(req.url).pathname.startsWith('/trips/');
              } catch {
                return false;
              }
            });
            if (tripShellReq) {
              const tripShellRes = await cache.match(tripShellReq);
              if (tripShellRes) return tripShellRes;
            }
          }
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }

        return new Response('Offline - No connection available', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
