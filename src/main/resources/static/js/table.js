checkAuth();
const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('id');
let currentSystemId = null;
let currentFields = [];
const relationCache = {};

function goBack() {
    window.history.back();
}

async function init() {
    await getSystemId();
    await loadData();
    // setupEventListeners(); // Removed

    loadSidebarInfo();
}

async function getSystemId() {
    if (currentSystemId) return currentSystemId;
    try {
        const res = await apiFetch(`/tables/${tableId}`);
        if (res.ok) {
            const table = await res.json();
            currentSystemId = table.systemId;
            const nameEl = document.getElementById('tableName');
            if (nameEl) nameEl.innerText = table.name || 'Tabla sin nombre';
            return currentSystemId;
        }
    } catch (e) { console.error(e); }
    return null;
}

async function loadData() {
    const fieldsRes = await apiFetch(`/tables/${tableId}/fields`);
    if (fieldsRes.ok) {
        currentFields = await fieldsRes.json();
        renderTableHead();
        await renderRecordForm();
    }

    const recordsRes = await apiFetch(`/tables/${tableId}/records`);
    if (recordsRes.ok) {
        const records = await recordsRes.json();
        await resolveForeignKeys(records);
    }
}

async function resolveForeignKeys(records) {
    const relationFields = currentFields.filter(f => f.relatedTableId);

    for (const field of relationFields) {
        if (!relationCache[field.relatedTableId]) {
            const res = await apiFetch(`/tables/${field.relatedTableId}/records`);
            if (res.ok) {
                const relatedRecords = await res.json();
                const map = {};
                relatedRecords.forEach(r => {
                    const displayVal = field.relatedFieldName ? r.fieldValues[field.relatedFieldName] : r.id;
                    map[r.id] = displayVal;
                });
                relationCache[field.relatedTableId] = map;
            }
        }
    }
    renderTableBody(records);
}

function renderTableHead() {
    const thead = document.getElementById('tableHead');
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 font-bold text-gray-500 dark:text-gray-400">ID</th>
            ${currentFields.map(f => `<th class="px-6 py-3 font-bold text-gray-500 dark:text-gray-400">${f.name}</th>`).join('')}
            <th class="px-6 py-3 font-bold text-gray-500 dark:text-gray-400">Acciones</th>
        </tr>
    `;
}

let editingRecordId = null;
let currentRecords = [];

function renderTableBody(records) {
    currentRecords = records;
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = records.map(r => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">#${r.id}</td>
            ${currentFields.map(f => {
        let val = r.fieldValues[f.name] || '';
        if (f.relatedTableId && relationCache[f.relatedTableId]) {
            val = relationCache[f.relatedTableId][val] || val;
        }
        return `<td class="px-6 py-4">${val}</td>`;
    }).join('')}
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editRecord(${r.id})" class="text-blue-500 hover:text-blue-600 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="deleteRecord(${r.id})" class="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editRecord(id) {
    const record = currentRecords.find(r => r.id === id);
    if (!record) return;

    editingRecordId = id;
    document.getElementById('formTitle').innerHTML = 'Editar Registro';
    document.getElementById('btnSave').innerHTML = '<span class="material-symbols-outlined">check_circle</span> Actualizar';
    document.getElementById('btnCancel').style.display = 'block';

    currentFields.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        const val = record.fieldValues[f.name];

        if (f.type === 'relation') {
            if (el) el.value = val;
            const searchEl = document.getElementById(`search_field_${f.id}`);
            if (searchEl && relationCache[f.relatedTableId]) {
                searchEl.value = relationCache[f.relatedTableId][val] || val || '';
            }
        } else {
            if (el) el.value = val || '';
        }
    });

    document.getElementById('recordFormCard').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    editingRecordId = null;
    document.getElementById('formTitle').innerText = 'Agregar Registro';
    document.getElementById('btnSave').innerHTML = '<span class="material-symbols-outlined">save</span> Guardar Registro';
    document.getElementById('btnCancel').style.display = 'none';

    currentFields.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        const searchEl = document.getElementById(`search_field_${f.id}`);
        if (el) el.value = '';
        if (searchEl) searchEl.value = '';
    });
}

async function saveRecord() {
    const fieldValues = {};
    currentFields.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        const val = el ? el.value : null;
        fieldValues[f.id] = val;
    });

    const method = editingRecordId ? 'PUT' : 'POST';
    const url = editingRecordId
        ? `/tables/${tableId}/records/${editingRecordId}`
        : `/tables/${tableId}/records`;

    const res = await apiFetch(url, {
        method: method,
        body: JSON.stringify({ values: fieldValues })
    });

    if (res.ok) {
        cancelEdit();
        loadData();
    } else {
        try {
            const errorData = await res.json();
            alert(errorData.message || errorData.error || await res.text());
        } catch (e) {
            const err = await res.text();
            alert('Error al guardar: ' + err);
        }
    }
}

async function deleteRecord(id) {
    if (!confirm('¿Eliminar registro?')) return;
    const res = await apiFetch(`/tables/${tableId}/records/${id}`, { method: 'DELETE' });
    if (res.ok) {
        loadData();
    } else {
        alert('Error eliminando registro');
    }
}

async function renderRecordForm() {
    const container = document.getElementById('recordForm');
    if (currentFields.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center text-gray-400 py-4">No hay campos definidos aún.</div>';
        return;
    }

    const htmlPromises = currentFields.map(async f => {
        let inputHtml = '';
        const baseInputClass = "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white placeholder-gray-400";

        if (f.type === 'select') {
            const opts = f.options || [];
            inputHtml = `
                <div class="relative">
                    <select id="field_${f.id}" class="${baseInputClass} appearance-none cursor-pointer">
                        <option value="">Seleccionar...</option>
                        ${opts.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                        <span class="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                </div>
            `;
        } else if (f.type === 'boolean') {
            inputHtml = `
                <div class="relative">
                    <select id="field_${f.id}" class="${baseInputClass} appearance-none cursor-pointer">
                        <option value="">Seleccionar...</option>
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                        <span class="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                </div>
            `;
        } else if (f.type === 'relation') {
            let options = [];
            if (f.relatedTableId) {
                if (!relationCache[f.relatedTableId]) {
                    try {
                        const res = await apiFetch(`/tables/${f.relatedTableId}/records`);
                        if (res.ok) {
                            const recs = await res.json();
                            const map = {};
                            recs.forEach(r => {
                                const val = f.relatedFieldName ? r.fieldValues[f.relatedFieldName] : r.id;
                                map[r.id] = val;
                            });
                            relationCache[f.relatedTableId] = map;
                            options = Object.entries(map).map(([id, val]) => ({ id, val }));
                        }
                    } catch (err) { console.error(err); }
                } else {
                    options = Object.entries(relationCache[f.relatedTableId]).map(([id, val]) => ({ id, val }));
                }
            }
            const safeOptions = JSON.stringify(options).replace(/"/g, '&quot;');
            inputHtml = `
                <div class="position-relative relation-search-container">
                    <input type="text" class="${baseInputClass}" id="search_field_${f.id}" placeholder="Buscar..." 
                           autocomplete="off" onfocus="showRelationOptions(${f.id})" 
                           oninput="filterRelationOptions(${f.id})" 
                           onblur="setTimeout(() => hideRelationOptions(${f.id}), 200)">
                    <input type="hidden" id="field_${f.id}">
                    <div id="list_field_${f.id}" class="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-auto z-50" 
                         style="max-height: 200px; display: none;" data-options="${safeOptions}"></div>
                </div>
            `;
        } else {
            inputHtml = `<input type="${getInputType(f.type)}" id="field_${f.id}" class="${baseInputClass}" placeholder="${f.name}">`;
        }

        return `
            <div class="col-span-1">
                <label class="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">${f.name}</label>
                ${inputHtml}
            </div>
        `;
    });

    const htmlParts = await Promise.all(htmlPromises);
    container.innerHTML = htmlParts.join('');
}

function showRelationOptions(fieldId) {
    const list = document.getElementById(`list_field_${fieldId}`);
    const data = JSON.parse(list.dataset.options || '[]');
    renderRelationOptions(fieldId, data);
    list.style.display = 'block';
}

function hideRelationOptions(fieldId) {
    const list = document.getElementById(`list_field_${fieldId}`);
    if (list) list.style.display = 'none';
}

function filterRelationOptions(fieldId) {
    const text = document.getElementById(`search_field_${fieldId}`).value.toLowerCase();
    const list = document.getElementById(`list_field_${fieldId}`);
    const data = JSON.parse(list.dataset.options || '[]');
    const filtered = data.filter(d => String(d.val).toLowerCase().includes(text) || String(d.id).includes(text));
    renderRelationOptions(fieldId, filtered);
    list.style.display = 'block';
}

function renderRelationOptions(fieldId, options) {
    const list = document.getElementById(`list_field_${fieldId}`);
    if (options.length === 0) {
        list.innerHTML = '<div class="p-3 text-gray-500 text-sm">No se encontraron resultados</div>';
        return;
    }
    list.innerHTML = options.map(o => `
        <a href="javascript:void(0)" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
           onclick="selectRelationOption(${fieldId}, '${o.id}', '${o.val.replace(/'/g, "\\'")}')">
           ${o.val} <span class="text-xs text-gray-400 ml-2">#${o.id}</span>
        </a>
    `).join('');
}

function selectRelationOption(fieldId, id, val) {
    document.getElementById(`field_${fieldId}`).value = id;
    document.getElementById(`search_field_${fieldId}`).value = val;
    hideRelationOptions(fieldId);
}

function getInputType(type) {
    if (type === 'number') return 'number';
    if (type === 'date') return 'date';
    return 'text';
}

async function exportTable(format = 'csv') {
    try {
        const res = await apiFetch(`/tables/${tableId}/export?format=${format}`);
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tabla_${tableId}.${format}`; // Fallback filename
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            alert('Error exportando tabla (' + format + ')');
        }
    } catch (e) {
        console.error(e);
        alert('Error exportando tabla');
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
