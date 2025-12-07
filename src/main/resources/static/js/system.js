checkAuth();
const urlParams = new URLSearchParams(window.location.search);
const systemId = urlParams.get('id');
let systemTables = [];

async function init() {
    await loadTables();
}

async function loadTables() {
    const res = await apiFetch(`/systems/${systemId}/tables`);
    if (res.ok) {
        systemTables = await res.json();
        const container = document.getElementById('tablesList');
        container.innerHTML = systemTables.map(table => `
            <div class="col-md-4 mb-3">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary"><i class="bi bi-table"></i> ${table.name}</h5>
                        <p class="card-text text-muted small">${table.description || 'Sin descripción'}</p>
                        <div class="d-flex justify-content-between">
                            <a href="table.html?id=${table.id}" class="btn btn-outline-primary btn-sm stretched-link" style="position: relative; z-index: 1;">
                                Ver Datos
                            </a>
                            <button onclick="deleteTable(${table.id}); event.stopPropagation();" class="btn btn-link text-danger btn-sm" style="position: relative; z-index: 2;">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

async function deleteTable(id) {
    if (!confirm('¿Eliminar tabla? Se perderán todos los datos.')) return;
    // Endpoint matches Controller: /api/systems/{systemId}/tables/{tableId}
    const res = await apiFetch(`/systems/${systemId}/tables/${id}`, { method: 'DELETE' });
    if (res.ok) {
        loadTables();
    } else {
        alert('Error eliminando tabla');
    }
}

function addNewFieldRow() {
    const container = document.getElementById('newFieldsContainer');
    const div = document.createElement('div');
    div.className = 'card mb-2 p-2 bg-light border';
    div.innerHTML = `
        <div class="row g-2 align-items-center">
            <div class="col-md-3">
                <input type="text" class="form-control form-control-sm new-field-name" placeholder="Nombre Campo" required>
            </div>
            <div class="col-md-3">
                <select class="form-select form-select-sm new-field-type">
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Fecha</option>
                    <option value="boolean">Si/No</option>
                    <option value="select">Lista (Select)</option>
                    <option value="relation">Relación</option>
                </select>
            </div>
            <div class="col-md-4">
                 <!-- Options Input -->
                <div class="field-options-container" style="display:none;">
                    <input type="text" class="form-control form-control-sm new-field-options" placeholder="Opciones: A, B, C">
                </div>
                <!-- Relation Inputs -->
                <div class="field-relation-container row g-1" style="display:none;">
                    <div class="col-6">
                        <select class="form-select form-select-sm new-field-rel-table">
                            <option value="">Tabla Destino...</option>
                            ${systemTables.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-6">
                        <select class="form-select form-select-sm new-field-rel-display" disabled>
                            <option value="">Campo Display...</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="col-md-1 text-center">
                 <div class="form-check form-switch d-flex justify-content-center align-items-center">
                    <input class="form-check-input new-field-required" type="checkbox" id="req_${Date.now()}_${Math.random()}" title="¿Obligatorio?">
                    <label class="form-check-label ms-1 small" for="">Requerido</label>
                </div>
            </div>
            <div class="col-md-1 text-end">
                <button onclick="this.closest('.card').remove()" class="btn btn-outline-danger btn-sm">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;

    // Logic to toggle inputs
    const select = div.querySelector('.new-field-type');
    const optionsDiv = div.querySelector('.field-options-container');
    const relationDiv = div.querySelector('.field-relation-container');
    const relTableSelect = div.querySelector('.new-field-rel-table');
    const relDisplaySelect = div.querySelector('.new-field-rel-display');

    select.addEventListener('change', (e) => {
        optionsDiv.style.display = 'none';
        relationDiv.style.display = 'none';
        if (e.target.value === 'select') optionsDiv.style.display = 'block';
        if (e.target.value === 'relation') relationDiv.style.display = 'flex';
    });

    // Logic to load fields when table selected
    relTableSelect.addEventListener('change', async (e) => {
        const tableId = e.target.value;
        relDisplaySelect.innerHTML = '<option value="">Cargando...</option>';
        relDisplaySelect.disabled = true;
        if (!tableId) return;

        const res = await apiFetch(`/tables/${tableId}/fields`);
        if (res.ok) {
            const fields = await res.json();
            relDisplaySelect.innerHTML = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
            relDisplaySelect.disabled = false;
        }
    });

    container.appendChild(div);
}

async function createTable() {
    const name = document.getElementById('newTableName').value;
    const description = document.getElementById('newTableDesc').value;
    if (!name) return alert('El nombre es requerido');

    // Gather fields
    const fieldRows = document.querySelectorAll('#newFieldsContainer .card');
    let validationError = null;

    const fields = Array.from(fieldRows).map(row => {
        const type = row.querySelector('.new-field-type').value;
        let options = [];
        let relatedTableId = null;
        let relatedDisplayFieldId = null;

        if (type === 'select') {
            const optsStr = row.querySelector('.new-field-options').value;
            if (optsStr) options = optsStr.split(',').map(s => s.trim()).filter(s => s);
        } else if (type === 'relation') {
            const tId = row.querySelector('.new-field-rel-table').value;
            const fId = row.querySelector('.new-field-rel-display').value;

            if (!tId) {
                validationError = 'Debe seleccionar una Tabla Destino para los campos de tipo Relación.';
            } else if (!fId) {
                // Maybe optional? Let's make it strict for now.
                validationError = 'Debe seleccionar un Campo a Mostrar para la relación.';
            }

            if (tId) relatedTableId = parseInt(tId);
            if (fId) relatedDisplayFieldId = parseInt(fId);
        }

        return {
            name: row.querySelector('.new-field-name').value,
            type: type,
            required: row.querySelector('.new-field-required').checked,
            orderIndex: 0,
            options: options,
            relatedTableId: relatedTableId,
            relatedDisplayFieldId: relatedDisplayFieldId
        };
    }).filter(f => f.name);

    if (validationError) return alert(validationError);

    const res = await apiFetch(`/systems/${systemId}/tables`, {
        method: 'POST',
        body: JSON.stringify({ name, description, fields })
    });

    if (res.ok) {
        document.getElementById('newTableName').value = '';
        document.getElementById('newTableDesc').value = '';
        document.getElementById('newFieldsContainer').innerHTML = '';
        loadTables();
    } else {
        try {
            const errorData = await res.json();
            alert(errorData.message || 'Error creando tabla');
        } catch (e) {
            alert('Error creando tabla');
        }
    }
}

init();

