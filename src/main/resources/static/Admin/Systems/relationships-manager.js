const API_URL = 'http://localhost:8080/api';
let currentSystemId = null;
let currentRelationships = [];
let currentTables = [];
let tableFields = {}; // Cache of fields per table

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
    loadSystemAndRelationships();
});

function setupEventListeners() {
    const btnBack = document.getElementById('btnBackToTables');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = `table-manager.html?systemId=${currentSystemId}`;
        });
    }

    const btnCreate = document.getElementById('btnCreateRelationship');
    if (btnCreate) {
        btnCreate.addEventListener('click', openCreateRelationshipModal);
    }

    const btnCancel = document.getElementById('btnCancelRelationship');
    if (btnCancel) {
        btnCancel.addEventListener('click', closeRelationshipModal);
    }

    const form = document.getElementById('relationshipForm');
    if (form) {
        form.addEventListener('submit', handleRelationshipFormSubmit);
    }

    // Dynamic field loading based on table selection
    const fromTableSelect = document.getElementById('fromTableId');
    const toTableSelect = document.getElementById('toTableId');

    if (fromTableSelect) {
        fromTableSelect.addEventListener('change', (e) => loadFieldsForTable(e.target.value, 'from'));
    }

    if (toTableSelect) {
        toTableSelect.addEventListener('change', (e) => loadFieldsForTable(e.target.value, 'to'));
    }
}

async function loadSystemAndRelationships() {
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
        const systemNameLink = document.getElementById('systemNameLink');
        const tablesLink = document.getElementById('tablesLink');
        if (systemNameLink && system && system.name) {
            systemNameLink.textContent = system.name;
            systemNameLink.href = `table-manager.html?systemId=${currentSystemId}`;
        }
        if (tablesLink) {
            tablesLink.href = `table-manager.html?systemId=${currentSystemId}`;
        }

        // Load tables
        await loadTables();

        // Load relationships
        await loadRelationships();

    } catch (error) {
        console.error('Error en loadSystemAndRelationships:', error);
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

        currentTables = await response.json();
    } catch (error) {
        console.error('Error cargando tablas:', error);
        showError('Error al cargar las tablas');
    }
}

async function loadRelationships() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/sistemas/${currentSystemId}/relaciones`, { headers });

        if (!response.ok) {
            throw new Error('Error al cargar relaciones');
        }

        currentRelationships = await response.json();

        updateStats(currentRelationships);
        renderRelationshipsList(currentRelationships);
    } catch (error) {
        console.error('Error cargando relaciones:', error);
        showError('Error al cargar las relaciones');
    }
}

function updateStats(relationships) {
    const elTotal = document.getElementById('statTotalRelationships');
    const elTables = document.getElementById('statRelatedTables');
    const elType = document.getElementById('statMostUsedType');

    if (elTotal) elTotal.textContent = relationships.length;

    // Count unique tables involved
    const uniqueTables = new Set();
    relationships.forEach(rel => {
        uniqueTables.add(rel.fromTableId);
        uniqueTables.add(rel.toTableId);
    });
    if (elTables) elTables.textContent = uniqueTables.size;

    // Most used type
    const typeCounts = {};
    relationships.forEach(rel => {
        typeCounts[rel.relationType] = (typeCounts[rel.relationType] || 0) + 1;
    });
    const mostUsed = Object.keys(typeCounts).reduce((a, b) =>
        typeCounts[a] > typeCounts[b] ? a : b,
        'N/A'
    );
    if (elType) {
        elType.textContent = formatRelationType(mostUsed);
    }
}

function renderRelationshipsList(relationships) {
    const list = document.getElementById('relationshipsList');
    if (!list) return;

    if (relationships.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500 dark:text-gray-400">No hay relaciones definidas. Crea tu primera relación para conectar tablas.</div>';
        return;
    }

    list.innerHTML = relationships.map(rel => `
        <div class="relationship-card ${rel.relationType} hover-lift">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-lg font-bold text-[#111418] dark:text-white">
                            ${rel.fromTableName || 'Tabla'}
                        </span>
                        <span class="material-symbols-outlined text-primary">arrow_forward</span>
                        <span class="text-lg font-bold text-[#111418] dark:text-white">
                            ${rel.toTableName || 'Tabla'}
                        </span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-base">view_column</span>
                            ${rel.fromFieldName || 'Campo'} → ${rel.toFieldName || 'Campo'}
                        </span>
                        <span class="relation-badge ${rel.relationType}">
                            ${formatRelationType(rel.relationType)}
                        </span>
                    </div>
                </div>
                <button onclick="deleteRelationship(${rel.id})" class="btn-danger">
                    <span class="material-symbols-outlined">delete</span>
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

function formatRelationType(type) {
    const types = {
        'one_to_one': '1:1 (Uno a Uno)',
        'one_to_many': '1:N (Uno a Muchos)',
        'many_to_many': 'N:N (Muchos a Muchos)',
        'N/A': 'N/A'
    };
    return types[type] || type;
}

async function openCreateRelationshipModal() {
    // Populate table selects
    const fromTableSelect = document.getElementById('fromTableId');
    const toTableSelect = document.getElementById('toTableId');

    const tableOptions = currentTables.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('');

    if (fromTableSelect) {
        fromTableSelect.innerHTML = '<option value="">Selecciona una tabla...</option>' + tableOptions;
    }
    if (toTableSelect) {
        toTableSelect.innerHTML = '<option value="">Selecciona una tabla...</option>' + tableOptions;
    }

    // Reset field selects
    document.getElementById('fromFieldId').disabled = true;
    document.getElementById('toFieldId').disabled = true;
    document.getElementById('fromFieldId').innerHTML = '<option value="">Primero selecciona la tabla origen...</option>';
    document.getElementById('toFieldId').innerHTML = '<option value="">Primero selecciona la tabla destino...</option>';

    document.getElementById('relationshipModal').classList.remove('hidden');
}

function closeRelationshipModal() {
    document.getElementById('relationshipModal').classList.add('hidden');
    document.getElementById('relationshipForm').reset();
}

async function loadFieldsForTable(tableId, direction) {
    if (!tableId) {
        const fieldSelect = document.getElementById(direction === 'from' ? 'fromFieldId' : 'toFieldId');
        fieldSelect.disabled = true;
        fieldSelect.innerHTML = `<option value="">Primero selecciona la tabla ${direction === 'from' ? 'origen' : 'destino'}...</option>`;
        return;
    }

    try {
        const headers = getAuthHeaders();

        // Check cache first
        if (!tableFields[tableId]) {
            const response = await fetch(`${API_URL}/sistemas/${currentSystemId}/tablas/${tableId}/campos`, { headers });
            if (!response.ok) throw new Error('Error loading fields');
            tableFields[tableId] = await response.json();
        }

        const fields = tableFields[tableId];
        const fieldSelect = document.getElementById(direction === 'from' ? 'fromFieldId' : 'toFieldId');

        if (fields.length === 0) {
            fieldSelect.innerHTML = '<option value="">No hay campos en esta tabla</option>';
            fieldSelect.disabled = true;
        } else {
            fieldSelect.innerHTML = '<option value="">Selecciona un campo...</option>' +
                fields.map(f => `<option value="${f.id}">${f.name} (${f.type})</option>`).join('');
            fieldSelect.disabled = false;
        }
    } catch (error) {
        console.error('Error loading fields:', error);
        showNotification('Error al cargar los campos de la tabla', 'error');
    }
}

async function handleRelationshipFormSubmit(e) {
    e.preventDefault();

    const fromTableId = parseInt(document.getElementById('fromTableId').value);
    const fromFieldId = parseInt(document.getElementById('fromFieldId').value);
    const toTableId = parseInt(document.getElementById('toTableId').value);
    const toFieldId = parseInt(document.getElementById('toFieldId').value);
    const relationType = document.getElementById('relationType').value;

    if (!fromTableId || !fromFieldId || !toTableId || !toFieldId) {
        showNotification('Todos los campos son requeridos', 'error');
        return;
    }

    if (fromTableId === toTableId && fromFieldId === toFieldId) {
        showNotification('No puedes crear una relación de un campo consigo mismo', 'error');
        return;
    }

    try {
        const headers = getAuthHeaders();
        const relationshipData = {
            fromTableId,
            fromFieldId,
            toTableId,
            toFieldId,
            relationType
        };

        const response = await fetch(`${API_URL}/sistemas/${currentSystemId}/relaciones`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(relationshipData)
        });

        if (response.ok) {
            showNotification('Relación creada exitosamente', 'success');
            closeRelationshipModal();
            await loadRelationships();
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al crear relación'), 'error');
        }
    } catch (error) {
        console.error('Error creating relationship:', error);
        showNotification('Error al crear relación', 'error');
    }
}

async function deleteRelationship(relationshipId) {
    if (!confirm('¿Estás seguro de eliminar esta relación?')) {
        return;
    }

    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}/sistemas/${currentSystemId}/relaciones/${relationshipId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            showNotification('Relación eliminada exitosamente', 'success');
            await loadRelationships();
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al eliminar relación'), 'error');
        }
    } catch (error) {
        console.error('Error deleting relationship:', error);
        showNotification('Error al eliminar relación', 'error');
    }
}

function showError(message) {
    const list = document.getElementById('relationshipsList');
    if (list) {
        list.innerHTML = `<div class="text-center py-8 text-red-500">${message}</div>`;
    }
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }

    if (type === 'error') {
        alert('❌ ' + message);
    } else if (type === 'success') {
        alert('✅ ' + message);
    } else {
        alert(message);
    }
}
