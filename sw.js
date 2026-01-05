const CACHE_NAME = 'obreiros-icm-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap'
];

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Se for navegação (abrir o app)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Estratégia: Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se falhar a rede e não tiver cache, tenta o index para evitar tela branca
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});