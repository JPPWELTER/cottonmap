/* CottonMap — service worker: cache-first app shell para uso offline no campo.
   A biblioteca de exportação .xlsx vem de um CDN (pra não pesar o pacote do
   app) mas fica pré-cacheada aqui na instalação, então a exportação também
   funciona offline depois que o app é aberto uma primeira vez com internet. */
const CACHE_NAME = 'cottonmap-v2';
const XLSX_CDN = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(ASSETS);
        // não deixa uma falha ao buscar o CDN quebrar a instalação inteira
        try { await cache.add(XLSX_CDN); } catch (e) { console.warn('xlsx CDN não pré-cacheado agora', e); }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return cached;
        });
      return cached || networkFetch;
    })
  );
});
