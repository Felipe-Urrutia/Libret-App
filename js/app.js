// 1. Registro del Service Worker y Permisos
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Apunta al sw.js que está en la raíz
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado con éxito'))
            .catch(err => console.error('Error al registrar el Service Worker', err));
    });

    // Solicitar permiso para las notificaciones en el dispositivo
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// 2. Escuchar cuando la página cargue para mostrar las notas guardadas
document.addEventListener('DOMContentLoaded', mostrarNotas);

// 3. Función para añadir una nueva nota
function agregarNota() {
    const texto = document.getElementById('textoNota').value.trim();
    const urgencia = document.getElementById('urgenciaNota').value;

    if (!texto) {
        alert('Por favor, escribe algo que recordar.');
        return;
    }

    const nuevaNota = {
        id: Date.now(),
        texto: texto,
        urgencia: urgencia
    };

    let notas = JSON.parse(localStorage.getItem('notas')) || [];
    notas.push(nuevaNota);
    
    // Ordenar las notas: las 'alta' van primero en la lista siempre
    notas.sort((a, b) => (a.urgencia === 'alta' ? -1 : 1));

    localStorage.setItem('notas', JSON.stringify(notas));
    
    // Si la nota es urgente, dispara una notificación push nativa
    if (urgencia === 'alta' && Notification.permission === 'granted') {
        new Notification('🚨 RECORDATORIO URGENTE', {
            body: texto,
            icon: 'img/Libret-App.png'
        });
    }

    // Limpiar el campo de texto y refrescar la pantalla
    document.getElementById('textoNota').value = '';
    mostrarNotas();
}

// 4. Función para pintar las notas en el HTML
function mostrarNotas() {
    const lista = document.getElementById('listaNotas');
    lista.innerHTML = '';
    const notas = JSON.parse(localStorage.getItem('notas')) || [];

    if (notas.length === 0) {
        lista.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No tienes pendientes. ¡Estás al día! 🎉</p>';
        return;
    }

    notas.forEach(nota => {
        const div = document.createElement('div');
        div.className = `nota urgencia-${nota.urgencia}`;
        div.innerHTML = `
            <strong>${nota.urgencia.toUpperCase()}:</strong>
            <p style="margin: 5px 0 0 0;">${nota.texto}</p>
            <button class="btn-borrar" onclick="borrarNota(${nota.id})">✓ Listo</button>
        `;
        lista.appendChild(div);
    });
}

// 5. Función para eliminar/marcar como hecha una nota
function borrarNota(id) {
    let notas = JSON.parse(localStorage.getItem('notas')) || [];
    notas = notas.filter(nota => nota.id !== id);
    localStorage.setItem('notas', JSON.stringify(notas));
    mostrarNotas();
}