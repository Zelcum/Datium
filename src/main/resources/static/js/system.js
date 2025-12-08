checkAuth();
const urlParams = new URLSearchParams(window.location.search);
const systemId = urlParams.get('id');
let systemTables = [];

async function init() {
    await loadSystemDetails();
    await loadTables();
    loadSidebarInfo();
}

async function loadSystemDetails() {
    const res = await apiFetch(`/systems/${systemId}`);
    if (res.ok) {
        const system = await res.json();
        document.getElementById('systemName').innerText = system.name;
        document.getElementById('systemDesc').innerText = system.description || 'Sin descripción';
        document.title = `${system.name} - Datium`;
    }
}

async function loadTables() {
    const res = await apiFetch(`/systems/${systemId}/tables`);
    if (res.ok) {
        systemTables = await res.json();
        const container = document.getElementById('tablesList');
        if (systemTables.length === 0) {
            container.className = 'col-span-1 md:col-span-2 lg:col-span-3 text-center py-12';
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center text-gray-400">
                    <span class="material-symbols-outlined text-6xl mb-2 opacity-20">table_off</span>
                    <p class="text-sm">No hay tablas en este sistema</p>
                </div>
             `;
            return;
        }

        container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        container.innerHTML = systemTables.map(table => `
            <div class="bg-white dark:bg-[#151f2b] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-shadow group relative">
                <div class="flex justify-between items-start mb-3">
                    <div class="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                        <span class="material-symbols-outlined text-2xl">table_rows</span>
                    </div>
                    <div class="flex gap-1">
                        <a href="table_form.html?systemId=${systemId}&tableId=${table.id}" 
                            class="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Editar Tabla">
                            <span class="material-symbols-outlined text-lg">edit</span>
                        </a>
                         <button onclick="deleteTable(${table.id}); event.stopPropagation();" 
                            class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Eliminar Tabla">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                </div>
                
                <h3 class="font-bold text-[#111418] dark:text-white text-lg mb-1 truncate" title="${table.name}">${table.name}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2.5em] mb-4">${table.description || 'Sin descripción'}</p>
                
                <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TABLA</span>
                    <a href="table.html?id=${table.id}" 
                        class="text-sm font-bold text-primary hover:text-blue-600 flex items-center gap-1 transition-colors">
                        Ver Datos
                        <span class="material-symbols-outlined text-base">arrow_forward</span>
                    </a>
                </div>
            </div>
        `).join('');
    }
}

function goToCreateTable() {
    window.location.href = `table_form.html?systemId=${systemId}`;
}

async function deleteTable(id) {
    if (!confirm('¿Eliminar tabla? Se perderán todos los datos.')) return;
    const res = await apiFetch(`/systems/${systemId}/tables/${id}`, { method: 'DELETE' });
    if (res.ok) {
        loadTables();
    } else {
        alert('Error eliminando tabla');
    }
}

async function loadSidebarInfo() {
    const res = await apiFetch('/user/profile');
    if (res && res.ok) {
        const userProfile = await res.json();
        const nameEl = document.getElementById('sidebarUserName');
        const emailEl = document.getElementById('sidebarUserEmail');
        const initialEl = document.getElementById('sidebarUserInitial');
        const avatarImg = document.getElementById('sidebarUserAvatar');

        if (nameEl) nameEl.innerText = userProfile.name || 'Usuario';
        if (emailEl) emailEl.innerText = userProfile.email || '...';

        if (userProfile.avatarUrl) {
            if (avatarImg) {
                avatarImg.src = userProfile.avatarUrl;
                avatarImg.classList.remove('hidden');
            }
            if (initialEl) initialEl.classList.add('hidden');
        } else {
            if (initialEl) {
                initialEl.innerText = (userProfile.name || 'U').charAt(0).toUpperCase();
                initialEl.classList.remove('hidden');
            }
            if (avatarImg) avatarImg.classList.add('hidden');
        }
    }
}

init();
