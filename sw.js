const CACHE_NAME = 'masa-calisthenics-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './vendor/chart.umd.min.js',
  './vendor/tf.min.js',
  './vendor/pose-detection.min.js',
  './vendor/fonts/heebo.css',
  './vendor/fonts/NGS6v5_NC0k9P9H0TbFhsqMA6aw.woff2',
  './vendor/fonts/NGS6v5_NC0k9P9GKTbFhsqMA6aw.woff2',
  './vendor/fonts/NGS6v5_NC0k9P9GYTbFhsqMA6aw.woff2',
  './vendor/fonts/NGS6v5_NC0k9P9H4TbFhsqMA6aw.woff2',
  './vendor/fonts/NGS6v5_NC0k9P9H2TbFhsqMA.woff2',
  './icons/icon-16.png',
  './icons/icon-32.png',
  './icons/icon-120.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// YouTube embeds and the OpenFoodFacts API genuinely need the network — only
// the local app shell is served from cache, everything else passes through.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
