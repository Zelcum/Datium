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

document.addEventListener('DOMContentLoaded', function() {
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
        
        const token = getToken();
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
                    <div class="flex gap-2">
                        <button onclick="editField(${field.id})" class="hover-smooth px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-sm font-semibold">Editar</button>
                        <button onclick="deleteField(${field.id})" class="hover-smooth px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold">Eliminar</button>
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
    document.getElementById('btnSaveField').textContent = 'Guardar';
    document.getElementById('btnSaveField').onclick = () => saveNewField();
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
    const name = document.getElementById('newFieldName').value.trim();
    const type = document.getElementById('newFieldType').value;
    const required = document.getElementById('newFieldRequired').checked;
    const order = parseInt(document.getElementById('newFieldOrder').value) || 0;
    const optionsText = document.getElementById('newFieldOptions').value;
    const options = optionsText ? optionsText.split(',').map(o => o.trim()).filter(o => o) : [];
    
    if (!name) {
        showNotification('El nombre del campo es requerido', 'error');
        return;
    }
    
    if ((type === 'select' || type === 'radio') && options.length === 0) {
        showNotification('Los campos de selección y radio requieren al menos una opción', 'error');
        return;
    }
    
    showLoadingAnimation();
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            hideLoadingAnimation();
            return;
        }
        
        const fieldData = {
            name: name,
            type: type,
            required: required,
            orderIndex: order,
            options: options
        };
        
        const url = editingFieldId 
            ? API_URL + '/sistemas/' + currentSystemId + '/campos/' + editingFieldId
            : API_URL + '/sistemas/' + currentSystemId + '/campos';
        const method = editingFieldId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(fieldData)
        });
        
        if (response.ok) {
            showLoadingSuccess();
            setTimeout(() => {
                hideLoadingAnimation();
                cancelAddField();
                loadFields();
                showNotification(editingFieldId ? 'Campo actualizado exitosamente' : 'Campo creado exitosamente', 'success');
                editingFieldId = null;
            }, 1000);
        } else {
            hideLoadingAnimation();
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al guardar campo'), 'error');
        }
    } catch (error) {
        hideLoadingAnimation();
        console.error('Error saving field:', error);
        showNotification('Error al guardar campo', 'error');
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
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    
    editingFieldId = fieldId;
    document.getElementById('formTitle').textContent = 'Editar Campo';
    document.getElementById('btnSaveField').textContent = 'Actualizar';
    document.getElementById('btnSaveField').onclick = () => saveNewField();
    
    const nameInput = document.getElementById('newFieldName');
    const typeSelect = document.getElementById('newFieldType');
    const requiredCheckbox = document.getElementById('newFieldRequired');
    const orderInput = document.getElementById('newFieldOrder');
    const optionsInput = document.getElementById('newFieldOptions');
    
    if (nameInput) nameInput.value = field.name || '';
    if (typeSelect) typeSelect.value = field.type || 'text';
    if (requiredCheckbox) requiredCheckbox.checked = field.required || false;
    if (orderInput) orderInput.value = field.orderIndex || 0;
    if (optionsInput) optionsInput.value = field.options ? field.options.join(', ') : '';
    
    handleFieldTypeChange();
    document.getElementById('addFieldForm').classList.remove('hidden');
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
                <div class="flex gap-2 flex-wrap">
                    <button onclick="editRecord(${record.id})" class="hover-smooth px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all text-sm font-semibold">Editar</button>
                    <button onclick="deleteRecord(${record.id})" class="hover-smooth px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-semibold">Eliminar</button>
                    <button onclick="showAuditModal(${currentSystemId})" class="hover-smooth px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-sm font-semibold">Auditoría</button>
                </div>
            `;
        } else {
            tdActions.innerHTML = `
                <button onclick="showAuditModal(${currentSystemId})" class="hover-smooth px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all text-sm font-semibold">Auditoría</button>
            `;
        }
        row.appendChild(tdActions);
        tbody.appendChild(row);
    });
}

function openRecordsManagement() {
    if (fields.length === 0) {
        showNotification('Debes crear al menos un campo antes de gestionar registros', 'error');
        openFieldsModal();
        return;
    }
    
    showAddRecordForm();
}

function closeRecordsManagementModal() {
    document.getElementById('recordsManagementModal').classList.add('hidden');
    document.getElementById('recordsListContainer').innerHTML = '';
}

function loadRecordsForManagement() {
    const container = document.getElementById('recordsListContainer');
    if (!container) return;
    
    container.innerHTML = '<p class="text-center">Cargando registros...</p>';
    
    if (filteredRecords.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">No hay registros. Agrega tu primer registro.</p>';
        return;
    }
    
    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const canEdit = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
    
    container.innerHTML = filteredRecords.map(record => {
        const recordFields = sortedFields.map(field => {
            const value = record.fieldValues && record.fieldValues[field.name] ? record.fieldValues[field.name] : '-';
            return `
                <div class="mb-4">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">${field.name}</label>
                    <div class="px-4 py-3 bg-gray-50 border rounded">${value}</div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="border rounded-lg p-6 bg-white shadow-sm">
                <div class="flex justify-between items-start mb-6">
                    <h3 class="font-bold text-lg">Registro #${record.id}</h3>
                    ${canEdit ? `
                        <div class="flex gap-2">
                            <button onclick="editRecordFromManagement(${record.id})" class="px-4 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">Editar</button>
                            <button onclick="deleteRecord(${record.id})" class="px-4 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600">Eliminar</button>
                        </div>
                    ` : ''}
                </div>
                <div class="space-y-4">
                    ${recordFields}
                </div>
            </div>
        `;
    }).join('');
}

function editRecordFromManagement(recordId) {
    closeRecordsManagementModal();
    editRecord(recordId);
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
                input = `<div>
                    <label class="block mb-2 font-semibold text-gray-700">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    ${options.map((opt, idx) => `
                        <label class="flex items-center mr-4 mb-2">
                            <input type="radio" name="record_field_${field.id}" value="${opt}" class="mr-2" ${field.required && idx === 0 ? 'required' : ''}>
                            ${opt}
                        </label>
                    `).join('')}
                </div>`;
            } else {
                input = `<div>
                    <label class="block mb-2 font-semibold text-gray-700">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    <p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>
                </div>`;
            }
        } else if (field.type === 'select') {
            const options = field.options || [];
            if (options.length > 0) {
                input = `<select id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>
                    <option value="">Seleccionar...</option>
                    ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>`;
            } else {
                input = `<div>
                    <p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>
                </div>`;
            }
        } else if (field.type === 'textarea') {
            input = `<textarea id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''} rows="4"></textarea>`;
        } else if (field.type === 'date') {
            input = `<input type="date" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'datetime') {
            input = `<input type="datetime-local" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'number') {
            input = `<input type="number" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'email') {
            input = `<input type="email" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'url') {
            input = `<input type="url" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'tel') {
            input = `<input type="tel" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        } else {
            input = `<input type="text" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>`;
        }
        return `
            <div class="mb-4">
                ${field.type !== 'checkbox' ? `<label class="block mb-2 font-semibold text-gray-700">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
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
                value = input ? input.value : '';
            }
            fieldValues[field.name] = value;
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
            if (document.getElementById('recordsManagementModal') && !document.getElementById('recordsManagementModal').classList.contains('hidden')) {
                loadRecordsForManagement();
            }
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al guardar registro'), 'error');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        showNotification('Error al guardar registro', 'error');
    }
}

async function editRecord(recordId) {
    const canEdit = isOwner || userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
    if (!canEdit) {
        showNotification('No tienes permisos para editar registros', 'error');
        return;
    }
    
    await loadFields();
    
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    
    editingRecordId = recordId;
    const btnText = document.getElementById('btnSaveRecordModal');
    if (btnText) {
        btnText.textContent = 'Guardar';
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
        const currentValue = record.fieldValues && record.fieldValues[field.name] ? record.fieldValues[field.name] : '';
        let input = '';
        
        if (field.type === 'checkbox') {
            const checked = currentValue === 'true' || currentValue === true;
            input = `<label class="flex items-center">
                <input type="checkbox" id="record_field_${field.id}" class="mr-2" ${checked ? 'checked' : ''} ${field.required ? 'required' : ''}>
                ${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}
            </label>`;
        } else if (field.type === 'radio') {
            const options = field.options || [];
            if (options.length > 0) {
                input = `<div>
                    <label class="block mb-2 font-semibold text-gray-700">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    ${options.map((opt, idx) => `
                        <label class="flex items-center mr-4 mb-2">
                            <input type="radio" name="record_field_${field.id}" value="${opt}" class="mr-2" ${opt === currentValue ? 'checked' : ''} ${field.required && idx === 0 ? 'required' : ''}>
                            ${opt}
                        </label>
                    `).join('')}
                </div>`;
            } else {
                input = `<div>
                    <label class="block mb-2 font-semibold text-gray-700">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    <p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>
                </div>`;
            }
        } else if (field.type === 'select') {
            const options = field.options || [];
            if (options.length > 0) {
                input = `<select id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''}>
                    <option value="">Seleccionar...</option>
                    ${options.map(opt => `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>`;
            } else {
                input = `<div>
                    <p class="text-sm text-red-500">Este campo requiere opciones. Por favor, edita el campo para agregar opciones.</p>
                </div>`;
            }
        } else if (field.type === 'textarea') {
            input = `<textarea id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" ${field.required ? 'required' : ''} rows="4">${currentValue}</textarea>`;
        } else if (field.type === 'date') {
            input = `<input type="date" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'datetime') {
            input = `<input type="datetime-local" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'number') {
            input = `<input type="number" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'email') {
            input = `<input type="email" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'url') {
            input = `<input type="url" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        } else if (field.type === 'tel') {
            input = `<input type="tel" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        } else {
            input = `<input type="text" id="record_field_${field.id}" class="w-full px-4 py-2 border rounded" value="${currentValue}" ${field.required ? 'required' : ''}>`;
        }
        return `
            <div class="mb-4">
                ${field.type !== 'checkbox' ? `<label class="block mb-2 font-semibold text-gray-700">${field.name} ${field.required ? '<span class="text-red-500">*</span>' : ''}</label>` : ''}
                ${input}
            </div>
        `;
    }).join('');
    }, 100);
}

async function deleteRecord(recordId) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentSystemId + '/registros/' + recordId, {
            method: 'DELETE',
            headers: headers
        });
        
        if (response.ok) {
            await loadRecords();
            if (document.getElementById('recordsManagementModal') && !document.getElementById('recordsManagementModal').classList.contains('hidden')) {
                loadRecordsForManagement();
            }
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

function showAuditModal(systemId) {
    currentAuditSystemId = systemId;
    const modal = document.getElementById('auditModal');
    if (modal) {
        modal.classList.remove('hidden');
        const searchInput = document.getElementById('auditSearchInput');
        const typeSelect = document.getElementById('auditTypeSelect');
        if (searchInput) searchInput.value = '';
        if (typeSelect) typeSelect.value = 'logs';
        loadAuditData();
    }
}

function hideAuditModal() {
    const modal = document.getElementById('auditModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentAuditSystemId = null;
}

let currentAuditSystemId = null;

async function loadAuditData() {
    if (!currentAuditSystemId) return;
    
    const auditType = document.getElementById('auditTypeSelect')?.value || 'logs';
    const search = document.getElementById('auditSearchInput')?.value.trim() || '';
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        let url;
        if (search) {
            url = `http://localhost:8080/api/auditoria/sistema/${currentAuditSystemId}/${auditType === 'logs' ? 'logs/buscar' : 'seguridad/buscar'}?search=${encodeURIComponent(search)}`;
        } else {
            url = `http://localhost:8080/api/auditoria/sistema/${currentAuditSystemId}/${auditType === 'logs' ? 'logs' : 'seguridad'}`;
        }
        
        const response = await fetch(url, {
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            renderAuditTable(data, auditType);
        }
    } catch (error) {
        console.error('Error loading audit data:', error);
    }
}

function renderAuditTable(items, type) {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay registros</td></tr>';
        return;
    }
    
    items.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors';
        if (type === 'logs') {
            row.innerHTML = `
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${formatDate(item.createdAt)}</td>
                <td class="px-6 py-4 text-[#111418] dark:text-white">${item.userName || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.action || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.details || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.ip || '-'}</td>
            `;
        } else {
            const severityColor = item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
            row.innerHTML = `
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${formatDate(item.createdAt)}</td>
                <td class="px-6 py-4 text-[#111418] dark:text-white">${item.userName || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.event || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.details || '-'}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-lg text-white text-sm font-semibold ${severityColor}">${item.severity || '-'}</span>
                </td>
            `;
        }
        tbody.appendChild(row);
    });
}

function searchAudit() {
    if (!currentAuditSystemId) {
        currentAuditSystemId = currentSystemId;
    }
    loadAuditData();
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

