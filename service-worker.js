const CACHE_NAME = 'tote-ibc-barcode-v3';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only ever intercept simple GETs for caching purposes. Anything else -
  // in particular the POST to the Claude API for precise re-recognition -
  // must pass straight through untouched: don't call respondWith, so the
  // browser handles it natively (correct CORS handling, real error
  // messages surfaced to the page instead of being masked by a failed
  // cache lookup, and no attempt to Cache.put() a POST response, which
  // throws).
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // App shell: cache-first (instant load, works offline)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Third-party CDN libs (ZXing/Tesseract/JsBarcode/QRCode): network-first,
  // fall back to cache so the app still opens once libs were loaded before.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
