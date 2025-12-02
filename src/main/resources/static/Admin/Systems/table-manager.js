const API_URL = 'http://localhost:8080/api';
let currentSystemId = null;
let currentTables = [];
let editingTableId = null;
let deleteTableId = null;

function obtenerToken() {
    return localStorage.getItem('token');
}

function getAuthHeaders() {
    const token = obtenerToken();
    if (!token) {
        return { 'Content-Type': 'application/json' };
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    currentSystemId = urlParams.get('systemId');

    if (!currentSystemId) {
        showNotification('ID de sistema no proporcionado', 'error');
        setTimeout(() => window.location.href = 'system.html', 2000);
        return;
    }

    setupEventListeners();
    loadSystemAndTables();
});

function setupEventListeners() {
    const btnBack = document.getElementById('btnBackToSystems');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'system.html';
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    const btnCreateTable = document.getElementById('btnCreateTable');
    if (btnCreateTable) {
        btnCreateTable.addEventListener('click', openCreateTableModal);
    }

    const btnManageRelationships = document.getElementById('btnManageRelationships');
    if (btnManageRelationships) {
        btnManageRelationships.addEventListener('click', () => {
            window.location.href = `relationships-manager.html?systemId=${currentSystemId}`;
        });
    }

    const btnCancelTable = document.getElementById('btnCancelTable');
    if (btnCancelTable) {
        btnCancelTable.addEventListener('click', closeTableModal);
    }

    const tableForm = document.getElementById('tableForm');
    if (tableForm) {
        tableForm.addEventListener('submit', handleTableFormSubmit);
    }

    const btnCancelDelete = document.getElementById('btnCancelDelete');
    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', hideDeleteModal);
    }

    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', confirmDelete);
    }
}

async function loadSystemAndTables() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showError('Sesión expirada. Inicia sesión nuevamente.');
            setTimeout(() => window.location.href = '../../login.html', 2000);
            return;
        }

        // Load system info
        const systemResp = await fetch(`${API_URL}/sistemas/${currentSystemId}`, { headers });
        if (!systemResp.ok) {
            showError('No se pudo cargar el sistema.');
            return;
        }
        const system = await systemResp.json();

        // Update breadcrumb
        const systemNameEl = document.getElementById('systemName');
        if (systemNameEl && system && system.name) {
            systemNameEl.textContent = system.name;
        }

        // Load tables
        await loadTables();

    } catch (error) {
        console.error('Error en loadSystemAndTables:', error);
        showError('Error de conexión al cargar el sistema.');
    }
}

async function loadTables() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/sistemas/${currentSystemId}/tablas`, { headers });

        if (!response.ok) {
            throw new Error('Error al cargar tablas');
        }

        const tables = await response.json();
        currentTables = tables;

        updateStats(tables);
        renderTablesGrid(tables);
    } catch (error) {
        console.error('Error cargando tablas:', error);
        showError('Error al cargar las tablas');
    }
}

function updateStats(tables) {
    const elTables = document.getElementById('statTotalTables');
    const elFields = document.getElementById('statTotalFields');
    const elRecords = document.getElementById('statTotalRecords');
    const elRel = document.getElementById('statTotalRelationships');

    let totalFields = 0;
    let totalRecords = 0;

    tables.forEach(table => {
        totalFields += table.fieldsCount || 0;
        totalRecords += table.recordsCount || 0;
    });

    if (elTables) elTables.textContent = tables.length;
    if (elFields) elFields.textContent = totalFields;
    if (elRecords) elRecords.textContent = totalRecords;
    if (elRel) elRel.textContent = 0; // Load relationships separately if needed
}

function renderTablesGrid(tables) {
    const grid = document.getElementById('tablesGrid');
    if (!grid) return;

    if (tables.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">No hay tablas creadas. Crea tu primera tabla para comenzar.</div>';
        return;
    }

    grid.innerHTML = tables.map(table => `
        <div class="glass-card p-6 rounded-xl shadow-lg hover-lift cursor-pointer transition-all"
             onclick="openTable('${table.id}')">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3 flex-1">
                    <div class="p-3 rounded-xl bg-blue-500/10">
                        <span class="material-symbols-outlined text-2xl text-primary">table_chart</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-lg text-[#111418] dark:text-white truncate">${table.name}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${table.description || 'Sin descripción'}</p>
                    </div>
                </div>
                <div class="flex gap-1">
                    <button onclick="event.stopPropagation(); editTable(${table.id})" class="p-2 rounded-full hover:bg-primary/10" title="Editar tabla">
                        <span class="material-symbols-outlined text-primary">edit</span>
                    </button>
                    <button onclick="event.stopPropagation(); showDeleteModal(${table.id})" class="p-2 rounded-full hover:bg-red-500/10" title="Eliminar tabla">
                        <span class="material-symbols-outlined text-red-500">delete</span>
                    </button>
                </div>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">view_column</span>
                    ${table.fieldsCount || 0} columnas
                </span>
                <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">description</span>
                    ${table.recordsCount || 0} registros
                </span>
            </div>
        </div>
    `).join('');
}

function handleSearch() {
    const term = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

    if (!term) {
        renderTablesGrid(currentTables);
        return;
    }

    const filtered = currentTables.filter(t =>
        t.name.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
    );

    renderTablesGrid(filtered);
}

function openTable(tableId) {
    window.location.href = `system-data.html?systemId=${currentSystemId}&tableId=${tableId}`;
}

function openCreateTableModal() {
    editingTableId = null;
    document.getElementById('tableModalTitle').textContent = 'Crear Tabla';
    document.getElementById('tableName').value = '';
    document.getElementById('tableDescription').value = '';
    document.getElementById('tableModal').classList.remove('hidden');
}

async function editTable(tableId) {
    editingTableId = tableId;
    const table = currentTables.find(t => t.id == tableId);

    if (!table) {
        showNotification('Tabla no encontrada', 'error');
        return;
    }

    document.getElementById('tableModalTitle').textContent = 'Editar Tabla';
    document.getElementById('tableName').value = table.name;
    document.getElementById('tableDescription').value = table.description || '';
    document.getElementById('tableModal').classList.remove('hidden');
}

function closeTableModal() {
    document.getElementById('tableModal').classList.add('hidden');
    editingTableId = null;
}

async function handleTableFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('tableName').value.trim();
    const description = document.getElementById('tableDescription').value.trim();

    if (!name) {
        showNotification('El nombre de la tabla es requerido', 'error');
        return;
    }

    try {
        showLoadingScreen();
        const headers = getAuthHeaders();
        const tableData = { name, description };

        let response;
        if (editingTableId) {
            // Update
            response = await fetch(`${API_URL}/sistemas/${currentSystemId}/tablas/${editingTableId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(tableData)
            });
        } else {
            // Create
            response = await fetch(`${API_URL}/sistemas/${currentSystemId}/tablas`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(tableData)
            });
        }

        if (response.ok) {
            showLoadingSuccess(editingTableId ? 'Tabla actualizada exitosamente' : 'Tabla creada exitosamente');
            setTimeout(() => {
                hideLoadingScreen();
                closeTableModal();
                loadTables();
            }, 1500);
        } else {
            hideLoadingScreen();
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al guardar tabla'), 'error');
        }
    } catch (error) {
        hideLoadingScreen();
        console.error('Error saving table:', error);
        showNotification('Error al guardar tabla', 'error');
    }
}

function showDeleteModal(tableId) {
    deleteTableId = tableId;
    document.getElementById('confirmEmail').value = '';
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

function hideDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    deleteTableId = null;
}

async function confirmDelete() {
    const email = document.getElementById('confirmEmail').value;
    if (!email) {
        showNotification('Por favor ingresa tu email', 'error');
        return;
    }

    try {
        showLoadingScreen();
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/sistemas/${currentSystemId}/tablas/${deleteTableId}`, {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({ email: email })
        });

        if (response.ok) {
            showLoadingSuccess('Tabla eliminada exitosamente');
            setTimeout(() => {
                hideLoadingScreen();
                hideDeleteModal();
                loadTables();
            }, 1500);
        } else {
            hideLoadingScreen();
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al eliminar tabla'), 'error');
        }
    } catch (error) {
        hideLoadingScreen();
        console.error('Error deleting table:', error);
        showNotification('Error al eliminar tabla', 'error');
    }
}

function showError(message) {
    const grid = document.getElementById('tablesGrid');
    if (grid) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-red-500">${message}</div>`;
    }
}

function showNotification(message, type = 'info') {
    // Simple fallback notification
    if (type === 'error') {
        console.error('❌ ' + message);
    } else if (type === 'success') {
        console.log('✅ ' + message);
    } else {
        console.log(message);
    }

    // Use alert for critical messages
    if (type === 'error' || type === 'success') {
        const prefix = type === 'error' ? '❌ ' : '✅ ';
        alert(prefix + message);
    }
}

function showLoadingScreen() {
    const overlay = document.getElementById('loadingOverlay');
    const spinner = overlay.querySelector('.loading-spinner');
    const checkmark = overlay.querySelector('.checkmark');
    const text = overlay.querySelector('.loading-text');

    spinner.classList.remove('success');
    checkmark.classList.remove('show');
    text.textContent = 'Procesando...';
    text.classList.remove('success-text');

    overlay.classList.add('active');
}

function showLoadingSuccess(message = '¡Completado!') {
    const overlay = document.getElementById('loadingOverlay');
    const spinner = overlay.querySelector('.loading-spinner');
    const checkmark = overlay.querySelector('.checkmark');
    const text = overlay.querySelector('.loading-text');

    spinner.classList.add('success');
    setTimeout(() => {
        spinner.style.display = 'none';
        checkmark.classList.add('show');
        text.textContent = message;
        text.classList.add('success-text');
    }, 300);
}

function hideLoadingScreen() {
    const overlay = document.getElementById('loadingOverlay');
    const spinner = overlay.querySelector('.loading-spinner');

    overlay.classList.remove('active');
    spinner.style.display = 'block';
}
