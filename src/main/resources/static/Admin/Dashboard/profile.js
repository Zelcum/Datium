const API_BASE_URL = '/api/user';

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
    window.location.href = 'dashboard.html';
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '../../login.html';
}

function showNotification(message, type) {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load user profile
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al cargar el perfil');
        }

        const profile = await response.json();

        // Populate form fields
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileCreatedAt').value = formatDate(profile.createdAt);
        document.getElementById('currentPlan').textContent = profile.planName || 'Desconocido';

        // Set the current plan in the select
        if (profile.planId) {
            document.getElementById('newPlan').value = profile.planId;
        }

        // Display avatar if exists
        if (profile.avatarUrl) {
            displayAvatar(profile.avatarUrl);
        }

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification(error.message || 'Error al cargar el perfil', 'error');
        
        // If unauthorized, redirect to login
        if (error.message.includes('Token') || error.message.includes('no encontrado')) {
            setTimeout(() => {
                handleLogout();
            }, 2000);
        }
    }
}

// Display avatar
function displayAvatar(avatarUrl) {
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    if (avatarUrl && avatarUrl.trim() !== '') {
        // Set the image source
        avatarPreview.src = avatarUrl;
        
        // Handle successful image load
        avatarPreview.onload = function() {
            avatarPreview.classList.remove('hidden');
            avatarPlaceholder.classList.add('hidden');
        };
        
        // Handle image load error
        avatarPreview.onerror = function() {
            console.error('Error loading avatar image:', avatarUrl);
            avatarPreview.classList.add('hidden');
            avatarPlaceholder.classList.remove('hidden');
        };
    } else {
        // No avatar URL, show placeholder
        avatarPreview.src = '';
        avatarPreview.classList.add('hidden');
        avatarPlaceholder.classList.remove('hidden');
    }
}

// Upload avatar
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error al subir la imagen');
        }

        const result = await response.json();
        return result.url;
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
}

// Update avatar in database
async function updateAvatarUrl(avatarUrl) {
    try {
        const response = await fetch(`${API_BASE_URL}/avatar`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ avatarUrl })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar el avatar');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating avatar:', error);
        throw error;
    }
}

// Remove avatar
async function removeAvatar() {
    try {
        const confirmed = confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?');
        if (!confirmed) return;

        await updateAvatarUrl(null);
        displayAvatar(null);
        showNotification('Foto de perfil eliminada exitosamente', 'success');
    } catch (error) {
        showNotification(error.message || 'Error al eliminar la foto de perfil', 'error');
    }
}


// Update profile
async function updateProfile(event) {
    event.preventDefault();

    const name = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();

    if (!name || !email) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor ingresa un correo electrónico válido', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, email })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar el perfil');
        }

        const updatedProfile = await response.json();
        showNotification('Perfil actualizado exitosamente', 'success');

        // Update displayed data
        document.getElementById('currentPlan').textContent = updatedProfile.planName || 'Desconocido';

    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message || 'Error al actualizar el perfil', 'error');
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }

    if (currentPassword === newPassword) {
        showNotification('La nueva contraseña debe ser diferente a la actual', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al cambiar la contraseña');
        }

        showNotification('Contraseña actualizada exitosamente', 'success');

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

    } catch (error) {
        console.error('Error changing password:', error);
        showNotification(error.message || 'Error al cambiar la contraseña', 'error');
    }
}

// Change plan
async function changePlan(event) {
    event.preventDefault();

    const newPlanId = parseInt(document.getElementById('newPlan').value);

    if (!newPlanId || newPlanId < 1 || newPlanId > 3) {
        showNotification('Por favor selecciona un plan válido', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/plan`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ newPlanId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al cambiar el plan');
        }

        const updatedProfile = await response.json();
        showNotification('Plan actualizado exitosamente', 'success');

        // Update displayed plan
        document.getElementById('currentPlan').textContent = updatedProfile.planName || 'Desconocido';

    } catch (error) {
        console.error('Error changing plan:', error);
        showNotification(error.message || 'Error al cambiar el plan', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = obtenerToken();
    if (!token) {
        window.location.href = '../../login.html';
        return;
    }

    // Load user profile
    loadUserProfile();

    // Form event listeners
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
    document.getElementById('passwordForm').addEventListener('submit', changePassword);
    document.getElementById('planForm').addEventListener('submit', changePlan);

    // Avatar input event listener
    document.getElementById('avatarInput').addEventListener('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('La imagen debe ser menor a 5MB', 'error');
            return;
        }

        try {
            // Show preview immediately using FileReader
            const reader = new FileReader();
            reader.onload = function(e) {
                displayAvatar(e.target.result);
            };
            reader.readAsDataURL(file);

            showNotification('Subiendo imagen...', 'info');
            
            // Upload image
            const avatarUrl = await uploadAvatar(file);
            
            // Update avatar in database
            await updateAvatarUrl(avatarUrl);
            
            // Update display with server URL
            displayAvatar(avatarUrl);
            
            showNotification('Foto de perfil actualizada exitosamente', 'success');
        } catch (error) {
            showNotification(error.message || 'Error al actualizar la foto de perfil', 'error');
            // Reload profile to restore previous avatar
            loadUserProfile();
        }

        // Clear input
        event.target.value = '';
    });
});

