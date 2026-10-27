/* ZanFin service worker — app shell cache + graceful update.
   Build n Code by zandev.id */
const VERSION = 'zanfin-v3.6.1';
const SHELL = [
  './',
  './index.html',
  './og-image.png',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-icon.png',
  './logo/fintax_logo.svg',
  './logo/fintax_logo_wide.svg',
  './logo/fintax_favicon.svg',
  './vendor/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', net.clone());
        return net;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const net = await fetch(req);
      if (net.ok && (url.pathname.includes('/icons/') || url.pathname.includes('/vendor/') || url.pathname.endsWith('.webmanifest'))) {
        const c = await caches.open(VERSION);
        c.put(req, net.clone());
      }
      return net;
    } catch (err) {
      return hit || Response.error();
    }
  })());
});
