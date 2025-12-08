checkAuth();

const urlParams = new URLSearchParams(window.location.search);
const systemId = urlParams.get('systemId');
const tableId = urlParams.get('tableId');

let systemTables = [];

async function init() {
    if (!systemId) {
        alert('ID de sistema no proporcionado');
        window.location.href = 'dashboard.html';
        return;
    }

    // Load tables for relation lookups
    await loadSystemTablesForRelations();

    if (tableId) {
        document.title = "Editar Tabla - Datium";
        document.querySelector('h1').innerText = "Editar Tabla";
        const submitBtn = document.getElementById('btnSubmit');
        if (submitBtn) {
            submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Actualizar Tabla';
        }
        await loadTableData();
    } else {
        // Add one initial empty row
        addNewFieldRow();
    }

    loadSidebarInfo();
}

function goBack() {
    window.location.href = `system.html?id=${systemId}`;
}

async function loadSystemTablesForRelations() {
    const res = await apiFetch(`/systems/${systemId}/tables`);
    if (res.ok) {
        systemTables = await res.json();
    }
}

async function loadTableData() {
    // 1. Get Table Details
    const res = await apiFetch(`/tables/${tableId}`);
    if (res.ok) {
        const table = await res.json();
        // Handle if map or entity
        document.getElementById('newTableName').value = table.name;
        document.getElementById('newTableDesc').value = table.description || '';
    }

    // 2. Get Fields
    const fieldsRes = await apiFetch(`/tables/${tableId}/fields`);
    if (fieldsRes.ok) {
        const fields = await fieldsRes.json();
        if (fields.length === 0) {
            addNewFieldRow();
        } else {
            for (const f of fields) {
                addNewFieldRow(f);
            }
        }
    }
}

function addNewFieldRow(fieldData = null) {
    const container = document.getElementById('newFieldsContainer');
    const div = document.createElement('div');
    // Tailwind Row Style
    div.className = 'bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-end animate-fade-in';

    div.innerHTML = `
        <div class="flex-1 min-w-[150px]">
            <input type="text" class="new-field-name w-full px-3 py-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm focus:ring-2 focus:ring-primary/50 dark:text-white" placeholder="Nombre Campo" required>
        </div>
        <div class="w-[140px]">
            <select class="new-field-type w-full px-3 py-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm focus:ring-2 focus:ring-primary/50 dark:text-white">
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="date">Fecha</option>
                <option value="boolean">Si/No</option>
                <option value="select">Lista (Select)</option>
                <option value="relation">Relación</option>
            </select>
        </div>
        
        <!-- Dynamic Options/Relation -->
        <div class="flex-1 min-w-[200px] flex gap-2" >
             <div class="field-options-container flex-1 hidden">
                <input type="text" class="new-field-options w-full px-3 py-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-sm dark:text-white" placeholder="Opciones: A, B, C">
            </div>
            <div class="field-relation-container flex-1 hidden gap-2">
                 <select class="new-field-rel-table w-1/2 px-2 py-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-xs dark:text-white">
                    <option value="">Tabla Destino...</option>
                    ${systemTables.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
                 <select class="new-field-rel-display w-1/2 px-2 py-2 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 text-xs dark:text-white" disabled>
                    <option value="">Campo Display...</option>
                </select>
            </div>
        </div>

        <div class="flex items-center gap-2 h-10">
            <label class="flex items-center cursor-pointer">
                <input type="checkbox" class="new-field-required form-checkbox rounded text-primary border-gray-300 dark:border-gray-600 bg-transparent focus:ring-0 w-4 h-4">
                <span class="ml-2 text-xs text-gray-500 font-medium">Req.</span>
            </label>
            <button onclick="this.closest('div').remove()" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar campo">
                <span class="material-symbols-outlined text-lg">delete</span>
            </button>
        </div>
    `;

    // Logic to toggle inputs
    const select = div.querySelector('.new-field-type');
    const optionsDiv = div.querySelector('.field-options-container');
    const relationDiv = div.querySelector('.field-relation-container');
    const relTableSelect = div.querySelector('.new-field-rel-table');
    const relDisplaySelect = div.querySelector('.new-field-rel-display');
    const optionsInput = div.querySelector('.new-field-options');
    const nameInput = div.querySelector('.new-field-name');
    const requiredCheck = div.querySelector('.new-field-required');

    const toggleType = (type) => {
        optionsDiv.classList.add('hidden');
        relationDiv.classList.add('hidden');
        relationDiv.classList.remove('flex');

        if (type === 'select') {
            optionsDiv.classList.remove('hidden');
        }
        if (type === 'relation') {
            relationDiv.classList.remove('hidden');
            relationDiv.classList.add('flex');
        }
    };

    select.addEventListener('change', (e) => toggleType(e.target.value));

    // Logic to load fields when table selected
    const loadRelFields = async (tId, selectedFieldId = null) => {
        if (!tId) return;
        relDisplaySelect.innerHTML = '<option value="">Cargando...</option>';
        relDisplaySelect.disabled = true;

        const res = await apiFetch(`/tables/${tId}/fields`);
        if (res.ok) {
            const fields = await res.json();
            relDisplaySelect.innerHTML = fields.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
            relDisplaySelect.disabled = false;
            // IMPORTANT: If we have a selectedFieldId, set it AFTER populating options.
            if (selectedFieldId) {
                relDisplaySelect.value = selectedFieldId;
            }
        }
    };

    relTableSelect.addEventListener('change', async (e) => {
        loadRelFields(e.target.value);
    });

    container.appendChild(div);

    // Pre-fill if data exists
    if (fieldData) {
        nameInput.value = fieldData.name;
        select.value = fieldData.type;
        requiredCheck.checked = fieldData.required;

        toggleType(fieldData.type);

        if (fieldData.type === 'select' && fieldData.options) {
            optionsInput.value = fieldData.options.join(', ');
        }
        if (fieldData.type === 'relation' && fieldData.relatedTableId) {
            relTableSelect.value = fieldData.relatedTableId;

            // Wait for fields to load to select display field
            loadRelFields(fieldData.relatedTableId).then(() => {
                // Determine which option to select.
                // If API returned relatedDisplayFieldId, use it.
                // If not, we have relatedFieldName. Sync by name.
                // SystemFieldResponse usually has relatedDisplayFieldId if mapped correctly?
                // Let's check DTO. SystemFieldResponse has `relatedFieldName` and `relatedTableId`.
                // It does NOT have `relatedDisplayFieldId` in my reading of it (Step 545).
                // Wait, Step 545 output:
                /*
                79:     private Integer relatedTableId;
                80:     private String relatedFieldName;
                */
                // It does NOT have `relatedDisplayFieldId`.
                // So I MUST select by TEXT.

                if (fieldData.relatedFieldName) {
                    for (let i = 0; i < relDisplaySelect.options.length; i++) {
                        if (relDisplaySelect.options[i].text === fieldData.relatedFieldName) {
                            relDisplaySelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            });
        }

        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.className = 'new-field-id';
        idInput.value = fieldData.id;
        div.appendChild(idInput);
    }
}

async function saveTable() {
    const name = document.getElementById('newTableName').value;
    const description = document.getElementById('newTableDesc').value;
    if (!name) return alert('El nombre es requerido');

    const fieldRows = document.getElementById('newFieldsContainer').children;
    let validationError = null;

    const fields = Array.from(fieldRows).map(row => {
        const nameInput = row.querySelector('.new-field-name');
        if (!nameInput) return null;

        const idInput = row.querySelector('.new-field-id'); // Get ID if exists
        const fieldId = idInput ? parseInt(idInput.value) : null;

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

            if (!tId) validationError = 'Debe seleccionar una Tabla Destino para los campos de tipo Relación.';
            // strict validation? yes
            if (tId) relatedTableId = parseInt(tId);
            if (fId) relatedDisplayFieldId = parseInt(fId);
        }

        return {
            id: fieldId, // Send ID
            name: nameInput.value,
            type: type,
            required: row.querySelector('.new-field-required').checked,
            orderIndex: 0,
            options: options,
            relatedTableId: relatedTableId,
            relatedDisplayFieldId: relatedDisplayFieldId
        };
    }).filter(f => f && f.name);

    if (validationError) return alert(validationError);

    if (tableId) {
        // Update Table (PUT)
        const res = await apiFetch(`/systems/${systemId}/tables/${tableId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description, fields }) // Include fields
        });

        if (res.ok) {
            alert('Tabla y campos actualizados correctamente.');
            window.location.href = `system.html?id=${systemId}`;
        } else {
            try {
                const errorData = await res.json();
                alert(errorData.message || errorData.error || 'Error actualizando tabla');
            } catch (e) {
                alert('Error actualizando tabla');
            }
        }
    } else {
        // Create Table (POST)
        const res = await apiFetch(`/systems/${systemId}/tables`, {
            method: 'POST',
            body: JSON.stringify({ name, description, fields })
        });

        if (res.ok) {
            window.location.href = `system.html?id=${systemId}`;
        } else {
            try {
                const errorData = await res.json();
                alert(errorData.message || 'Error creando tabla');
            } catch (e) {
                alert('Error creando tabla');
            }
        }
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
