const API_URL = 'http://localhost:8080/api';
let token = localStorage.getItem('token');
let usuarioActual = null;
let sistemaActual = null;

function obtenerToken() {
    return localStorage.getItem('token');
}

function guardarToken(newToken) {
    token = newToken;
    localStorage.setItem('token', newToken);
}

function eliminarToken() {
    token = null;
    localStorage.removeItem('token');
}

function obtenerHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + obtenerToken()
    };
}

async function validarSesion(redirigirSiInvalido = true) {
    const currentToken = obtenerToken();
    if (!currentToken) {
        if (redirigirSiInvalido && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
            redirigirALogin();
        }
        return false;
    }
    return true;
}

function redirigirALogin() {
    window.location.href = 'login.html';
}

function redirigirADashboard() {
    window.location.href = 'dashboard.html';
}

function redirigirAIndex() {
    window.location.href = 'dashboard.html';
}

function inicializarTema() {
    const temaGuardado = localStorage.getItem('tema') || 'dark';
    document.documentElement.classList.toggle('dark', temaGuardado === 'dark');
    actualizarIconoTema();
}

function toggleTema() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    const temaActual = html.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('tema', temaActual);
    actualizarIconoTema();
}

function actualizarIconoTema() {
    const esOscuro = document.documentElement.classList.contains('dark');
    const iconos = document.querySelectorAll('#tema-icon, #tema-icon-dashboard, #tema-icon-sistema, #tema-icon-login, #tema-icon-register');
    iconos.forEach(icono => {
        if (icono) icono.textContent = esOscuro ? 'light_mode' : 'dark_mode';
    });

    const favicon = document.getElementById('favicon');
    if (favicon) {
        favicon.href = esOscuro ? 'img/Isotipo modo oscuro.jpeg' : 'img/Isotipo modo claro.jpeg';
    }
}

function togglePasswordVisibility(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    if (input.type === 'password') {
        input.type = 'text';
        toggle.querySelector('span').textContent = 'visibility';
    } else {
        input.type = 'password';
        toggle.querySelector('span').textContent = 'visibility_off';
    }
}

function obtenerAvatarUsuario(usuario) {
    if (usuario && usuario.avatarUrl && usuario.avatarUrl.trim() !== '') {
        return `<img src="${usuario.avatarUrl}" alt="${usuario.nombre || 'Usuario'}" class="w-8 h-8 rounded-full object-cover">`;
    } else {
        const isDark = document.documentElement.classList.contains('dark');
        return `<div class="isotipo-container w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <img src="img/Isotipo modo claro.jpeg" alt="Datium" class="w-6 h-6 object-contain ${isDark ? 'hidden' : ''}"/>
            <img src="img/Isotipo modo oscuro.jpeg" alt="Datium" class="w-6 h-6 object-contain ${isDark ? '' : 'hidden'}"/>
        </div>`;
    }
}

function cerrarSesion() {
    eliminarToken();
    redirigirALogin();
}

function showLoadingScreen() {
    const loadingHTML = `
        <div class="loading-overlay active" id="loading-overlay">
            <div class="loading-content">
                <img src="img/Datium logo modo claro.jpeg" alt="Datium" class="loading-logo block dark:hidden" />
                <img src="img/Datium logo modo oscuro.jpeg" alt="Datium" class="loading-logo hidden dark:block" />
                <div id="loading-spinner-container">
                    <div class="loading-spinner" id="loading-spinner"></div>
                    <div class="checkmark" id="checkmark"></div>
                </div>
                <p class="loading-text" id="loading-text">Iniciando sesión...</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

function showLoadingSuccess() {
    const spinner = document.getElementById('loading-spinner');
    const checkmark = document.getElementById('checkmark');
    const loadingText = document.getElementById('loading-text');

    if (spinner) spinner.style.display = 'none';
    if (checkmark) checkmark.classList.add('show');
    if (loadingText) {
        loadingText.textContent = '¡Bienvenido!';
        loadingText.classList.add('success-text');
    }
}

function hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}

async function login() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    if (!emailInput || !passwordInput) {
        console.error('Campos de login no encontrados');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    showLoadingScreen();

    try {
        const response = await fetch(API_URL + '/autenticacion/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            hideLoadingScreen();
            alert('Error: El servidor no respondió correctamente. Verifica que esté corriendo en http://localhost:8080');
            console.error('Error parseando respuesta:', e);
            return;
        }

        if (response.ok && data.token) {
            guardarToken(data.token);
            if (data.usuario) {
                usuarioActual = data.usuario;
            }
            showLoadingSuccess();
            setTimeout(() => {
                redirigirAIndex();
            }, 1500);
        } else {
            hideLoadingScreen();
            alert('Error: ' + (data.error || 'Credenciales inválidas'));
        }
    } catch (error) {
        hideLoadingScreen();
        console.error('Error en login:', error);
        alert('Error de conexión. Por favor intenta nuevamente.');
    }
}

async function registro() {
    const nombre = document.getElementById('registro-nombre').value.trim();
    const email = document.getElementById('registro-email').value.trim();
    const password = document.getElementById('registro-password').value;
    const planId = (typeof window !== 'undefined' && window.planSeleccionado) ? window.planSeleccionado : 1;

    if (!nombre || !email || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    if (!email.includes('@')) {
        alert('Por favor ingresa un email válido');
        return;
    }

    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    showLoadingScreen();
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Creando tu cuenta...';

    try {
        const response = await fetch(API_URL + '/autenticacion/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, planId })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            showLoadingSuccess();
            const successText = document.getElementById('loading-text');
            if (successText) successText.textContent = '¡Cuenta creada exitosamente!';
            setTimeout(() => {
                redirigirADashboard();
            }, 1500);
        } else {
            hideLoadingScreen();
            alert('Error: ' + (data.error || 'No se pudo crear la cuenta'));
        }
    } catch (error) {
        hideLoadingScreen();
        console.error('Error en registro:', error);
        alert('Error de conexión. Por favor intenta nuevamente.');
    }
}

async function recuperarPassword() {
    const email = document.getElementById('login-email').value;
    if (!email) {
        alert('Por favor ingresa tu email primero');
        return;
    }
    try {
        const response = await fetch(API_URL + '/autenticacion/recuperar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        alert(data.mensaje || 'Si el email existe, se enviará un enlace de recuperación');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    inicializarTema();

    if (path.includes('login.html') || path.includes('register.html')) {
        // Auto-redirect removed per user request
        // validarSesion(false).then(isValid => { ... }); 
    }
});

