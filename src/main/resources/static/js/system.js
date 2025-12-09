checkAuth();
const urlParams = new URLSearchParams(window.location.search);
const systemId = urlParams.get('id');
let allTables = [];
let currentRegisterTableId = null;
let currentRegisterFields = [];

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

        // Load Image
        const img = document.getElementById('systemLogo');
        img.src = system.imageUrl || 'img/Isotipo modo claro.jpeg';
        img.onerror = () => { img.src = 'img/Isotipo modo claro.jpeg'; };
    }
}

async function loadTables() {
    const res = await apiFetch(`/systems/${systemId}/tables`);
    if (res.ok) {
        allTables = await res.json();
        filterTables(); // Initial render
    }
}

function filterTables() {
    const search = document.getElementById('tableSearchInput').value.toLowerCase();
    const filtered = allTables.filter(t =>
        t.name.toLowerCase().includes(search) ||
        (t.description && t.description.toLowerCase().includes(search))
    );
    renderTables(filtered);
}

function renderTables(tables) {
    const container = document.getElementById('tablesList');

    if (tables.length === 0) {
        container.className = 'col-span-1 md:col-span-2 lg:col-span-3 text-center py-12';
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center text-gray-400">
                <span class="material-symbols-outlined text-6xl mb-2 opacity-20">table_off</span>
                <p class="text-sm">No se encontraron tablas</p>
            </div>
         `;
        return;
    }

    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    container.innerHTML = tables.map(table => `
        <div class="bg-white dark:bg-[#151f2b] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-shadow group relative flex flex-col h-full">
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
            <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[2.5em] mb-4 flex-grow">${table.description || 'Sin descripción'}</p>
            
            <div class="flex flex-col gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <button onclick="openRegisterModal(${table.id}, '${table.name}')" 
                    class="w-full py-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-lg">add_circle</span>
                    Registrar
                </button>
                <a href="table.html?id=${table.id}" 
                    class="w-full py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    Ver Datos
                    <span class="material-symbols-outlined text-lg">arrow_forward</span>
                </a>
            </div>
        </div>
    `).join('');
}

// --- Modal Logic ---

async function openRegisterModal(tableId, tableName) {
    currentRegisterTableId = tableId;
    document.getElementById('modalTitle').innerText = `Registrar en ${tableName}`;
    document.getElementById('modalFieldsContainer').innerHTML = `
        <div class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p class="text-gray-400 text-sm">Cargando campos...</p>
        </div>
    `;
    document.getElementById('registerModal').classList.remove('hidden');

    // Fetch Fields
    try {
        const res = await apiFetch(`/tables/${tableId}/fields`);
        if (res.ok) {
            currentRegisterFields = await res.json();
            renderModalFields();
        } else {
            document.getElementById('modalFieldsContainer').innerHTML = '<p class="text-red-500 text-center">Error cargando campos</p>';
        }
    } catch (e) {
        console.error(e);
        document.getElementById('modalFieldsContainer').innerHTML = '<p class="text-red-500 text-center">Error de conexión</p>';
    }
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.add('hidden');
    currentRegisterTableId = null;
    currentRegisterFields = [];
    document.getElementById('registerForm').reset();
}

function renderModalFields() {
    const container = document.getElementById('modalFieldsContainer');
    if (currentRegisterFields.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center">Esta tabla no tiene campos definidos.</p>';
        return;
    }

    container.innerHTML = currentRegisterFields.map(f => {
        const baseInputClass = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white placeholder-gray-400";
        let inputHtml = '';

        if (f.type === 'select') {
            const opts = f.options || [];
            inputHtml = `
                <select id="modal_field_${f.id}" class="${baseInputClass}">
                    <option value="">Seleccionar...</option>
                    ${opts.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
        } else if (f.type === 'boolean') {
            inputHtml = `
                <select id="modal_field_${f.id}" class="${baseInputClass}">
                    <option value="">Seleccionar...</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                </select>
            `;
        } else if (f.type === 'relation') {
            // Simplified relation for modal (text input for ID for now to avoid complex async/cache logic duplication)
            // Ideally we'd copy the full relation search logic, but let's keep it simple for this iteration or use a standard input
            inputHtml = `<input type="text" id="modal_field_${f.id}" class="${baseInputClass}" placeholder="ID de ${f.name} (Relación)">`;
        } else {
            const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
            inputHtml = `<input type="${type}" id="modal_field_${f.id}" class="${baseInputClass}" placeholder="${f.name}">`;
        }

        return `
            <div>
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                    ${f.name} ${f.required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                ${inputHtml}
            </div>
        `;
    }).join('');
}

async function submitRegister() {
    if (!currentRegisterTableId) return;

    const values = {};
    let hasError = false;

    currentRegisterFields.forEach(f => {
        const el = document.getElementById(`modal_field_${f.id}`);
        const val = el ? el.value : '';

        if (f.required && !val) {
            el.classList.add('border-red-500');
            hasError = true;
        } else {
            if (el) el.classList.remove('border-red-500');
        }
        values[f.id] = val;
    });

    if (hasError) {
        alert('Por favor completa los campos requeridos');
        return;
    }

    try {
        const res = await apiFetch(`/tables/${currentRegisterTableId}/records`, {
            method: 'POST',
            body: JSON.stringify({ values: values })
        });

        if (res.ok) {
            closeRegisterModal();
            alert('Registro guardado exitosamente');
        } else {
            const err = await res.json();
            alert('Error: ' + (err.message || 'No se pudo guardar'));
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
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
