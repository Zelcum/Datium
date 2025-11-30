const API_URL = 'http://localhost:8080/api';
let currentSystemId = null;
let fields = [];
let records = [];
let editingFieldId = null;
let editingRecordId = null;
let userRole = null;
let isOwner = false;
let filteredRecords = [];
let systemInfo = null;
let charts = {};

function obtenerToken() {
    return localStorage.getItem('token');
}

function obtenerEmailDelUsuario() {
    const token = obtenerToken();
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub || payload.email || null;
        } catch (e) {
            console.error('Error parsing token:', e);
            return null;
        }
    }
    return null;
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

function goBack() {
    window.location.href = './system.html';
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '../../login.html';
}

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    currentSystemId = urlParams.get('id');

    if (!currentSystemId) {
        showNotification('ID de sistema no proporcionado', 'error');
        goBack();
        return;
    }

    const btnLogout = document.getElementById('btnLogout');
    const btnToggleStats = document.getElementById('btnToggleStats');
    const searchRecords = document.getElementById('searchRecords');
    const newFieldType = document.getElementById('newFieldType');

    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
    if (btnToggleStats) btnToggleStats.addEventListener('click', toggleStatistics);
    if (searchRecords) searchRecords.addEventListener('input', handleSearchRecords);
    if (newFieldType) newFieldType.addEventListener('change', handleFieldTypeChange);

    loadAllSystems();
    loadAllData();
});

async function loadAllData() {
    const startTime = Date.now();
    const minLoadTime = 2000;

    try {
        const systemPromise = loadSystemInfo();
        const fieldsPromise = loadFields();

        await Promise.all([systemPromise, fieldsPromise]);
        await loadRecords();

        updateUIForPermissions();

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);

        setTimeout(() => {
            hideLoadingScreen();
        }, remainingTime);
    } catch (error) {
        console.error('Error loading data:', error);
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        setTimeout(() => {
            hideLoadingScreen();
        }, remainingTime);
    }
}

function showLoadingSuccess() {
    const spinner = document.getElementById('loading-spinner');
    const checkmark = document.getElementById('checkmark');
    const loadingText = document.getElementById('loading-text');

    if (spinner) spinner.style.display = 'none';
    if (checkmark) checkmark.classList.add('show');
    if (loadingText) {
        loadingText.textContent = '¡Sistema cargado!';
        loadingText.classList.add('success-text');
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');

    showLoadingSuccess();

    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        if (mainContent) {
            mainContent.classList.remove('hidden');
        }
    }, 1000);
}

function updateUIForPermissions() {
    const canManageFields = isOwner || userRole === 'owner' || userRole === 'admin';
    const canEditRecords = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

    const fieldsBtn = document.querySelector('button[onclick="openFieldsModal()"]');
    const recordsBtn = document.querySelector('button[onclick="openRecordsManagement()"]');

    if (fieldsBtn) {
        if (!canManageFields) {
            fieldsBtn.disabled = true;
            fieldsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            fieldsBtn.disabled = false;
            fieldsBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    if (recordsBtn) {
        if (!canEditRecords) {
            recordsBtn.disabled = true;
            recordsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            recordsBtn.disabled = false;
            recordsBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

function toggleStatistics() {
    const statsSection = document.getElementById('statisticsSection');
    const btnToggle = document.getElementById('btnToggleStats');

    if (statsSection.classList.contains('hidden')) {
        statsSection.classList.remove('hidden');
        btnToggle.classList.remove('arrow-down');
        btnToggle.classList.add('arrow-up');
        updateCharts();
    } else {
        statsSection.classList.add('hidden');
        btnToggle.classList.remove('arrow-up');
        btnToggle.classList.add('arrow-down');
    }
}

async function loadSystemInfo() {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
        return Promise.resolve();
    }

    try {
        const response = await fetch(API_URL + '/sistemas/' + currentSystemId, {
            headers: headers
        });

        if (!response.ok) {
            if (response.status === 404) {
                showNotification('Sistema no encontrado', 'error');
                goBack();
            }
            return Promise.resolve();
        }

        systemInfo = await response.json();

        const imageElement = document.getElementById('systemImage');
        if (imageElement) {
            if (systemInfo.imageUrl && systemInfo.imageUrl.trim() !== '') {
                const imageUrl = systemInfo.imageUrl.startsWith('http')
                    ? systemInfo.imageUrl
                    : `http://localhost:8080${systemInfo.imageUrl}`;
                imageElement.src = imageUrl;
                imageElement.classList.remove('hidden');
            } else {
                imageElement.classList.add('hidden');
            }
        }

        const nameElement = document.getElementById('systemName');
        if (nameElement && systemInfo.name) {
            nameElement.textContent = systemInfo.name;
        }

        const descElement = document.getElementById('systemDescription');
        if (descElement) {
            descElement.textContent = systemInfo.description || '-';
        }

        const token = obtenerToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.userId ? parseInt(payload.userId) : (payload.sub ? parseInt(payload.sub) : null);
                const ownerId = systemInfo.ownerId ? parseInt(systemInfo.ownerId) : null;

                isOwner = (userId && ownerId && ownerId === userId);

                if (isOwner) {
                    userRole = 'owner';
                } else if (systemInfo.users && Array.isArray(systemInfo.users) && userId) {
                    const userAccess = systemInfo.users.find(u => {
                        const uId = u.userId ? parseInt(u.userId) : null;
                        return uId === userId;
                    });
                    userRole = userAccess?.role?.toLowerCase() || null;
                } else {
                    userRole = null;
                }
            } catch (e) {
                console.error('Error parsing token:', e);
                isOwner = false;
                userRole = null;
            }
        }

        return Promise.resolve();
    } catch (error) {
        console.error('Error loading system info:', error);
        return Promise.resolve();
    }
}

async function loadFields() {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
        fields = [];
        return Promise.resolve();
    }

    try {
        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/campos', {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            fields = Array.isArray(data) ? data : [];
        } else {
            fields = [];
        }

        renderFields();
        renderRecords();
        updateStatistics();
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading fields:', error);
        fields = [];
        renderFields();
        renderRecords();
        updateStatistics();
        return Promise.resolve();
    }
}

function renderFields() {
    const tbody = document.getElementById('fieldsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (fields.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay campos. Agrega campos para comenzar.</td></tr>';
        return;
    }

    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const canManageFields = isOwner || userRole === 'owner' || userRole === 'admin';

    sortedFields.forEach((field, index) => {
        const row = document.createElement('tr');
        row.className = 'table-row hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors';
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-up');
        row.innerHTML = `
            <td class="px-6 py-4 text-[#111418] dark:text-white font-medium">${field.name}</td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${field.type}</td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${field.required ? 'Sí' : 'No'}</td>
            <td class="px-6 py-4 text-[#111418] dark:text-white">${field.orderIndex || 0}</td>
            <td class="px-6 py-4">
                ${canManageFields ? `
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="editField(${field.id})" class="action-btn action-btn-edit p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Editar">
                            <span class="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onclick="deleteField(${field.id})" class="action-btn action-btn-delete p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Eliminar">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                ` : '<span class="text-gray-400 dark:text-gray-400">Sin permisos</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openFieldsModal() {
    const canManage = isOwner || userRole === 'owner' || userRole === 'admin';
    if (!canManage) {
        showNotification('No tienes permisos para gestionar campos. Solo el owner y admin pueden gestionar campos.', 'error');
        return;
    }

    const modal = document.getElementById('fieldsModal');
    const titleEl = document.getElementById('fieldsModalTitle');
    const imageEl = document.getElementById('fieldsModalImage');

    if (systemInfo) {
        titleEl.textContent = systemInfo.name || 'Base de Datos';
        if (systemInfo.imageUrl && systemInfo.imageUrl.trim() !== '') {
            const imageUrl = systemInfo.imageUrl.startsWith('http')
                ? systemInfo.imageUrl
                : `http://localhost:8080${systemInfo.imageUrl}`;
            imageEl.src = imageUrl;
            imageEl.classList.remove('hidden');
        } else {
            imageEl.classList.add('hidden');
        }
    } else {
        titleEl.textContent = 'Base de Datos';
        imageEl.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    loadFields();
}

function closeFieldsModal() {
    document.getElementById('fieldsModal').classList.add('hidden');
    cancelAddField();
}

function showAddFieldForm() {
    editingFieldId = null;
    document.getElementById('formTitle').textContent = 'Agregar Campo';
    const btnSaveField = document.getElementById('btnSaveField');
    if (btnSaveField) {
        btnSaveField.innerHTML = '<span class="material-symbols-outlined">save</span><span>Guardar</span>';
        btnSaveField.onclick = () => saveNewField();
    }
    document.getElementById('newFieldName').value = '';
    document.getElementById('newFieldType').value = 'text';
    document.getElementById('newFieldRequired').checked = false;
    document.getElementById('newFieldOrder').value = '0';
    document.getElementById('newFieldOptions').value = '';
    document.getElementById('newFieldOptionsContainer').classList.add('hidden');
    document.getElementById('addFieldForm').classList.remove('hidden');
    handleFieldTypeChange();
}

function cancelAddField() {
    document.getElementById('addFieldForm').classList.add('hidden');
    editingFieldId = null;
}

function handleFieldTypeChange() {
    const type = document.getElementById('newFieldType').value;
    const optionsContainer = document.getElementById('newFieldOptionsContainer');
    if (type === 'select' || type === 'radio') {
        optionsContainer.classList.remove('hidden');
    } else {
        optionsContainer.classList.add('hidden');
    }
}

async function saveNewField() {
    const nameInput = document.getElementById('newFieldName');
    const typeSelect = document.getElementById('newFieldType');
    const requiredCheckbox = document.getElementById('newFieldRequired');
    const orderInput = document.getElementById('newFieldOrder');
    const optionsInput = document.getElementById('newFieldOptions');

    if (!nameInput || !typeSelect || !requiredCheckbox || !orderInput) {
        showNotification('Error: No se encontraron los campos del formulario', 'error');
        return;
    }

    const name = nameInput.value.trim();
    const type = typeSelect.value;
    const required = requiredCheckbox.checked;
    const order = parseInt(orderInput.value) || 0;
    const optionsText = optionsInput ? optionsInput.value : '';
    const options = optionsText ? optionsText.split(',').map(o => o.trim()).filter(o => o) : [];

    if (!name) {
        showNotification('El nombre del campo es requerido', 'error');
        return;
    }

    if ((type === 'select' || type === 'radio') && options.length === 0) {
        showNotification('Los campos de selección y radio requieren al menos una opción', 'error');
        return;
    }

    if (!currentSystemId) {
        showNotification('Error: No se encontró el ID del sistema', 'error');
        return;
    }

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const fieldData = {
            name: name,
            type: type,
            required: required,
            orderIndex: order,
            options: options
        };

        const isEditing = editingFieldId !== null && editingFieldId !== undefined && editingFieldId !== 0;
        const url = isEditing
            ? API_URL + '/sistemas/' + currentSystemId + '/campos/' + editingFieldId
            : API_URL + '/sistemas/' + currentSystemId + '/campos';
        const method = isEditing ? 'PUT' : 'POST';

        console.log('Saving field:', { method, url, fieldData, editingFieldId, isEditing });

        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(fieldData)
        });

        if (response.ok) {
            cancelAddField();
            await loadFields();
            const isEditing = editingFieldId !== null && editingFieldId !== undefined && editingFieldId !== 0;
            showNotification(isEditing ? 'Campo actualizado exitosamente' : 'Campo creado exitosamente', 'success');
            editingFieldId = null;
        } else {
            let errorMessage = 'Error al guardar campo';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            console.error('Error saving field:', errorMessage);
            showNotification('Error: ' + errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error saving field:', error);
        showNotification('Error al guardar campo: ' + (error.message || 'Error de conexión'), 'error');
    }
}

async function deleteField(fieldId) {
    if (!confirm('¿Estás seguro de eliminar este campo? Esto eliminará todos los valores de este campo en los registros.')) return;

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/campos/' + fieldId, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            await loadFields();
            showNotification('Campo eliminado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al eliminar campo'), 'error');
        }
    } catch (error) {
        console.error('Error deleting field:', error);
        showNotification('Error al eliminar campo', 'error');
    }
}

function editField(fieldId) {
    const canManageFields = isOwner || userRole === 'owner' || userRole === 'admin';
    if (!canManageFields) {
        showNotification('No tienes permisos para editar campos. Solo el owner y admin pueden gestionar campos.', 'error');
        return;
    }

    const fieldIdNum = parseInt(fieldId);
    const field = fields.find(f => f.id === fieldIdNum || f.id === fieldId);
    if (!field) {
        console.error('Field not found. fieldId:', fieldId, 'fields:', fields);
        showNotification('Error: Campo no encontrado', 'error');
        return;
    }

    console.log('Editing field:', field, 'fieldId:', fieldId, 'fieldIdNum:', fieldIdNum);

    editingFieldId = fieldIdNum || field.id;
    document.getElementById('formTitle').textContent = 'Editar Campo';
    const btnSaveField = document.getElementById('btnSaveField');
    if (btnSaveField) {
        btnSaveField.innerHTML = '<span class="material-symbols-outlined">save</span><span>Guardar</span>';
        btnSaveField.setAttribute('onclick', 'saveNewField()');
    }

    const nameInput = document.getElementById('newFieldName');
    const typeSelect = document.getElementById('newFieldType');
    const requiredCheckbox = document.getElementById('newFieldRequired');
    const orderInput = document.getElementById('newFieldOrder');
    const optionsInput = document.getElementById('newFieldOptions');

    if (nameInput) nameInput.value = field.name || '';
    if (typeSelect) {
        typeSelect.value = field.type || 'text';
        setTimeout(() => {
            typeSelect.dispatchEvent(new Event('change'));
        }, 100);
    }
    if (requiredCheckbox) requiredCheckbox.checked = field.required || false;
    if (orderInput) orderInput.value = field.orderIndex || 0;
    if (optionsInput) {
        const optionsValue = field.options && Array.isArray(field.options) ? field.options.join(', ') : '';
        optionsInput.value = optionsValue;
    }

    handleFieldTypeChange();
    const addFieldForm = document.getElementById('addFieldForm');
    if (addFieldForm) {
        addFieldForm.classList.remove('hidden');
        setTimeout(() => {
            addFieldForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

async function loadRecords() {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
        records = [];
        filteredRecords = [];
        renderRecords();
        updateStatistics();
        return Promise.resolve();
    }

    try {
        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/registros', {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            records = Array.isArray(data) ? data : [];
            filteredRecords = [...records];
        } else {
            records = [];
            filteredRecords = [];
        }

        renderRecords();
        updateStatistics();
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading records:', error);
        records = [];
        filteredRecords = [];
        renderRecords();
        updateStatistics();
        return Promise.resolve();
    }
}

function handleSearchRecords() {
    const searchTerm = document.getElementById('searchRecords').value.toLowerCase().trim();

    if (!searchTerm) {
        filteredRecords = [...records];
    } else {
        filteredRecords = records.filter(record => {
            if (!record.fieldValues) return false;
            return Object.values(record.fieldValues).some(value =>
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }

    renderRecords();
}

function renderRecords() {
    const thead = document.getElementById('recordsTableHead');
    const tbody = document.getElementById('recordsTableBody');
    const recordsContent = document.getElementById('recordsContent');

    if (!thead || !tbody) return;

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (fields.length === 0) {
        if (recordsContent) recordsContent.classList.add('hidden');
        return;
    }

    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const headerRow = document.createElement('tr');
    sortedFields.forEach(field => {
        const th = document.createElement('th');
        th.className = 'px-6 py-4 text-left text-sm font-semibold text-[#111418] dark:text-white whitespace-nowrap';
        th.textContent = field.name;
        headerRow.appendChild(th);
    });
    const thActions = document.createElement('th');
    thActions.className = 'px-6 py-4 text-left text-sm font-semibold text-[#111418] dark:text-white whitespace-nowrap';
    thActions.textContent = 'Acciones';
    headerRow.appendChild(thActions);
    thead.appendChild(headerRow);

    if (recordsContent) recordsContent.classList.remove('hidden');

    if (filteredRecords.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="${sortedFields.length + 1}" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay registros. Agrega registros para llenar la tabla.</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    const canEdit = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

    filteredRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.className = 'table-row hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors';
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in-up');
        sortedFields.forEach(field => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 text-gray-600 dark:text-gray-300';
            const value = record.fieldValues && record.fieldValues[field.name] ? record.fieldValues[field.name] : '-';
            td.textContent = value;
            row.appendChild(td);
        });
        const tdActions = document.createElement('td');
        tdActions.className = 'px-6 py-4';
        if (canEdit) {
            tdActions.innerHTML = `
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="editRecord(${record.id})" class="action-btn action-btn-edit p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Editar">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="deleteRecord(${record.id})" class="action-btn action-btn-delete p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Eliminar">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            `;
        } else {
            tdActions.innerHTML = `
                <div class="flex items-center justify-center gap-1.5">
                </div>
            `;
        }
        row.appendChild(tdActions);
        tbody.appendChild(row);
    });
}


async function showAddRecordForm() {
    const canEdit = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
    if (!canEdit) {
        showNotification('No tienes permisos para agregar registros', 'error');
        return;
    }

    await loadFields();

    if (fields.length === 0) {
        showNotification('Debes crear al menos un campo antes de agregar registros', 'error');
        openFieldsModal();
        return;
    }

    editingRecordId = null;
    const btnText = document.getElementById('btnSaveRecordModal');
    if (btnText) {
        btnText.textContent = 'Agregar';
    }
    showRecordModal('Agregar Registro');
}

function showRecordModal(title) {
    const modal = document.getElementById('recordModal');
    const titleEl = document.getElementById('recordModalTitle');
    const imageEl = document.getElementById('recordModalImage');

    if (systemInfo) {
        titleEl.textContent = systemInfo.name || 'Base de Datos';
        if (systemInfo.imageUrl && systemInfo.imageUrl.trim() !== '') {
            const imageUrl = systemInfo.imageUrl.startsWith('http')
                ? systemInfo.imageUrl
                : `http://localhost:8080${systemInfo.imageUrl}`;
            imageEl.src = imageUrl;
            imageEl.classList.remove('hidden');
        } else {
            imageEl.classList.add('hidden');
        }
    } else {
        titleEl.textContent = title;
        imageEl.classList.add('hidden');
    }

    modal.classList.remove('hidden');

    const container = document.getElementById('recordFieldsContainer');

    if (fields.length === 0) {
        container.innerHTML = '<p class="text-center text-red-500">No hay campos definidos. Por favor, crea al menos un campo primero.</p>';
        return;
    }

    container.innerHTML = '<p class="text-center">Cargando campos...</p>';

    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    setTimeout(() => {
        container.innerHTML = sortedFields.map(field => {
            let input = '';
            if (field.type === 'checkbox') {
                input = `<label class="flex items-center">
                <input type="checkbox" id="record_field_${field.id}" class="mr-2" ${field.required ? 'required' : ''}>
                ${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}
            </label>`;
            } else if (field.type === 'radio') {
                const options = field.options || [];
                if (options.length > 0) {
                    input = `
                        <div class="flex flex-wrap gap-3">
                            ${options.map((opt, idx) => `
                                <label class="flex items-center gap-2 cursor-pointer px-3 py-2 glass-card rounded-lg hover:bg-primary/10 transition-colors">
                                    <input type="radio" name="record_field_${field.id}" value="${opt}" class="w-4 h-4 text-primary focus:ring-primary" ${field.required && idx === 0 ? 'required' : ''}>
                                    <span class="text-[#111418] dark:text-white text-sm">${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    `;
                } else {
                    input = `<p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>`;
                }
            } else if (field.type === 'select') {
                const options = field.options || [];
                if (options.length > 0) {
                    input = `<select id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''}>
                        <option value="" class="bg-white dark:bg-slate-800">Selecciona ${field.name.toLowerCase()}...</option>
                        ${options.map(opt => `<option value="${opt}" class="bg-white dark:bg-slate-800">${opt}</option>`).join('')}
                    </select>`;
                } else {
                    input = `<p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>`;
                }
            } else if (field.type === 'textarea') {
                input = `<textarea id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} rows="4" placeholder="Ingresa ${field.name.toLowerCase()}..."></textarea>`;
            } else if (field.type === 'date') {
                input = `<input type="date" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''}>`;
            } else if (field.type === 'datetime') {
                input = `<input type="datetime-local" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''}>`;
            } else if (field.type === 'number') {
                input = `<input type="number" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} placeholder="Ingresa ${field.name.toLowerCase()}...">`;
            } else if (field.type === 'email') {
                input = `<input type="email" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} placeholder="ejemplo@email.com">`;
            } else if (field.type === 'url') {
                input = `<input type="url" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} placeholder="https://ejemplo.com">`;
            } else if (field.type === 'tel') {
                input = `<input type="tel" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} placeholder="+1234567890">`;
            } else {
                input = `<input type="text" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} placeholder="Ingresa ${field.name.toLowerCase()}...">`;
            }
            return `
            <div class="mb-4">
                ${field.type !== 'checkbox' ? `<label class="block mb-2 text-[#111418] dark:text-white font-semibold">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
                ${input}
            </div>
        `;
        }).join('');
    }, 100);
}

function closeRecordModal() {
    document.getElementById('recordModal').classList.add('hidden');
    document.getElementById('recordFieldsContainer').innerHTML = '';
    editingRecordId = null;
}

function clearRecordForm() {
    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    sortedFields.forEach(field => {
        if (field.type === 'checkbox') {
            const checkbox = document.getElementById(`record_field_${field.id}`);
            if (checkbox) checkbox.checked = false;
        } else if (field.type === 'radio') {
            const radios = document.querySelectorAll(`input[name="record_field_${field.id}"]`);
            radios.forEach(radio => radio.checked = false);
        } else {
            const input = document.getElementById(`record_field_${field.id}`);
            if (input) input.value = '';
        }
    });
}

function saveRecordFromModal() {
    saveNewRecord();
}

async function saveNewRecord() {
    const canEdit = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
    if (!canEdit) {
        showNotification('No tienes permisos para crear registros', 'error');
        return;
    }

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        const fieldValues = {};
        sortedFields.forEach(field => {
            let value = '';
            if (field.type === 'checkbox') {
                const checkbox = document.getElementById(`record_field_${field.id}`);
                value = checkbox ? (checkbox.checked ? 'true' : 'false') : 'false';
            } else if (field.type === 'radio') {
                const radio = document.querySelector(`input[name="record_field_${field.id}"]:checked`);
                value = radio ? radio.value : '';
            } else {
                const input = document.getElementById(`record_field_${field.id}`);
                if (input) {
                    value = input.value || '';
                }
            }
            if (value !== '' || field.type === 'checkbox') {
                fieldValues[field.name] = value;
            }
        });

        const recordData = {
            fieldValues: fieldValues
        };

        const url = editingRecordId
            ? API_URL + '/sistemas/' + currentSystemId + '/registros/' + editingRecordId
            : API_URL + '/sistemas/' + currentSystemId + '/registros';
        const method = editingRecordId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(recordData)
        });

        if (response.ok) {
            const btnText = document.getElementById('btnSaveRecordModal');
            if (btnText) {
                btnText.textContent = 'Agregar';
            }
            closeRecordModal();
            await loadRecords();
            showNotification(editingRecordId ? 'Registro actualizado exitosamente' : 'Registro creado exitosamente', 'success');
            editingRecordId = null;
        } else {
            let errorMessage = 'Error al guardar registro';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            console.error('Error saving record:', errorMessage);
            showNotification('Error: ' + errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showNotification('Error: ' + (error.message || 'Error de conexión al guardar registro'), 'error');
    }
}

async function editRecord(recordId) {
    const canEdit = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
    if (!canEdit) {
        showNotification('No tienes permisos para editar registros', 'error');
        return;
    }

    const id = parseInt(recordId);
    const record = records.find(r => r.id === id);

    if (!record) {
        console.error('Record not found:', recordId);
        showNotification('Error: Registro no encontrado', 'error');
        return;
    }

    if (fields.length === 0) {
        await loadFields();
    }

    editingRecordId = id;
    const btnText = document.getElementById('btnSaveRecordModal');
    if (btnText) {
        btnText.innerHTML = '<span class="material-symbols-outlined">save</span><span>Guardar</span>';
    }
    showRecordModal('Editar Registro');

    const container = document.getElementById('recordFieldsContainer');
    container.innerHTML = '<p class="text-center">Cargando campos...</p>';

    if (fields.length === 0) {
        container.innerHTML = '<p class="text-center text-red-500">No hay campos definidos. Por favor, crea al menos un campo primero.</p>';
        return;
    }

    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    setTimeout(() => {
        container.innerHTML = sortedFields.map(field => {
            let currentValue = '';
            if (record && record.fieldValues && record.fieldValues[field.name] !== undefined && record.fieldValues[field.name] !== null) {
                currentValue = String(record.fieldValues[field.name]);
            }
            const escapedValue = currentValue.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let input = '';

            if (field.type === 'checkbox') {
                const checked = currentValue === 'true' || currentValue === '1' || currentValue === true;
                input = `
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="record_field_${field.id}" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" ${checked ? 'checked' : ''} ${field.required ? 'required' : ''}>
                        <span class="text-[#111418] dark:text-white">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</span>
                    </label>
                `;
            } else if (field.type === 'radio') {
                const options = field.options || [];
                if (options.length > 0) {
                    input = `
                        <div class="flex flex-wrap gap-3">
                            ${options.map((opt, idx) => {
                                const escapedOpt = String(opt).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                return `
                                <label class="flex items-center gap-2 cursor-pointer px-3 py-2 glass-card rounded-lg hover:bg-primary/10 transition-colors">
                                    <input type="radio" name="record_field_${field.id}" value="${escapedOpt}" class="w-4 h-4 text-primary focus:ring-primary" ${String(opt) === currentValue ? 'checked' : ''} ${field.required && idx === 0 ? 'required' : ''}>
                                    <span class="text-[#111418] dark:text-white text-sm">${opt}</span>
                                </label>
                            `;
                            }).join('')}
                        </div>
                    `;
                } else {
                    input = `<p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>`;
                }
            } else if (field.type === 'select') {
                const options = field.options || [];
                if (options.length > 0) {
                    input = `
                        <select id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''}>
                            <option value="" class="bg-white dark:bg-slate-800">Selecciona ${field.name.toLowerCase()}...</option>
                            ${options.map(opt => {
                                const escapedOpt = String(opt).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                return `<option value="${escapedOpt}" ${String(opt) === currentValue ? 'selected' : ''} class="bg-white dark:bg-slate-800">${opt}</option>`;
                            }).join('')}
                        </select>
                    `;
                } else {
                    input = `<p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>`;
                }
            } else if (field.type === 'textarea') {
                input = `<textarea id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" ${field.required ? 'required' : ''} rows="4" placeholder="Ingresa ${field.name.toLowerCase()}...">${escapedValue}</textarea>`;
            } else if (field.type === 'date') {
                input = `<input type="date" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${escapedValue}" ${field.required ? 'required' : ''}>`;
            } else if (field.type === 'datetime') {
                let datetimeValue = escapedValue;
                if (datetimeValue && datetimeValue.includes('T')) {
                    datetimeValue = datetimeValue.substring(0, 16);
                }
                input = `<input type="datetime-local" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${datetimeValue}" ${field.required ? 'required' : ''}>`;
            } else if (field.type === 'number') {
                input = `<input type="number" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${escapedValue}" ${field.required ? 'required' : ''} placeholder="Ingresa ${field.name.toLowerCase()}...">`;
            } else if (field.type === 'email') {
                input = `<input type="email" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${escapedValue}" ${field.required ? 'required' : ''} placeholder="ejemplo@email.com">`;
            } else if (field.type === 'url') {
                input = `<input type="url" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${escapedValue}" ${field.required ? 'required' : ''} placeholder="https://ejemplo.com">`;
            } else if (field.type === 'tel') {
                input = `<input type="tel" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${escapedValue}" ${field.required ? 'required' : ''} placeholder="+1234567890">`;
            } else {
                input = `<input type="text" id="record_field_${field.id}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" value="${escapedValue}" ${field.required ? 'required' : ''} placeholder="Ingresa ${field.name.toLowerCase()}...">`;
            }
            return `
                <div class="mb-4">
                    ${field.type !== 'checkbox' ? `<label class="block mb-2 text-[#111418] dark:text-white font-semibold">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
                    ${input}
                </div>
            `;
        }).join('');
    }, 100);
}

async function deleteRecord(recordId) {
    const userEmail = obtenerEmailDelUsuario();
    if (!userEmail) {
        showNotification('Error: No se pudo obtener el correo del usuario', 'error');
        return;
    }

    const deleteModal = document.createElement('div');
    deleteModal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    deleteModal.innerHTML = `
        <div class="glass-card p-8 rounded-xl max-w-md w-full shadow-2xl modal-enter">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-black text-[#111418] dark:text-white">Confirmar Eliminación</h2>
                <button onclick="this.closest('.fixed').remove()"
                    class="hover-smooth px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all">✕
                    Cerrar</button>
            </div>
            <p class="text-[#111418] dark:text-white mb-4">Para confirmar la eliminación, ingresa tu correo electrónico:</p>
            <div class="mb-4">
                <label class="block mb-2 font-semibold text-[#111418] dark:text-white">Correo Electrónico *</label>
                <input type="email" id="deleteConfirmEmail" placeholder="tu@email.com" autocomplete="off"
                    class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required>
            </div>
            <div class="flex gap-2 justify-end">
                <button onclick="confirmDeleteRecord(${recordId}, '${userEmail.replace(/'/g, "\\'")}')"
                    class="btn-primary-hover flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-red-600 text-white text-base font-bold shadow-lg hover:bg-red-700 transition-colors">
                    <span class="material-symbols-outlined">delete</span>
                    <span>Eliminar</span>
                </button>
                <button onclick="this.closest('.fixed').remove()"
                    class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-base font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <span class="material-symbols-outlined">close</span>
                    <span>Cancelar</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(deleteModal);
}

async function confirmDeleteRecord(recordId, userEmail) {
    const inputEmail = document.getElementById('deleteConfirmEmail').value.trim();
    
    if (!inputEmail) {
        showNotification('Por favor ingresa tu correo electrónico', 'error');
        return;
    }

    if (inputEmail.toLowerCase() !== userEmail.toLowerCase()) {
        showNotification('El correo electrónico no coincide', 'error');
        return;
    }

    const deleteModal = document.querySelector('.fixed.inset-0.bg-black\\/70');
    if (deleteModal) {
        deleteModal.remove();
    }

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/registros/' + recordId, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            await loadRecords();
            showNotification('Registro eliminado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al eliminar registro'), 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showNotification('Error al eliminar registro', 'error');
    }
}

function updateStatistics() {
    const totalRecords = records.length;
    const totalFields = fields.length;
    const today = new Date().toDateString();
    const recordsToday = records.filter(r => {
        const recordDate = new Date(r.createdAt).toDateString();
        return recordDate === today;
    }).length;
    const requiredFields = fields.filter(f => f.required === true).length;

    document.getElementById('statTotalRecords').textContent = totalRecords;
    document.getElementById('statTotalFields').textContent = totalFields;
    document.getElementById('statRecordsToday').textContent = recordsToday;
    document.getElementById('statRequiredFields').textContent = requiredFields;
}

function updateCharts() {
    if (charts.recordsByType) charts.recordsByType.destroy();
    if (charts.activity) charts.activity.destroy();
    if (charts.fieldsDistribution) charts.fieldsDistribution.destroy();
    if (charts.growth) charts.growth.destroy();

    const recordsByTypeCtx = document.getElementById('recordsByTypeChart');
    if (recordsByTypeCtx) {
        const typeCounts = {};
        records.forEach(record => {
            if (record.fieldValues) {
                Object.values(record.fieldValues).forEach(value => {
                    const type = typeof value;
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                });
            }
        });

        charts.recordsByType = new Chart(recordsByTypeCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#137fec', '#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e2e8f0'
                        }
                    }
                }
            }
        });
    }

    const activityCtx = document.getElementById('activityChart');
    if (activityCtx) {
        const last7Days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push(date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));
        }

        const activityData = last7Days.map(date => {
            return records.filter(r => {
                const recordDate = new Date(r.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                return recordDate === date;
            }).length;
        });

        charts.activity = new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Registros',
                    data: activityData,
                    borderColor: '#137fec',
                    backgroundColor: 'rgba(19, 127, 236, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e2e8f0'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#e2e8f0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#e2e8f0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    const fieldsDistributionCtx = document.getElementById('fieldsDistributionChart');
    if (fieldsDistributionCtx) {
        const typeCounts = {};
        fields.forEach(field => {
            typeCounts[field.type] = (typeCounts[field.type] || 0) + 1;
        });

        charts.fieldsDistribution = new Chart(fieldsDistributionCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#137fec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e2e8f0'
                        }
                    }
                }
            }
        });
    }

    const growthCtx = document.getElementById('growthChart');
    if (growthCtx) {
        const months = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            months.push(date.toLocaleDateString('es-ES', { month: 'short' }));
        }

        const growthData = months.map(month => {
            return records.filter(r => {
                const recordMonth = new Date(r.createdAt).toLocaleDateString('es-ES', { month: 'short' });
                return recordMonth === month;
            }).length;
        });

        charts.growth = new Chart(growthCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Registros',
                    data: growthData,
                    backgroundColor: '#137fec'
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e2e8f0'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#e2e8f0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#e2e8f0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
}


function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '-';
    }
}

let allSystemsList = [];

async function loadAllSystems() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const response = await fetch(API_URL + '/sistemas', {
            headers: headers
        });

        if (response.ok) {
            allSystemsList = await response.json();
        }
    } catch (error) {
        console.error('Error loading systems:', error);
    }
}

function showTransferFieldsModal() {
    const canManageFields = isOwner || userRole === 'owner' || userRole === 'admin';
    if (!canManageFields) {
        showNotification('No tienes permisos para transferir campos. Solo el owner y admin pueden gestionar campos.', 'error');
        return;
    }

    if (fields.length === 0) {
        showNotification('No hay campos para transferir', 'error');
        return;
    }

    loadAllSystems().then(() => {
        const modal = document.getElementById('transferFieldsModal');
        const targetSelect = document.getElementById('transferTargetSystem');
        const fieldsList = document.getElementById('transferFieldsList');

        targetSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';

        allSystemsList.forEach(system => {
            if (system.id !== currentSystemId) {
                const option = document.createElement('option');
                option.value = system.id;
                option.textContent = system.name;
                option.className = 'bg-white dark:bg-slate-800';
                targetSelect.appendChild(option);
            }
        });

        fieldsList.innerHTML = fields.map(field => `
            <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                <input type="checkbox" value="${field.id}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                <span class="text-[#111418] dark:text-white font-medium">${field.name}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-auto">${field.type}</span>
            </label>
        `).join('');

        modal.classList.remove('hidden');
    });
}

function closeTransferFieldsModal() {
    const modal = document.getElementById('transferFieldsModal');
    modal.classList.add('hidden');
    document.getElementById('transferTargetSystem').value = '';
    document.getElementById('transferFieldsList').innerHTML = '';
}

async function transferSelectedFields() {
    const targetSystemId = document.getElementById('transferTargetSystem').value;
    if (!targetSystemId) {
        showNotification('Por favor selecciona un sistema destino', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#transferFieldsList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para transferir', 'error');
        return;
    }

    const fieldIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/campos/transferir', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fieldIds: fieldIds,
                targetSystemId: parseInt(targetSystemId)
            })
        });

        if (response.ok) {
            closeTransferFieldsModal();
            await loadFields();
            showNotification('Campos transferidos exitosamente', 'success');
        } else {
            let errorMessage = 'Error al transferir campos';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            showNotification('Error: ' + errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error transferring fields:', error);
        showNotification('Error al transferir campos: ' + (error.message || 'Error de conexión'), 'error');
    }
}

let availableFieldsToImport = [];

async function showImportFieldsModal() {
    const canManageFields = isOwner || userRole === 'owner' || userRole === 'admin';
    if (!canManageFields) {
        showNotification('No tienes permisos para importar campos. Solo el owner y admin pueden gestionar campos.', 'error');
        return;
    }

    showLoadingScreen();

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            hideLoadingScreen();
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/campos/disponibles-importar', {
            headers: headers
        });

        if (!response.ok) {
            hideLoadingScreen();
            showNotification('Error al cargar sistemas disponibles', 'error');
            return;
        }

        availableFieldsToImport = await response.json();
        hideLoadingScreen();

        if (availableFieldsToImport.length === 0) {
            showNotification('No hay sistemas con campos disponibles para importar', 'error');
            return;
        }

        const modal = document.getElementById('importFieldsModal');
        const sourceSelect = document.getElementById('importSourceSystem');
        const fieldsList = document.getElementById('importFieldsList');

        sourceSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';

        availableFieldsToImport.forEach(system => {
            const option = document.createElement('option');
            option.value = system.systemId;
            option.textContent = system.systemName;
            option.className = 'bg-white dark:bg-slate-800';
            sourceSelect.appendChild(option);
        });

        sourceSelect.onchange = function () {
            const selectedSystemId = parseInt(this.value);
            const selectedSystem = availableFieldsToImport.find(s => s.systemId === selectedSystemId);

            if (selectedSystem && selectedSystem.fields) {
                fieldsList.innerHTML = selectedSystem.fields.map(field => `
                    <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                        <input type="checkbox" value="${field.id}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                        <div class="flex-1">
                            <span class="text-[#111418] dark:text-white font-medium">${field.name}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${field.type}</span>
                            ${field.required ? '<span class="text-xs text-red-500 ml-2">*Requerido</span>' : ''}
                        </div>
                    </label>
                `).join('');
            } else {
                fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">No hay campos disponibles</p>';
            }
        };

        fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema primero</p>';
        modal.classList.remove('hidden');
    } catch (error) {
        hideLoadingScreen();
        console.error('Error loading available fields:', error);
        showNotification('Error al cargar campos disponibles: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function closeImportFieldsModal() {
    const modal = document.getElementById('importFieldsModal');
    modal.classList.add('hidden');
    document.getElementById('importSourceSystem').value = '';
    document.getElementById('importFieldsList').innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema primero</p>';
}

async function importSelectedFields() {
    const sourceSystemId = document.getElementById('importSourceSystem').value;
    if (!sourceSystemId) {
        showNotification('Por favor selecciona un sistema origen', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#importFieldsList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para importar', 'error');
        return;
    }

    const fieldIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    const importAnimation = document.createElement('div');
    importAnimation.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    importAnimation.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Importando campos...</p>
        </div>
    `;
    document.body.appendChild(importAnimation);

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            importAnimation.remove();
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/campos/importar', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sourceSystemId: parseInt(sourceSystemId),
                fieldIds: fieldIds
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const transferredRecords = responseData.transferredRecords || 0;
            
            importAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">¡Campos importados exitosamente!</p>
                    ${transferredRecords > 0 ? `<p class="text-[#111418] dark:text-white text-sm mt-2">Se importaron ${transferredRecords} registros con datos</p>` : ''}
                </div>
            `;
            
            setTimeout(() => {
                importAnimation.remove();
                closeImportFieldsModal();
                loadFields();
                loadRecords();
                if (transferredRecords > 0) {
                    showNotification(`Campos y ${transferredRecords} registros importados exitosamente`, 'success');
                } else {
                    showNotification('Campos importados exitosamente', 'success');
                }
            }, 1500);
        } else {
            importAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">close</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">Error al importar campos</p>
                </div>
            `;

            let errorMessage = 'Error al importar campos';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }

            setTimeout(() => {
                importAnimation.remove();
                showNotification(errorMessage, 'error');
            }, 2000);
        }
    } catch (error) {
        importAnimation.remove();
        console.error('Error importing fields:', error);
        showNotification('Error al importar campos: ' + (error.message || 'Error de conexión'), 'error');
    }
}

async function showExportFieldsModal() {
    const canManageFields = isOwner || userRole === 'owner' || userRole === 'admin';
    if (!canManageFields) {
        showNotification('No tienes permisos para exportar campos. Solo el owner y admin pueden gestionar campos.', 'error');
        return;
    }

    if (fields.length === 0) {
        showNotification('No hay campos para exportar', 'error');
        return;
    }

    showLoadingScreen();

    try {
        await loadAllSystems();
        hideLoadingScreen();

        const modal = document.getElementById('exportFieldsModal');
        const targetSelect = document.getElementById('exportTargetSystem');
        const fieldsList = document.getElementById('exportFieldsList');

        targetSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';

        if (allSystemsList.length === 0) {
            hideLoadingScreen();
            showNotification('No hay sistemas disponibles para exportar campos', 'error');
            return;
        }

        allSystemsList.forEach(system => {
            if (system.id !== currentSystemId) {
                const option = document.createElement('option');
                option.value = system.id;
                option.textContent = system.name;
                option.className = 'bg-white dark:bg-slate-800';
                targetSelect.appendChild(option);
            }
        });

        fieldsList.innerHTML = fields.map(field => `
            <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                <input type="checkbox" value="${field.id}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                <div class="flex-1">
                    <span class="text-[#111418] dark:text-white font-medium">${field.name}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${field.type}</span>
                    ${field.required ? '<span class="text-xs text-red-500 ml-2">*Requerido</span>' : ''}
                </div>
            </label>
        `).join('');

        modal.classList.remove('hidden');
    } catch (error) {
        hideLoadingScreen();
        console.error('Error loading systems:', error);
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function closeExportFieldsModal() {
    const modal = document.getElementById('exportFieldsModal');
    modal.classList.add('hidden');
    document.getElementById('exportTargetSystem').value = '';
    document.getElementById('exportFieldsList').innerHTML = '';
}

async function exportSelectedFields() {
    const targetSystemId = document.getElementById('exportTargetSystem').value;
    if (!targetSystemId) {
        showNotification('Por favor selecciona un sistema destino', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#exportFieldsList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para exportar', 'error');
        return;
    }

    const fieldIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    const exportAnimation = document.createElement('div');
    exportAnimation.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    exportAnimation.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Exportando campos...</p>
        </div>
    `;
    document.body.appendChild(exportAnimation);

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            exportAnimation.remove();
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/campos/transferir', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fieldIds: fieldIds,
                targetSystemId: parseInt(targetSystemId)
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const transferredRecords = responseData.transferredRecords || 0;
            
            exportAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">¡Campos exportados exitosamente!</p>
                    ${transferredRecords > 0 ? `<p class="text-[#111418] dark:text-white text-sm mt-2">Se importaron ${transferredRecords} registros con datos</p>` : ''}
                </div>
            `;
            
            setTimeout(() => {
                exportAnimation.remove();
                closeExportFieldsModal();
                if (transferredRecords > 0) {
                    showNotification(`Campos y ${transferredRecords} registros exportados exitosamente`, 'success');
                    loadRecords();
                } else {
                    showNotification('Campos exportados exitosamente', 'success');
                }
            }, 1500);
        } else {
            exportAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">close</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">Error al exportar campos</p>
                </div>
            `;

            let errorMessage = 'Error al exportar campos';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }

            setTimeout(() => {
                exportAnimation.remove();
                showNotification('Error: ' + errorMessage, 'error');
            }, 2000);
        }
    } catch (error) {
        exportAnimation.innerHTML = `
            <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                    <span class="material-symbols-outlined text-white text-3xl">close</span>
                </div>
                <p class="text-[#111418] dark:text-white text-lg font-semibold">Error de conexión</p>
            </div>
        `;

        setTimeout(() => {
            exportAnimation.remove();
            console.error('Error exporting fields:', error);
            showNotification('Error al exportar campos: ' + (error.message || 'Error de conexión'), 'error');
        }, 2000);
    }
}

