let editingUserEmail = null;

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
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="editAccessUser('${user.userEmail || ''}')" class="action-btn action-btn-edit p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Editar">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="setUserPasswordModal('${user.userEmail || ''}')" class="action-btn action-btn-lock p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Contraseña">
                        <span class="material-symbols-outlined text-lg">lock</span>
                    </button>
                    <button onclick="deleteAccessUser('${user.userEmail || ''}')" class="action-btn action-btn-delete p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Eliminar">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showAddUserForm() {
    editingUserEmail = null;
    const form = document.getElementById('addUserForm');
    if (form) {
        const formTitle = form.querySelector('h3');
        if (formTitle) formTitle.textContent = 'Agregar Usuario';
        
        const emailInput = document.getElementById('newUserEmail');
        const roleSelect = document.getElementById('newUserRole');
        const passwordInput = document.getElementById('newUserPassword');
        const passwordContainer = passwordInput ? passwordInput.closest('div') : null;
        const btnSaveUser = document.getElementById('btnSaveUser');
        
        if (emailInput) {
            emailInput.value = '';
            emailInput.disabled = false;
        }
        if (roleSelect) roleSelect.value = 'viewer';
        if (passwordInput) passwordInput.value = '';
        if (passwordContainer) passwordContainer.classList.remove('hidden');
        
        if (btnSaveUser) {
            btnSaveUser.innerHTML = '<span class="material-symbols-outlined">save</span><span>Guardar</span>';
            btnSaveUser.setAttribute('onclick', 'saveNewUser()');
        }
        
        form.classList.remove('hidden');
        setTimeout(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

function cancelAddUser() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.classList.add('hidden');
    }
    editingUserEmail = null;
}

async function saveNewUser() {
    const emailInput = document.getElementById('newUserEmail');
    const roleSelect = document.getElementById('newUserRole');
    const passwordInput = document.getElementById('newUserPassword');

    if (!emailInput || !roleSelect) {
        showNotification('Error: No se encontraron los campos del formulario', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const role = roleSelect.value;
    const password = passwordInput ? passwordInput.value : '';

    if (!email) {
        showNotification('El email es requerido', 'error');
        return;
    }

    if (!currentAccessSystemId) {
        showNotification('Error: No se encontró el ID del sistema', 'error');
        return;
    }

    const isEditing = editingUserEmail !== null && editingUserEmail !== undefined;

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const url = isEditing
            ? API_URL + '/sistemas/' + currentAccessSystemId + '/accesos'
            : API_URL + '/sistemas/' + currentAccessSystemId + '/accesos';
        const method = isEditing ? 'PUT' : 'POST';

        const requestBody = isEditing
            ? {
                email: editingUserEmail,
                role: role
            }
            : {
                email: email,
                role: role,
                password: password || null
            };

        console.log(`Saving user: ${method} ${url}`, requestBody, 'isEditing:', isEditing);

        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            cancelAddUser();
            await loadAccessUsers();
            showNotification(isEditing ? 'Usuario actualizado exitosamente' : 'Usuario agregado exitosamente', 'success');
            if (typeof loadSystems === 'function') {
                loadSystems();
            }
        } else {
            let errorMessage = isEditing ? 'Error al actualizar usuario' : 'Error al agregar usuario';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            console.error('Error saving user:', errorMessage);
            showNotification('Error: ' + errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('Error: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function editAccessUser(email) {
    const user = accessUsers.find(u => u.userEmail === email);
    if (!user) {
        showNotification('Usuario no encontrado', 'error');
        return;
    }

    editingUserEmail = email;
    const form = document.getElementById('addUserForm');
    if (form) {
        const formTitle = form.querySelector('h3');
        if (formTitle) formTitle.textContent = 'Editar Usuario';
        
        const emailInput = document.getElementById('newUserEmail');
        const roleSelect = document.getElementById('newUserRole');
        const passwordInput = document.getElementById('newUserPassword');
        const passwordContainer = passwordInput ? passwordInput.closest('div') : null;
        const btnSaveUser = document.getElementById('btnSaveUser');
        
        if (emailInput) {
            emailInput.value = user.userEmail || '';
            emailInput.disabled = true;
        }
        if (roleSelect) roleSelect.value = user.role || 'viewer';
        if (passwordInput) passwordInput.value = '';
        if (passwordContainer) passwordContainer.classList.add('hidden');
        
        if (btnSaveUser) {
            btnSaveUser.innerHTML = '<span class="material-symbols-outlined">save</span><span>Guardar</span>';
            btnSaveUser.setAttribute('onclick', 'saveNewUser()');
        }
        
        form.classList.remove('hidden');
        setTimeout(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
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

