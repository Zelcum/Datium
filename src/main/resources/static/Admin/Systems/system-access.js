const API_URL = 'http://localhost:8080/api';
let currentAccessSystemId = null;
let accessUsers = [];

function showAccessModal(systemId) {
    currentAccessSystemId = systemId;
    document.getElementById('accessModal').classList.remove('hidden');
    loadAccessUsers();
}

function hideAccessModal() {
    document.getElementById('accessModal').classList.add('hidden');
    currentAccessSystemId = null;
    document.getElementById('addUserForm').classList.add('hidden');
}

async function loadAccessUsers() {
    if (!currentAccessSystemId) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentAccessSystemId + '/accesos', {
            headers: headers
        });
        
        if (response.ok) {
            accessUsers = await response.json();
            renderAccessUsers();
        } else {
            console.error('Error loading access users');
        }
    } catch (error) {
        console.error('Error loading access users:', error);
    }
}

function renderAccessUsers() {
    const tbody = document.getElementById('accessTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (accessUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay usuarios con acceso</td></tr>';
        return;
    }
    
    accessUsers.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4 text-[#111418] dark:text-white">${user.userEmail || '-'}</td>
            <td class="px-6 py-4 text-[#111418] dark:text-white">${user.userName || '-'}</td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${user.role || '-'}</td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${user.hasPassword ? '✓' : '-'}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2 flex-wrap">
                    <button onclick="editAccessUser('${user.userEmail || ''}')" class="hover-smooth flex items-center justify-center gap-1 rounded-lg h-9 px-3 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span class="material-symbols-outlined text-lg">edit</span>
                        <span>Editar</span>
                    </button>
                    <button onclick="setUserPasswordModal('${user.userEmail || ''}')" class="btn-primary-hover flex items-center justify-center gap-1 rounded-lg h-9 px-3 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                        <span class="material-symbols-outlined text-lg">lock</span>
                        <span>Contraseña</span>
                    </button>
                    <button onclick="deleteAccessUser('${user.userEmail || ''}')" class="hover-smooth flex items-center justify-center gap-1 rounded-lg h-9 px-3 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                        <span>Eliminar</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showAddUserForm() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.classList.remove('hidden');
        const emailInput = document.getElementById('newUserEmail');
        const roleSelect = document.getElementById('newUserRole');
        const passwordInput = document.getElementById('newUserPassword');
        if (emailInput) emailInput.value = '';
        if (roleSelect) roleSelect.value = 'viewer';
        if (passwordInput) passwordInput.value = '';
    }
}

function cancelAddUser() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.classList.add('hidden');
    }
}

async function saveNewUser() {
    const emailInput = document.getElementById('newUserEmail');
    const roleSelect = document.getElementById('newUserRole');
    const passwordInput = document.getElementById('newUserPassword');
    
    if (!emailInput || !roleSelect) return;
    
    const email = emailInput.value.trim();
    const role = roleSelect.value;
    const password = passwordInput ? passwordInput.value : '';
    
    if (!email) {
        showNotification('El email es requerido', 'error');
        return;
    }
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentAccessSystemId + '/accesos', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                email: email,
                role: role,
                password: password || null
            })
        });
        
        if (response.ok) {
            cancelAddUser();
            loadAccessUsers();
            showNotification('Usuario agregado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al agregar usuario'), 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('Error al agregar usuario', 'error');
    }
}

async function editAccessUser(email) {
    const user = accessUsers.find(u => u.userEmail === email);
    if (!user) {
        showNotification('Usuario no encontrado', 'error');
        return;
    }
    
    const newRole = prompt('Nuevo rol (admin, editor, viewer):', user.role);
    if (!newRole) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentAccessSystemId + '/accesos', {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                email: email,
                role: newRole
            })
        });
        
        if (response.ok) {
            loadAccessUsers();
            showNotification('Usuario actualizado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al actualizar usuario'), 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error al actualizar usuario', 'error');
    }
}

async function setUserPasswordModal(email) {
    const password = prompt('Nueva contraseña (dejar vacío para eliminar):');
    if (password === null) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentAccessSystemId + '/accesos/password', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                email: email,
                password: password || ''
            })
        });
        
        if (response.ok) {
            loadAccessUsers();
            showNotification('Contraseña actualizada exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al actualizar contraseña'), 'error');
        }
    } catch (error) {
        console.error('Error setting password:', error);
        showNotification('Error al actualizar contraseña', 'error');
    }
}

async function deleteAccessUser(email) {
    if (!confirm('¿Estás seguro de eliminar el acceso de este usuario?')) return;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentAccessSystemId + '/accesos', {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({
                email: email
            })
        });
        
        if (response.ok) {
            loadAccessUsers();
            showNotification('Usuario eliminado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al eliminar usuario'), 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error al eliminar usuario', 'error');
    }
}

async function saveGeneralPassword() {
    const passwordInput = document.getElementById('generalPassword');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;
        
        const response = await fetch(API_URL + '/sistemas/' + currentAccessSystemId + '/accesos/password/general', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                password: password || ''
            })
        });
        
        if (response.ok) {
            passwordInput.value = '';
            showNotification('Contraseña general guardada exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al guardar contraseña'), 'error');
        }
    } catch (error) {
        console.error('Error saving password:', error);
        showNotification('Error al guardar contraseña', 'error');
    }
}

