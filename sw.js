const CACHE_NAME = 'asistente-cache-v3';

// Lista de archivos que se guardarán para uso Offline
const assets = [
  './',
  'index.html',
  'manifest.json',
  './css/estilos.css',
  './js/app.js',
  './img/Libret-App.png'
];

// Evento de instalación del Service Worker
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Evento Fetch para servir los archivos desde el caché si no hay internet
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      return cachedResponse || fetch(e.request);
    })
  );
});