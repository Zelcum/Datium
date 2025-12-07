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
    loadData();
    setupEventListeners();
}

async function getSystemId() {
    if (currentSystemId) return currentSystemId;
    try {
        const res = await apiFetch(`/tables/${tableId}`);
        if (res.ok) {
            const table = await res.json();
            currentSystemId = table.systemId;
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
        await resolveForeignKeys(records); // Logic inside resolves and calls renderTableBody
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
            <th>ID</th>
            ${currentFields.map(f => `<th>${f.name}</th>`).join('')}
            <th>Creado</th>
            <th>Acciones</th>
        </tr>
    `;
}

let editingRecordId = null;
let currentRecords = [];

function renderTableBody(records) {
    currentRecords = records;
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = records.map(r => `
        <tr>
            <td>${r.id}</td>
            ${currentFields.map(f => {
        let val = r.fieldValues[f.name] || '';
        if (f.relatedTableId && relationCache[f.relatedTableId]) {
            val = relationCache[f.relatedTableId][val] || val;
        }
        return `<td>${val}</td>`;
    }).join('')}
            <td>${new Date(r.createdAt).toLocaleString()}</td>
            <td>
                <button onclick="editRecord(${r.id})" class="btn btn-sm btn-outline-primary me-1">
                    <i class="bi bi-pencil"></i>
                </button>
                <button onclick="deleteRecord(${r.id})" class="btn btn-sm btn-outline-danger">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editRecord(id) {
    const record = currentRecords.find(r => r.id === id);
    if (!record) return;

    editingRecordId = id;
    document.getElementById('formTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Registro #' + id;
    document.getElementById('btnSave').innerHTML = '<i class="bi bi-check-lg"></i> Actualizar';
    document.getElementById('btnCancel').style.display = 'inline-block';

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
    document.getElementById('formTitle').innerHTML = '<i class="bi bi-file-earmark-plus"></i> Agregar Registro';
    document.getElementById('btnSave').innerHTML = '<i class="bi bi-save"></i> Guardar Registro';
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
        container.innerHTML = '<div class="col-12 text-center text-muted">No hay campos definidos aún.</div>';
        return;
    }

    const htmlPromises = currentFields.map(async f => {
        let inputHtml = '';
        if (f.type === 'select') {
            const opts = f.options || [];
            inputHtml = `
                <select id="field_${f.id}" class="form-select">
                    <option value="">Seleccionar...</option>
                    ${opts.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
        } else if (f.type === 'boolean') {
            inputHtml = `
                <select id="field_${f.id}" class="form-select">
                    <option value="">Seleccionar...</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                </select>
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
                    <input type="text" class="form-control" id="search_field_${f.id}" placeholder="Buscar..." 
                           autocomplete="off" onfocus="showRelationOptions(${f.id})" 
                           oninput="filterRelationOptions(${f.id})" 
                           onblur="setTimeout(() => hideRelationOptions(${f.id}), 200)">
                    <input type="hidden" id="field_${f.id}">
                    <div id="list_field_${f.id}" class="list-group position-absolute w-100 shadow overflow-auto" 
                         style="max-height: 200px; z-index: 1050; display: none;" data-options="${safeOptions}"></div>
                </div>
            `;
        } else {
            inputHtml = `<input type="${getInputType(f.type)}" id="field_${f.id}" class="form-control" placeholder="${f.name}">`;
        }

        return `
            <div class="col-md-6 col-lg-4">
                <label class="form-label small fw-bold">${f.name}</label>
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
        list.innerHTML = '<div class="list-group-item text-muted small">No se encontraron resultados</div>';
        return;
    }
    list.innerHTML = options.map(o => `
        <a href="javascript:void(0)" class="list-group-item list-group-item-action" 
           onclick="selectRelationOption(${fieldId}, '${o.id}', '${o.val.replace(/'/g, "\\'")}')">
           ${o.val} <small class="text-muted ms-2">#${o.id}</small>
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

function setupEventListeners() {
    const fieldType = document.getElementById('fieldType');
    const relTableSelect = document.getElementById('relTableSelect');
    fieldType.addEventListener('change', async () => {
        const type = fieldType.value;
        document.getElementById('fieldOptionsDiv').style.display = type === 'select' ? 'block' : 'none';
        document.getElementById('fieldRelationDiv').style.display = type === 'relation' ? 'block' : 'none';
        if (type === 'relation') {
            const sysId = await getSystemId();
            if (sysId && relTableSelect.options.length <= 1) {
                try {
                    const res = await apiFetch(`/systems/${sysId}/tables`);
                    if (res.ok) {
                        const tables = await res.json();
                        relTableSelect.innerHTML = '<option value="">Tabla Destino...</option>' +
                            tables.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }
    });
    relTableSelect.addEventListener('change', async (e) => {
        const tId = e.target.value;
        const displaySelect = document.getElementById('relDisplaySelect');
        displaySelect.disabled = true;
        displaySelect.innerHTML = '<option>Cargando...</option>';
        if (tId) {
            const res = await apiFetch(`/tables/${tId}/fields`);
            if (res.ok) {
                const fields = await res.json();
                displaySelect.innerHTML = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
                displaySelect.disabled = false;
            }
        }
    });
}

async function addField() {
    const name = document.getElementById('fieldName').value;
    const type = document.getElementById('fieldType').value;
    const required = document.getElementById('fieldRequired').checked;
    const payload = { name, type, required };
    if (type === 'select') {
        const optsStr = document.getElementById('fieldOptions').value;
        if (optsStr) payload.options = optsStr.split(',').map(s => s.trim()).filter(s => s);
    } else if (type === 'relation') {
        const tId = document.getElementById('relTableSelect').value;
        const fId = document.getElementById('relDisplaySelect').value;
        if (!tId || !fId) return alert('Configure la relación completa');
        payload.relatedTableId = parseInt(tId);
        payload.relatedDisplayFieldId = parseInt(fId);
    }
    if (!name) return alert('Nombre requerido');
    const res = await apiFetch(`/tables/${tableId}/fields`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        document.getElementById('fieldName').value = '';
        document.getElementById('fieldOptions').value = '';
        loadData();
    } else {
        alert('Error al agregar campo');
    }
}

init();
