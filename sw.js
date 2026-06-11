const CACHE_NAME = 'asistente-cache-v6';
const assets = [
    './',
    'index.html',
    'manifest.json',
    './css/estilos.css',
    './js/app.js',
    './img/Libret-App-192.png',
    './img/Libret-App.png'
];

// Almacén temporal de temporizadores activos en segundo plano
const alarmasActivas = {};

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            return cachedResponse || fetch(e.request);
        })
    );
});

// 🔥 OYENTE DE MENSAJES EN SEGUNDO PLANO (El cerebro de las alarmas)
self.addEventListener('message', evento => {
    const data = evento.data;

    if (data.accion === 'PROGRAMAR_ALARMA') {
        const nota = data.nota;

        // Si ya existe una alarma para esta nota, la limpiamos antes de sobreescribir
        if (alarmasActivas[nota.id]) {
            clearTimeout(alarmasActivas[nota.id]);
        }

        const tiempoLimite = new Date(nota.fechaLimite).getTime();
        const tiempoAhora = Date.now();
        const tiempoRestante = tiempoLimite - tiempoAhora;

        // Solo programar si la fecha está en el futuro
        if (tiempoRestante > 0) {
            const timerId = setTimeout(() => {
                dispararNotificacionNativa(nota);
                delete alarmasActivas[nota.id]; // Limpiar registro una vez ejecutado
            }, tiempoRestante);

            // Guardamos la referencia del timer asociado al ID de la nota
            alarmasActivas[nota.id] = timerId;
        }
    }

    if (data.accion === 'CANCELAR_ALARMA') {
        const id = data.id;
        if (alarmasActivas[id]) {
            clearTimeout(alarmasActivas[id]);
            delete alarmasActivas[id];
            console.log(`Alarma ${id} cancelada con éxito.`);
        }
    }
});

// Función interna que gatilla la alerta visual en el dispositivo móvil
function dispararNotificacionNativa(nota) {
    const titulo = nota.urgencia === 'alta' ? '🚨 ASISTENTE: ¡URGENCIA CRÍTICA!' : '⏳ ASISTENTE: Tarea pendiente';
    const opciones = {
        body: nota.texto,
        icon: 'img/Libret-App-192.png',
        badge: 'img/Libret-App-192.png',
        vibrate: [200, 100, 200, 100, 400], // Patrón de vibración para capturar tu atención
        tag: nota.id, // Evita notificaciones duplicadas de la misma tarea
        renotify: true
    };

    self.registration.showNotification(titulo, opciones);
}