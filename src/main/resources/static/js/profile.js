checkAuth();

async function init() {
    await loadProfile();
}

async function loadProfile() {
    const res = await apiFetch('/user/profile');
    if (res.ok) {
        const user = await res.json();

        // Populate Info
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileNameDisplay').innerText = user.name || 'Sin nombre';
        document.getElementById('profileEmailDisplay').innerText = user.email;

        // Populate Avatar
        // Populate Avatar
        const avatarImg = document.getElementById('pageUserAvatar');
        const initialEl = document.getElementById('pageUserInitial');

        if (user.avatarUrl) {
            avatarImg.src = user.avatarUrl;
            avatarImg.classList.remove('hidden');
            if (initialEl) initialEl.classList.add('hidden');
        } else {
            if (initialEl) {
                initialEl.innerText = (user.name || 'U').charAt(0).toUpperCase();
                initialEl.classList.remove('hidden');
            }
            avatarImg.classList.add('hidden');
        }

        // Current Plan
        const plans = { 1: 'Free', 2: 'Pro', 3: 'Corporate' }; // Hardcoded for display logic simplicity or fetch from backend if available
        document.getElementById('currentPlanName').innerText = user.planName || 'Gratuito';

        // Update Plan Buttons State
        updatePlanButtons(user.planId);
    }
}

function updatePlanButtons(currentPlanId) {
    const btns = document.querySelectorAll('#plansContainer button');
    btns.forEach((btn, index) => {
        const planId = index + 1; // 1, 2, 3
        if (planId === currentPlanId) {
            btn.disabled = true;
            btn.innerText = 'Actual';
            btn.classList.remove('btn-outline-secondary', 'btn-primary', 'btn-dark');
            btn.classList.add('btn-success');
        } else {
            btn.disabled = false;
            btn.innerText = 'Seleccionar';
            // Reset classes logic could be better but simplified here
        }
    });
}

async function handleAvatarChange(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // Upload Image
        try {
            const token = localStorage.getItem('token'); // Use 'token' key matching app.js
            const res = await fetch(`${API_URL}/upload/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const newAvatarUrl = data.url; // Or path

                // Update Profile with new URL
                await updateAvatarUrl(newAvatarUrl);

                // Update UI
                const avatarImg = document.getElementById('pageUserAvatar');
                const initialEl = document.getElementById('pageUserInitial');

                avatarImg.src = newAvatarUrl;
                avatarImg.classList.remove('hidden');
                if (initialEl) initialEl.classList.add('hidden');
            } else {
                alert('Error subiendo imagen');
            }
        } catch (e) {
            console.error(e);
            alert('Error subiendo imagen');
        }
    }
}

async function updateAvatarUrl(url) {
    const res = await apiFetch('/user/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: url })
    });
    if (!res.ok) alert('Error actualizando avatar en perfil');
}

async function updateProfile() {
    const name = document.getElementById('profileName').value;
    const res = await apiFetch('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name })
    });

    if (res.ok) {
        alert('Perfil actualizado');
        loadProfile();
    } else {
        alert('Error actualizando perfil');
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!currentPassword || !newPassword) return alert('Ambos campos son requeridos');

    const res = await apiFetch('/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
    });

    if (res.ok) {
        alert('Contraseña actualizada');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
    } else {
        const err = await res.json();
        alert(err.error || 'Error cambiando contraseña');
    }
}

async function changePlan(planId) {
    if (!confirm('¿Cambiar de plan?')) return;

    const res = await apiFetch('/user/plan', {
        method: 'PUT',
        body: JSON.stringify({ newPlanId: planId })
    });

    if (res.ok) {
        alert('Plan actualizado exitosamente');
        loadProfile();
    } else {
        try {
            const err = await res.json();
            alert(err.error || 'Error cambiando plan');
        } catch (e) {
            alert('Error cambiando plan');
        }
    }
}

init();
