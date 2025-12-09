function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function checkAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const response = await fetch(API_URL + endpoint, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
        return;
    }

    return response;
}

function injectLoadingHTML() {
    if (document.getElementById('loading-overlay')) return;

    const loadingHTML = `
        <div class="loading-overlay" id="loading-overlay">
            <div class="loading-content">
                <img src="img/Datium logo modo claro.jpeg" alt="Datium" class="loading-logo block dark:hidden" />
                <img src="img/Datium logo modo oscuro.jpeg" alt="Datium" class="loading-logo hidden dark:block" />
                <div id="loading-spinner-container">
                    <div class="loading-spinner" id="loading-spinner"></div>
                    <div class="checkmark" id="checkmark"></div>
                    <div class="cross" id="cross"></div>
                </div>
                <p class="loading-text" id="loading-text">Cargando...</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

function showLoading(message = 'Cargando...') {
    injectLoadingHTML();
    const overlay = document.getElementById('loading-overlay');
    const spinner = document.getElementById('loading-spinner');
    const checkmark = document.getElementById('checkmark');
    const cross = document.getElementById('cross');
    const text = document.getElementById('loading-text');

    if (!overlay) return;

    spinner.style.display = 'block';
    spinner.className = 'loading-spinner';
    checkmark.classList.remove('show');
    cross.classList.remove('show');

    text.textContent = message;
    text.className = 'loading-text';

    overlay.classList.add('active');
}

function showSuccess(message = '¡Éxito!', callback = null) {
    const spinner = document.getElementById('loading-spinner');
    const checkmark = document.getElementById('checkmark');
    const text = document.getElementById('loading-text');

    if (spinner) spinner.style.display = 'none';
    if (checkmark) checkmark.classList.add('show');

    if (text) {
        text.innerText = message;
        text.classList.add('success-text');
    }

    setTimeout(() => {
        hideLoading();
        if (callback) callback();
    }, 1500);
}

function showError(message = 'Ha ocurrido un error') {
    const spinner = document.getElementById('loading-spinner');
    const cross = document.getElementById('cross');
    const text = document.getElementById('loading-text');

    if (spinner) spinner.style.display = 'none';
    if (cross) cross.classList.add('show');

    if (text) {
        text.innerText = message;
        text.classList.add('error-text');
    }

    setTimeout(() => {
        hideLoading();
    }, 2000);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function showConfirm(message, onConfirm) {
    // Remove existing if any
    const existing = document.getElementById('confirm-modal');
    if (existing) existing.remove();

    const html = `
        <div id="confirm-modal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300">
            <div class="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-2xl max-w-sm w-full transform scale-95 transition-transform duration-300">
                <div class="flex flex-col gap-4 text-center">
                    <div class="mx-auto p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                        <span class="material-symbols-outlined text-3xl">help</span>
                    </div>
                    <h3 class="text-lg font-bold text-[#111418] dark:text-white">¿Estás seguro?</h3>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">${message}</p>
                    <div class="flex gap-3 justify-center mt-2">
                        <button id="confirm-cancel" class="px-5 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm transition-colors">Cancelar</button>
                        <button id="confirm-ok" class="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 text-sm transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('confirm-modal');

    // Trigger animation
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    });

    document.getElementById('confirm-cancel').onclick = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('confirm-ok').onclick = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.remove();
            if (onConfirm) onConfirm();
        }, 300);
    };
}

function promptPassword(onSuccess) {
    // Remove existing if any
    const existing = document.getElementById('password-prompt-modal');
    if (existing) existing.remove();

    const html = `
        <div id="password-prompt-modal" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300">
            <div class="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-2xl max-w-sm w-full transform scale-95 transition-transform duration-300">
                <div class="flex flex-col gap-4 text-center">
                    <div class="mx-auto p-3 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500">
                        <span class="material-symbols-outlined text-3xl">lock</span>
                    </div>
                    <h3 class="text-lg font-bold text-[#111418] dark:text-white">Verificación Requerida</h3>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">Por seguridad, ingresa tu contraseña para continuar.</p>
                    
                    <div class="mt-2 text-left">
                        <input type="password" id="prompt-password-input" placeholder="Tu contraseña"
                            class="w-full px-4 py-3 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-[#111418] dark:text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                        <p id="prompt-error" class="text-xs text-red-500 mt-2 hidden"></p>
                    </div>

                    <div class="flex gap-3 justify-center mt-2">
                        <button id="prompt-cancel" class="px-5 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-sm transition-colors">Cancelar</button>
                        <button id="prompt-confirm" class="px-5 py-2 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 text-sm transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('password-prompt-modal');
    const input = document.getElementById('prompt-password-input');
    const errorMsg = document.getElementById('prompt-error');
    const confirmBtn = document.getElementById('prompt-confirm');

    // Trigger animation
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
        input.focus();
    });

    const close = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('prompt-cancel').onclick = close;

    const verify = async () => {
        const password = input.value;
        if (!password) {
            errorMsg.innerText = "Ingresa tu contraseña";
            errorMsg.classList.remove('hidden');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerText = "Verificando...";
        errorMsg.classList.add('hidden');

        try {
            const res = await apiFetch('/user/verify-password', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                close();
                if (onSuccess) onSuccess();
            } else {
                const data = await res.json();
                errorMsg.innerText = data.error || "Contraseña incorrecta";
                errorMsg.classList.remove('hidden');
                confirmBtn.disabled = false;
                confirmBtn.innerText = "Confirmar";
            }
        } catch (e) {
            errorMsg.innerText = "Error de conexión";
            errorMsg.classList.remove('hidden');
            confirmBtn.disabled = false;
            confirmBtn.innerText = "Confirmar";
        }
    };

    confirmBtn.onclick = verify;
    input.onkeyup = (e) => {
        if (e.key === 'Enter') verify();
    };
}

document.addEventListener('DOMContentLoaded', () => {
    injectLoadingHTML();
});
