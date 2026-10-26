/* IronLog service worker (optional) — makes the app load with no internet.
   Put this file in the SAME folder as workout-tracker.html on your web host. */
const CACHE = 'ironlog-v1';
const ASSETS = [
  './',
  './index.html',
  './workout-tracker.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap'
];

async function cacheOne(cache, url) {
  try {
    const res = await fetch(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' });
    if (res.ok) await cache.put(url, res);
  } catch (e) {
    try { const res = await fetch(url, { mode: 'no-cors' }); await cache.put(url, res); } catch (e2) { /* skip */ }
  }
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(ASSETS.map(u => cacheOne(cache, u)))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Your own page: network first (get updates), fall back to cache offline.
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(async () => {
        const tries = [req, './workout-tracker.html', './index.html', './'];
        for (const t of tries) {
          const hit = await caches.match(t, { ignoreSearch: true });
          if (hit) return hit;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // CDN libraries & fonts: cache first.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
