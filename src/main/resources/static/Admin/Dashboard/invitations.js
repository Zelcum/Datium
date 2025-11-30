const API_URL = 'http://localhost:8080/api';
let currentTab = 'received';
let receivedInvitations = [];
let sentInvitations = [];
let allSystems = [];
let invitationSummary = null;
let isLoadingReceived = false;
let isLoadingSent = false;
let isLoadingSystems = false;

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

document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    
    const urlParams = new URLSearchParams(window.location.search);
    const systemId = urlParams.get('systemId');
    if (systemId) {
        currentTab = 'create';
        loadSummary();
        loadSystems();
        setTimeout(() => {
            switchTab('create');
            setTimeout(() => {
                const select = document.getElementById('invitationSystemId');
                if (select) {
                    select.value = systemId;
                }
            }, 100);
        }, 100);
    } else {
        currentTab = 'received';
        loadSummary();
        switchTab('received');
    }
});

function setupEventListeners() {
    document.getElementById('createInvitationForm').addEventListener('submit', handleCreateInvitation);
    
    document.getElementById('invitationAccessType').addEventListener('change', function() {
        const passwordSection = document.getElementById('individualPasswordSection');
        if (this.value === 'individual') {
            passwordSection.classList.remove('hidden');
            document.getElementById('invitationPassword').required = true;
        } else {
            passwordSection.classList.add('hidden');
            document.getElementById('invitationPassword').required = false;
        }
    });

    document.getElementById('searchReceived').addEventListener('input', filterReceived);
    document.getElementById('filterReceived').addEventListener('change', filterReceived);
    document.getElementById('searchSent').addEventListener('input', filterSent);
    document.getElementById('filterSent').addEventListener('change', filterSent);
}

function switchTab(tab) {
    if (currentTab === tab) {
        return;
    }
    
    currentTab = tab;
    
    document.querySelectorAll('[id^="tab"]').forEach(btn => {
        btn.classList.remove('tab-active', 'border-primary', 'text-primary');
        btn.classList.add('border-transparent', 'text-gray-600', 'dark:text-gray-400');
    });
    
    const activeTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (activeTab) {
        activeTab.classList.add('tab-active', 'border-primary', 'text-primary', 'text-[#111418]', 'dark:text-white');
        activeTab.classList.remove('border-transparent', 'text-gray-600', 'dark:text-gray-400');
    }
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById('tabContent' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
    
    if (tab === 'received' && !isLoadingReceived) {
        loadReceivedInvitations();
    } else if (tab === 'sent' && !isLoadingSent) {
        loadSentInvitations();
    } else if (tab === 'create' && !isLoadingSystems) {
        loadSystems();
    }
}

let isLoadingSummary = false;

async function loadSummary() {
    if (isLoadingSummary) {
        return;
    }
    
    isLoadingSummary = true;
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            isLoadingSummary = false;
            return;
        }
        
        const response = await fetch(API_URL + '/invitaciones/resumen', {
            headers: headers
        });

        if (response.ok) {
            invitationSummary = await response.json();
            updateSummaryDisplay();
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    } finally {
        isLoadingSummary = false;
    }
}

function updateSummaryDisplay() {
    if (!invitationSummary) return;
    
    const pendingReceivedEl = document.getElementById('statPendingReceived');
    const pendingSentEl = document.getElementById('statPendingSent');
    const acceptedEl = document.getElementById('statAccepted');
    const rejectedEl = document.getElementById('statRejected');
    const expiredEl = document.getElementById('statExpired');
    
    if (pendingReceivedEl) pendingReceivedEl.textContent = invitationSummary.pendingReceived || 0;
    if (pendingSentEl) pendingSentEl.textContent = invitationSummary.pendingSent || 0;
    if (acceptedEl) acceptedEl.textContent = invitationSummary.accepted || 0;
    if (rejectedEl) rejectedEl.textContent = invitationSummary.rejected || 0;
    if (expiredEl) expiredEl.textContent = invitationSummary.expired || 0;
}

async function loadSystems() {
    if (isLoadingSystems) {
        return;
    }
    
    isLoadingSystems = true;
    try {
        const response = await fetch(API_URL + '/sistemas', {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            allSystems = await response.json();
            const select = document.getElementById('invitationSystemId');
            if (select) {
                select.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';
                allSystems.filter(s => !s.isInvited).forEach(system => {
                    const option = document.createElement('option');
                    option.value = system.id;
                    option.textContent = system.name;
                    option.className = 'bg-white dark:bg-slate-800';
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading systems:', error);
    } finally {
        isLoadingSystems = false;
    }
}

async function loadReceivedInvitations() {
    if (isLoadingReceived) {
        return;
    }
    
    isLoadingReceived = true;
    const tbody = document.getElementById('receivedTableBody');
    if (!tbody) {
        console.error('receivedTableBody no encontrado');
        isLoadingReceived = false;
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7" class="text-center px-6 py-8"><div class="flex flex-col items-center gap-2"><div class="loading-spinner rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div><span class="text-gray-500 dark:text-gray-400">Cargando invitaciones...</span></div></td></tr>';

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center px-6 py-8 text-red-500">Error: No hay token de autenticación</td></tr>';
            isLoadingReceived = false;
            return;
        }
        
        const response = await fetch(API_URL + '/invitaciones/recibidas', {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            receivedInvitations = Array.isArray(data) ? data : [];
            renderReceivedInvitations(receivedInvitations);
        } else {
            const errorText = await response.text();
            let errorMessage = 'Error al cargar invitaciones';
            try {
                const error = JSON.parse(errorText);
                errorMessage = error.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            tbody.innerHTML = `<tr><td colspan="7" class="text-center px-6 py-8 text-red-500">${errorMessage}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading received invitations:', error);
        const errorMsg = error.message || 'Error de conexión';
        tbody.innerHTML = `<tr><td colspan="7" class="text-center px-6 py-8 text-red-500">Error de conexión: ${errorMsg}</td></tr>`;
    } finally {
        isLoadingReceived = false;
    }
}

function renderReceivedInvitations(invitations) {
    const tbody = document.getElementById('receivedTableBody');
    if (!tbody) {
        console.error('receivedTableBody no encontrado en render');
        return;
    }

    tbody.innerHTML = '';

    if (!invitations || invitations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay invitaciones recibidas</td></tr>';
        return;
    }

    console.log('Renderizando', invitations.length, 'invitaciones recibidas');

    invitations.forEach(invitation => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200 border-b border-gray-200/50 dark:border-slate-700/50';

        const systemImageUrl = invitation.systemImageUrl ? 
            (invitation.systemImageUrl.startsWith('http') ? invitation.systemImageUrl : `http://localhost:8080${invitation.systemImageUrl}`) : null;
        
        const statusBadge = getStatusBadge(invitation.status, invitation.isExpired);
        const roleBadge = getRoleBadge(invitation.role);
        const accessBadge = getAccessBadge(invitation.accessType);

        row.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                    ${systemImageUrl ? 
                        `<img src="${systemImageUrl}" alt="${invitation.systemName}" class="w-10 h-10 object-cover rounded-lg">` :
                        `<div class="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-gray-400 dark:text-gray-500">apps</span></div>`
                    }
                    <div class="font-bold text-[#111418] dark:text-white text-sm">${invitation.systemName || '-'}</div>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-[#111418] dark:text-white text-sm">${invitation.inviterName || invitation.inviterEmail || '-'}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${invitation.inviterEmail || ''}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap hidden lg:table-cell">${roleBadge}</td>
            <td class="px-4 py-4 whitespace-nowrap hidden md:table-cell">${accessBadge}</td>
            <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm hidden lg:table-cell">${formatDate(invitation.createdAt)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-center">${statusBadge}</td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                    ${invitation.canAccept ? `
                        <button onclick="acceptInvitation(${invitation.id})" class="action-btn action-btn-edit p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Aceptar">
                            <span class="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                    ` : ''}
                    ${invitation.canReject ? `
                        <button onclick="rejectInvitation(${invitation.id})" class="action-btn action-btn-delete p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Rechazar">
                            <span class="material-symbols-outlined text-lg">cancel</span>
                        </button>
                    ` : ''}
                    ${invitation.status === 'accepted' ? `
                        <button onclick="viewSystem(${invitation.systemId})" class="action-btn action-btn-view p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Ver Sistema">
                            <span class="material-symbols-outlined text-lg">visibility</span>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function loadSentInvitations() {
    if (isLoadingSent) {
        return;
    }
    
    isLoadingSent = true;
    const tbody = document.getElementById('sentTableBody');
    if (!tbody) {
        console.error('sentTableBody no encontrado');
        isLoadingSent = false;
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7" class="text-center px-6 py-8"><div class="flex flex-col items-center gap-2"><div class="loading-spinner rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div><span class="text-gray-500 dark:text-gray-400">Cargando invitaciones...</span></div></td></tr>';

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center px-6 py-8 text-red-500">Error: No hay token de autenticación</td></tr>';
            isLoadingSent = false;
            return;
        }
        
        const response = await fetch(API_URL + '/invitaciones/enviadas', {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            sentInvitations = Array.isArray(data) ? data : [];
            renderSentInvitations(sentInvitations);
        } else {
            const errorText = await response.text();
            let errorMessage = 'Error al cargar invitaciones';
            try {
                const error = JSON.parse(errorText);
                errorMessage = error.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            tbody.innerHTML = `<tr><td colspan="7" class="text-center px-6 py-8 text-red-500">${errorMessage}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading sent invitations:', error);
        const errorMsg = error.message || 'Error de conexión';
        tbody.innerHTML = `<tr><td colspan="7" class="text-center px-6 py-8 text-red-500">Error de conexión: ${errorMsg}</td></tr>`;
    } finally {
        isLoadingSent = false;
    }
}

function renderSentInvitations(invitations) {
    const tbody = document.getElementById('sentTableBody');
    if (!tbody) {
        console.error('sentTableBody no encontrado en render');
        return;
    }

    tbody.innerHTML = '';

    if (!invitations || invitations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No has enviado invitaciones</td></tr>';
        return;
    }

    console.log('Renderizando', invitations.length, 'invitaciones enviadas');

    invitations.forEach(invitation => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200 border-b border-gray-200/50 dark:border-slate-700/50';

        const systemImageUrl = invitation.systemImageUrl ? 
            (invitation.systemImageUrl.startsWith('http') ? invitation.systemImageUrl : `http://localhost:8080${invitation.systemImageUrl}`) : null;
        
        const statusBadge = getStatusBadge(invitation.status, invitation.isExpired);
        const roleBadge = getRoleBadge(invitation.role);
        const accessBadge = getAccessBadge(invitation.accessType);

        row.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                    ${systemImageUrl ? 
                        `<img src="${systemImageUrl}" alt="${invitation.systemName}" class="w-10 h-10 object-cover rounded-lg">` :
                        `<div class="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-gray-400 dark:text-gray-500">apps</span></div>`
                    }
                    <div class="font-bold text-[#111418] dark:text-white text-sm">${invitation.systemName || '-'}</div>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-[#111418] dark:text-white text-sm">${invitation.inviteeName || invitation.inviteeEmail || '-'}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${invitation.inviteeEmail || ''}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap hidden lg:table-cell">${roleBadge}</td>
            <td class="px-4 py-4 whitespace-nowrap hidden md:table-cell">${accessBadge}</td>
            <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm hidden lg:table-cell">${formatDate(invitation.createdAt)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-center">${statusBadge}</td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                    ${invitation.canCancel ? `
                        <button onclick="cancelInvitation(${invitation.id})" class="action-btn action-btn-delete p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Cancelar">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    ` : ''}
                    ${invitation.canResend ? `
                        <button onclick="resendInvitation(${invitation.id})" class="action-btn action-btn-edit p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Reenviar">
                            <span class="material-symbols-outlined text-lg">refresh</span>
                        </button>
                    ` : ''}
                    ${invitation.status === 'accepted' && invitation.acceptedAt ? `
                        <span class="text-xs text-gray-500 dark:text-gray-400" title="Aceptada: ${formatDate(invitation.acceptedAt)}">✓</span>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function handleCreateInvitation(e) {
    e.preventDefault();

    const systemId = document.getElementById('invitationSystemId').value;
    const email = document.getElementById('invitationEmail').value.trim();
    const role = document.getElementById('invitationRole').value;
    const accessType = document.getElementById('invitationAccessType').value;
    const password = document.getElementById('invitationPassword').value;
    const expirationDays = parseInt(document.getElementById('invitationExpirationDays').value) || 30;

    if (!systemId || !email) {
        showNotification('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    if (accessType === 'individual' && !password) {
        showNotification('La contraseña es requerida para acceso individual', 'error');
        return;
    }

    try {
        const response = await fetch(API_URL + '/invitaciones', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                systemId: parseInt(systemId),
                inviteeEmail: email,
                role: role,
                accessType: accessType,
                individualPassword: accessType === 'individual' ? password : null,
                expirationDays: expirationDays
            })
        });

        if (response.ok) {
            showNotification('Invitación enviada exitosamente', 'success');
            resetInvitationForm();
            loadSentInvitations();
            switchTab('sent');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al crear invitación'), 'error');
        }
    } catch (error) {
        console.error('Error creating invitation:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function acceptInvitation(invitationId) {
    if (!confirm('¿Aceptar esta invitación?')) return;

    try {
        const response = await fetch(API_URL + '/invitaciones/' + invitationId + '/aceptar', {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showNotification('Invitación aceptada exitosamente', 'success');
            loadReceivedInvitations();
            if (window.opener) {
                window.opener.location.reload();
            }
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al aceptar invitación'), 'error');
        }
    } catch (error) {
        console.error('Error accepting invitation:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function rejectInvitation(invitationId) {
    if (!confirm('¿Rechazar esta invitación?')) return;

    try {
        const response = await fetch(API_URL + '/invitaciones/' + invitationId + '/rechazar', {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showNotification('Invitación rechazada', 'success');
            loadReceivedInvitations();
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al rechazar invitación'), 'error');
        }
    } catch (error) {
        console.error('Error rejecting invitation:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function cancelInvitation(invitationId) {
    if (!confirm('¿Cancelar esta invitación?')) return;

    try {
        const response = await fetch(API_URL + '/invitaciones/' + invitationId, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showNotification('Invitación cancelada', 'success');
            loadSentInvitations();
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al cancelar invitación'), 'error');
        }
    } catch (error) {
        console.error('Error cancelling invitation:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function resendInvitation(invitationId) {
    if (!confirm('¿Reenviar esta invitación?')) return;

    try {
        const response = await fetch(API_URL + '/invitaciones/' + invitationId + '/reenviar', {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showNotification('Invitación reenviada exitosamente', 'success');
            loadSentInvitations();
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al reenviar invitación'), 'error');
        }
    } catch (error) {
        console.error('Error resending invitation:', error);
        showNotification('Error de conexión', 'error');
    }
}

function viewSystem(systemId) {
    window.location.href = `../Systems/system-data.html?systemId=${systemId}`;
}

function filterReceived() {
    const search = document.getElementById('searchReceived').value.toLowerCase();
    const filter = document.getElementById('filterReceived').value;

    let filtered = receivedInvitations;

    if (search) {
        filtered = filtered.filter(inv => 
            (inv.systemName && inv.systemName.toLowerCase().includes(search)) ||
            (inv.inviterEmail && inv.inviterEmail.toLowerCase().includes(search)) ||
            (inv.inviterName && inv.inviterName.toLowerCase().includes(search))
        );
    }

    if (filter !== 'all') {
        filtered = filtered.filter(inv => inv.status === filter);
    }

    renderReceivedInvitations(filtered);
}

function filterSent() {
    const search = document.getElementById('searchSent').value.toLowerCase();
    const filter = document.getElementById('filterSent').value;

    let filtered = sentInvitations;

    if (search) {
        filtered = filtered.filter(inv => 
            (inv.systemName && inv.systemName.toLowerCase().includes(search)) ||
            (inv.inviteeEmail && inv.inviteeEmail.toLowerCase().includes(search)) ||
            (inv.inviteeName && inv.inviteeName.toLowerCase().includes(search))
        );
    }

    if (filter !== 'all') {
        filtered = filtered.filter(inv => inv.status === filter);
    }

    renderSentInvitations(filtered);
}

function resetInvitationForm() {
    document.getElementById('createInvitationForm').reset();
    document.getElementById('individualPasswordSection').classList.add('hidden');
    document.getElementById('invitationPassword').required = false;
}

function getStatusBadge(status, isExpired) {
    const badges = {
        pending: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">Pendiente</span>',
        accepted: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">Aceptada</span>',
        rejected: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">Rechazada</span>',
        expired: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200">Expirada</span>',
        cancelled: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200">Cancelada</span>'
    };
    
    if (isExpired && status === 'pending') {
        return badges.expired;
    }
    
    return badges[status] || badges.pending;
}

function getRoleBadge(role) {
    const badges = {
        admin: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">Admin</span>',
        editor: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">Editor</span>',
        viewer: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">Viewer</span>'
    };
    return badges[role] || badges.viewer;
}

function getAccessBadge(accessType) {
    const badges = {
        none: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200">Sin seguridad</span>',
        general: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">General</span>',
        individual: '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">Individual</span>'
    };
    return badges[accessType] || badges.none;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '-';
    }
}
