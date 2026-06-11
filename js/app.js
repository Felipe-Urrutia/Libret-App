// Registro de la PWA y sincronización con el Service Worker
let serviceWorkerReg = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker Pro activo');
                serviceWorkerReg = reg;
                // Sincronizar alarmas existentes al arrancar
                sincronizarAlarmasConSW();
            })
            .catch(err => console.error('Error en SW', err));
    });

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    mostrarNotas();
    setInterval(mostrarNotas, 60000); // Actualiza la vista cada minuto
});

function agregarNota() {
    const texto = document.getElementById('textoNota').value.trim();
    const urgencia = document.getElementById('urgenciaNota').value;
    const fechaLimite = document.getElementById('fechaNota').value;

    if (!texto) {
        alert('Por favor, escribe el recordatorio.');
        return;
    }

    const nuevaNota = {
        id: Date.now(),
        texto: texto,
        urgencia: urgencia,
        fechaLimite: fechaLimite || null
    };

    let notas = JSON.parse(localStorage.getItem('notas')) || [];
    notas.push(nuevaNota);

    reordenarNotas(notas);

    // 🔥 PROGRAMAR ALARMA EN SEGUNDO PLANO
    if (nuevaNota.fechaLimite && Notification.permission === 'granted') {
        programarAlarmaEnSW(nuevaNota);
    } else if (urgencia === 'alta' && Notification.permission === 'granted') {
        // Si es urgente pero no tiene fecha, avisa inmediatamente
        new Notification('🚨 PRIORIDAD ALTA REGISTRADA', {
            body: texto,
            icon: 'img/Libret-App.png'
        });
    }

    document.getElementById('textoNota').value = '';
    document.getElementById('fechaNota').value = '';
    mostrarNotas();
}

function reordenarNotas(notas) {
    notas.sort((a, b) => {
        if (a.urgencia === 'alta' && b.urgencia !== 'alta') return -1;
        if (a.urgencia !== 'alta' && b.urgencia === 'alta') return 1;
        if (a.fechaLimite && b.fechaLimite) {
            return new Date(a.fechaLimite) - new Date(b.fechaLimite);
        }
        return b.id - a.id;
    });
    localStorage.setItem('notas', JSON.stringify(notas));
}

// Envía la nota al Service Worker para que gestione el temporizador de fondo
function programarAlarmaEnSW(nota) {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            accion: 'PROGRAMAR_ALARMA',
            nota: nota
        });
    }
}

// Avisa al SW de las alarmas actuales por si el navegador se reinició
function sincronizarAlarmasConSW() {
    const notas = JSON.parse(localStorage.getItem('notas')) || [];
    notas.forEach(nota => {
        if (nota.fechaLimite) programarAlarmaEnSW(nota);
    });
}

function calcularTiempoRestante(fechaISO) {
    if (!fechaISO) return { texto: 'Sin fecha límite', vencido: false };

    const ahora = new Date();
    const limite = new Date(fechaISO);
    const diferenciaSms = limite - ahora;

    if (diferenciaSms < 0) {
        return { texto: '⏳ ¡Tiempo agotado / Vencido!', vencido: true };
    }

    const minutosTotales = Math.floor(diferenciaSms / 60000);
    const horasTotales = Math.floor(minutosTotales / 60000);
    const dias = Math.floor(horasTotales / 24);
    const horas = horasTotales % 24;

    if (dias > 0) {
        return { texto: `Quedan ${dias}d y ${horas}h`, vencido: false };
    } else if (horasTotales > 0) {
        return { texto: `Quedan ${horas} horas`, vencido: false };
    } else {
        return { texto: `¡Quedan solo ${minutosTotales} minutos!`, vencido: false };
    }
}

function mostrarNotas() {
    const lista = document.getElementById('listaNotas');
    const buscarTexto = document.getElementById('buscarInput').value.toLowerCase();
    const filtroUrgencia = document.getElementById('filtroUrgencia').value;

    lista.innerHTML = '';
    const notas = JSON.parse(localStorage.getItem('notas')) || [];

    const notasFiltradas = notas.filter(nota => {
        const coincideBusqueda = nota.texto.toLowerCase().includes(buscarTexto);
        const coincideUrgencia = filtroUrgencia === 'todas' || nota.urgencia === filtroUrgencia;
        return coincideBusqueda && coincideUrgencia;
    });

    if (notasFiltradas.length === 0) {
        lista.innerHTML = '<p style="text-align:center; color: var(--text-muted); margin-top:20px;">No se encontraron apuntes. ¡Todo limpio! 📋</p>';
        return;
    }

    notasFiltradas.forEach(nota => {
        const infoTiempo = calcularTiempoRestante(nota.fechaLimite);
        const claseTiempo = infoTiempo.vencido ? 'tiempo-vencido' : '';

        let fechaFormateada = '';
        if (nota.fechaLimite) {
            const f = new Date(nota.fechaLimite);
            fechaFormateada = ` | Límite: ${f.toLocaleDateString()} ${f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        const div = document.createElement('div');
        div.className = `nota ${nota.urgencia}`;
        div.innerHTML = `
            <p class="nota-texto">${nota.texto}</p>
            <div class="nota-meta">
                <span>${nota.urgencia === 'alta' ? '🚨 Alta' : nota.urgencia === 'media' ? '⏳ Media' : '☕ Baja'}</span>
                <span>${fechaFormateada}</span>
                <span class="${claseTiempo}" style="margin-left: auto;">${infoTiempo.texto}</span>
            </div>
            <button class="btn-borrar" onclick="borrarNota(${nota.id})">✓</button>
        `;
        lista.appendChild(div);
    });
}

function borrarNota(id) {
    let notas = JSON.parse(localStorage.getItem('notas')) || [];
    notas = notas.filter(nota => nota.id !== id);
    localStorage.setItem('notas', JSON.stringify(notas));

    // Cancelar la alarma en el Service Worker para que no suene una tarea ya hecha
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            accion: 'CANCELAR_ALARMA',
            id: id
        });
    }

    mostrarNotas();
}