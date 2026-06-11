const CACHE_NAME = 'asistente-cache-v4';

const assets = [
    './',
    'index.html',
    'manifest.json',
    './css/estilos.css',
    './js/app.js',
    './img/Libret-App.png',
    './img/Libret-App-192.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            return cachedResponse || fetch(e.request);
        })
    );
});