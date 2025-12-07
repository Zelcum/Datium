checkAuth();
let editingSystemId = null;
let currentSystems = [];

async function loadSystems() {
    const res = await apiFetch('/systems');
    if (res.ok) {
        currentSystems = await res.json();
        const container = document.getElementById('systemsList');

        if (currentSystems.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-box-seam display-1"></i>
                    <p class="mt-3">No tienes sistemas creados aún.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = currentSystems.map(sys => `
            <div class="col-md-4 mb-4">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <h3 class="card-title text-primary h4">${sys.name}</h3>
                        <p class="card-text text-muted flex-grow-1">${sys.description || 'Sin descripción'}</p>
                        <hr>
                        <div class="d-flex gap-2">
                            <a href="system.html?id=${sys.id}" class="btn btn-outline-primary flex-grow-1">
                                <i class="bi bi-eye"></i> Ver
                            </a>
                            <button onclick="editSystem(${sys.id})" class="btn btn-outline-secondary" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button onclick="deleteSystem(${sys.id})" class="btn btn-outline-danger" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function editSystem(id) {
    const sys = currentSystems.find(s => s.id === id);
    if (!sys) return;

    editingSystemId = id;
    document.getElementById('newSystemName').value = sys.name;
    document.getElementById('newSystemDesc').value = sys.description || '';

    document.getElementById('formTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Editar Sistema';
    document.getElementById('btnSave').innerHTML = '<i class="bi bi-check-lg"></i> Actualizar';
    document.getElementById('btnCancel').style.display = 'inline-block';

    document.getElementById('newSystemName').focus();
}

function cancelEdit() {
    editingSystemId = null;
    document.getElementById('newSystemName').value = '';
    document.getElementById('newSystemDesc').value = '';

    document.getElementById('formTitle').innerHTML = '<i class="bi bi-plus-circle-dotted"></i> Crear Nuevo Sistema';
    document.getElementById('btnSave').innerHTML = '<i class="bi bi-check-lg"></i> Crear';
    document.getElementById('btnCancel').style.display = 'none';
}

async function saveSystem() {
    const name = document.getElementById('newSystemName').value;
    const description = document.getElementById('newSystemDesc').value;
    if (!name) return alert('El nombre es requerido');

    const method = editingSystemId ? 'PUT' : 'POST';
    const url = editingSystemId ? `/systems/${editingSystemId}` : '/systems';

    const res = await apiFetch(url, {
        method: method,
        body: JSON.stringify({ name, description, securityMode: 'none' })
    });

    if (res.ok) {
        cancelEdit();
        loadSystems();
    } else {
        try {
            const errorData = await res.json();
            alert(errorData.message || errorData.error || 'Error al guardar sistema');
        } catch (e) {
            alert('Error al guardar sistema');
        }
    }
}

async function deleteSystem(id) {
    if (!confirm('¿Estás seguro de eliminar este sistema? Se borrarán todas sus tablas y datos.')) return;

    const res = await apiFetch(`/systems/${id}`, { method: 'DELETE' });
    if (res.ok) {
        loadSystems();
    } else {
        alert('Error al eliminar sistema');
    }
}

loadSystems();
