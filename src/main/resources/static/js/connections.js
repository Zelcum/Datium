checkAuth();

let allSystems = [];

async function init() {
    await loadSystems();
}

async function loadSystems() {
    showLoading('Cargando sistemas...');
    try {
        const res = await apiFetch('/systems');
        if (res.ok) {
            allSystems = await res.json();
            populateSystemSelects();
        } else {
            showError('Error cargando sistemas');
        }
    } catch (e) {
        showError('Error de conexión');
    } finally {
        hideLoading();
    }
}

function populateSystemSelects() {
    const sourceSelect = document.getElementById('sourceSystemSelect');
    const targetSelect = document.getElementById('targetSystemSelect');

    sourceSelect.innerHTML = '<option value="">Seleccionar Sistema...</option>';
    targetSelect.innerHTML = '<option value="">Seleccionar Sistema...</option>';

    allSystems.forEach(sys => {
        const option = `<option value="${sys.id}">${sys.name}</option>`;
        sourceSelect.innerHTML += option;
        targetSelect.innerHTML += option;
    });
}

async function loadSourceTables() {
    const sourceSystemId = document.getElementById('sourceSystemSelect').value;
    const tableSelect = document.getElementById('tableSelect');
    const tableInfo = document.getElementById('tableInfo');
    const moveButton = document.getElementById('moveButton');

    tableSelect.innerHTML = '<option value="">Cargando tablas...</option>';
    tableSelect.disabled = true;
    tableInfo.classList.add('hidden');
    moveButton.disabled = true;

    if (!sourceSystemId) {
        tableSelect.innerHTML = '<option value="">Primero selecciona un sistema...</option>';
        return;
    }

    try {
        const res = await apiFetch(`/systems/${sourceSystemId}/tables`);
        if (res.ok) {
            const tables = await res.json();

            if (tables.length === 0) {
                tableSelect.innerHTML = '<option value="">Sin tablas disponibles</option>';
            } else {
                tableSelect.innerHTML = '<option value="">Seleccionar Tabla...</option>';
                tables.forEach(table => {
                    tableSelect.innerHTML += `<option value="${table.id}">${table.name}</option>`;
                });
                tableSelect.disabled = false;
            }
        } else {
            showError('Error cargando tablas');
            tableSelect.innerHTML = '<option value="">Error carga</option>';
        }
    } catch (e) {
        showError('Error de conexión');
        tableSelect.innerHTML = '<option value="">Error</option>';
    }
}

// Enable button when all defined
document.getElementById('sourceSystemSelect').addEventListener('change', checkMoveButtonState);
document.getElementById('targetSystemSelect').addEventListener('change', checkMoveButtonState);
document.getElementById('tableSelect').addEventListener('change', checkMoveButtonState);

function checkMoveButtonState() {
    const s = document.getElementById('sourceSystemSelect').value;
    const t = document.getElementById('targetSystemSelect').value;
    const tbl = document.getElementById('tableSelect').value;
    const btn = document.getElementById('moveButton');

    // Prevent moving to same system
    if (s && t && s === t) {
        // Optionally show warning
        btn.disabled = true;
        return;
    }

    btn.disabled = !(s && t && tbl);

    updateVisuals();
}

function updateVisuals() {
    const sSelect = document.getElementById('sourceSystemSelect');
    const tSelect = document.getElementById('targetSystemSelect');
    const tblSelect = document.getElementById('tableSelect');

    const sId = sSelect.value;
    const tId = tSelect.value;
    const tblId = tblSelect.value;

    const sSystem = allSystems.find(sys => String(sys.id) === String(sId));
    const tSystem = allSystems.find(sys => String(sys.id) === String(tId));

    // Update Source Visuals
    const sLogo = document.getElementById('visualSourceLogo');
    const sName = document.getElementById('visualSourceName');
    if (sSystem) {
        sLogo.src = sSystem.imageUrl || 'img/Isotipo modo claro.jpeg';
        sLogo.classList.remove('opacity-50', 'grayscale');
        sName.innerText = sSystem.name;
        sName.classList.remove('text-gray-400');
        sName.classList.add('text-[#111418]', 'dark:text-white');
    } else {
        sLogo.src = 'img/Isotipo modo claro.jpeg';
        sLogo.classList.add('opacity-50', 'grayscale');
        sName.innerText = 'Selecciona Origen';
        sName.classList.add('text-gray-400');
    }

    // Update Target Visuals
    const tLogo = document.getElementById('visualTargetLogo');
    const tName = document.getElementById('visualTargetName');
    if (tSystem) {
        tLogo.src = tSystem.imageUrl || 'img/Isotipo modo claro.jpeg';
        tLogo.classList.remove('opacity-50', 'grayscale');
        tName.innerText = tSystem.name;
        tName.classList.remove('text-gray-400');
        tName.classList.add('text-[#111418]', 'dark:text-white');
    } else {
        tLogo.src = 'img/Isotipo modo claro.jpeg';
        tLogo.classList.add('opacity-50', 'grayscale');
        tName.innerText = 'Selecciona Destino';
        tName.classList.add('text-gray-400');
    }

    // Update Table Visual
    const tblContainer = document.getElementById('visualTableContainer');
    const tblName = document.getElementById('visualTableName');

    if (tblId) {
        const tblText = tblSelect.options[tblSelect.selectedIndex].text;
        tblName.innerText = tblText;
        tblName.classList.remove('text-gray-500');
        tblName.classList.add('text-primary', 'font-bold');
        tblContainer.classList.remove('opacity-50');
        tblContainer.classList.add('bg-blue-50', 'dark:bg-blue-900/10', 'border-blue-200', 'dark:border-blue-800');
    } else {
        tblName.innerText = 'Ninguna tabla seleccionada';
        tblName.classList.add('text-gray-500');
        tblName.classList.remove('text-primary', 'font-bold');
        tblContainer.classList.add('opacity-50');
        tblContainer.classList.remove('bg-blue-50', 'dark:bg-blue-900/10', 'border-blue-200', 'dark:border-blue-800');
    }
}


function confirmMove() {
    showConfirm('¿Estás seguro de mover esta tabla? Las relaciones existentes se eliminarán.', async () => {
        showLoading('Moviendo tabla...');
        try {
            // Use PUT endpoint
            const tableId = document.getElementById('tableSelect').value;
            const targetSystemId = document.getElementById('targetSystemSelect').value;
            const res = await apiFetch(`/tables/${tableId}/move?targetSystemId=${targetSystemId}`, {
                method: 'PUT'
            });

            if (res.ok) {
                showSuccess('Tabla movida exitosamente', () => {
                    // Refresh source tables
                    loadSourceTables();
                    // Reset fields
                    document.getElementById('tableSelect').value = "";
                    document.getElementById('targetSystemSelect').value = "";
                    checkMoveButtonState();
                });
            } else {
                const err = await res.json();
                showError(err.message || 'Error al mover la tabla');
            }
        } catch (e) {
            console.error(e);
            showError('Ocurrió un error inesperado');
        }
    });
}

async function moveTable() {
    const tableId = document.getElementById('tableSelect').value;
    const targetSystemId = document.getElementById('targetSystemSelect').value;
    const sourceSystemId = document.getElementById('sourceSystemSelect').value;

    if (!tableId || !targetSystemId) return;

    if (sourceSystemId === targetSystemId) {
        showError('El sistema destino no puede ser igual al origen');
        return;
    }

    confirmMove();
}

init();
