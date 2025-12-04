const API_URL = 'http://localhost:8080/api';
let systems = [];
let currentSystemId = null;
let deleteSystemId = null;
let userCounter = 0;
let passwordCounter = 0;
let fieldCounter = 0;
let currentAuditSystemId = null;
let currentAccessSystemId = null;
let accessUsers = [];

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

document.addEventListener('DOMContentLoaded', function () {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('mainContent no encontrado');
        return;
    }

    loadSystems();
    loadStatistics();
    loadInvitationsBadge();

    try {
        setupEventListeners();
        checkCreateLimit();
        setupImagePreview();
    } catch (error) {
        console.error('Error en setup:', error);
    }
});

function setupEventListeners() {
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    document.getElementById('btnCreateSystem').addEventListener('click', showCreateForm);
    document.getElementById('btnCancel').addEventListener('click', hideCreateForm);
    document.getElementById('systemForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('filterSelect').addEventListener('change', handleFilter);
    document.getElementById('systemSecurityMode').addEventListener('change', handleSecurityModeChange);
    document.getElementById('btnAddField').addEventListener('click', addFieldField);
    document.getElementById('btnAddUser').addEventListener('click', addUserField);
    document.getElementById('btnAddUserPassword').addEventListener('click', addUserPasswordField);

    document.getElementById('btnCancelDelete').addEventListener('click', hideDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('btnSearchAudit').addEventListener('click', searchAudit);
    document.getElementById('auditTypeSelect').addEventListener('change', loadAuditData);
}

function setupImagePreview() {
    const fileInput = document.getElementById('systemImageFile');
    const preview = document.getElementById('imagePreview');

    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    showNotification('La imagen es demasiado grande. Máximo 10MB', 'error');
                    fileInput.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    showNotification('Por favor selecciona un archivo de imagen', 'error');
                    fileInput.value = '';
                    preview.classList.add('hidden');
                    preview.innerHTML = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-32 h-32 object-cover rounded-xl glass-card p-2 mt-2">`;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                preview.classList.add('hidden');
                preview.innerHTML = '';
            }
        });

        const dropZone = fileInput.closest('label');
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('border-primary', 'bg-primary/10');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('border-primary', 'bg-primary/10');
                });
            });

            dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    fileInput.dispatchEvent(new Event('change'));
                }
            });
        }
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '../../login.html';
}

function openInvitations() {
    window.location.href = '../Dashboard/invitations.html';
}

function openInvitationsForSystem(systemId) {
    window.location.href = `../Dashboard/invitations.html?systemId=${systemId}`;
}

function openTableBuilder(systemId) {
    window.location.href = `table-builder.html?systemId=${systemId}`;
}

function openModuleBuilder(systemId) {
    window.location.href = `module-builder.html?systemId=${systemId}`;
}

async function loadInvitationsBadge() {
    try {
        const response = await fetch(API_URL + '/invitaciones/resumen', {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const summary = await response.json();
            const badge = document.getElementById('invitationsBadge');
            if (badge && summary.pendingReceived > 0) {
                badge.textContent = summary.pendingReceived > 99 ? '99+' : summary.pendingReceived;
                badge.classList.remove('hidden');
            } else if (badge) {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading invitations badge:', error);
    }
}

async function loadSystems() {
    const tbody = document.getElementById('systemsTableBody');
    if (!tbody) {
        console.error('systemsTableBody no encontrado');
        return;
    }

    try {
        const token = obtenerToken();
        if (!token) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No autorizado. Redirigiendo...</td></tr>';
            setTimeout(() => window.location.href = '../../login.html', 2000);
            return;
        }

        const response = await fetch(API_URL + '/sistemas', {
            method: 'GET',
            headers: getAuthHeaders()
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-red-500 dark:text-red-400">Error: El servidor no respondió correctamente. Verifica que esté corriendo en http://localhost:8080</td></tr>';
            console.error('Error parseando respuesta:', e);
            return;
        }

        if (response.ok && Array.isArray(data)) {
            systems = data;
            console.log('✅ Sistemas cargados:', systems.length, systems);
            const invitedSystems = systems.filter(s => s.isInvited === true);
            console.log('📧 Sistemas invitados encontrados:', invitedSystems.length, invitedSystems);
            if (systems.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay sistemas. Crea tu primer sistema.</td></tr>';
            } else {
                renderSystems(systems);
            }
            loadStatistics();
        } else if (response.status === 401) {
            localStorage.removeItem('token');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-red-500 dark:text-red-400">No autorizado. Redirigiendo...</td></tr>';
            setTimeout(() => window.location.href = '../../login.html', 2000);
        } else {
            const errorMsg = data && data.error ? data.error : 'Error al cargar sistemas';
            tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-red-500 dark:text-red-400">Error: ' + errorMsg + '</td></tr>';
        }
    } catch (error) {
        console.error('Error en loadSystems:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-red-500 dark:text-red-400">Error de conexión. Verifica que Spring Boot esté corriendo en http://localhost:8080</td></tr>';
        }
    }
}

async function loadStatistics() {
    try {
        console.log('📊 Cargando estadísticas desde la base de datos...');
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            console.warn('⚠️ No token para cargar estadísticas');
            updateStatistics({
                totalSystems: 0,
                securityNone: 0,
                totalUsers: 0,
                totalRecords: 0
            });
            return Promise.resolve();
        }

        const response = await fetch(API_URL + '/sistemas/estadisticas', {
            method: 'GET',
            headers: headers
        });

        if (response.ok) {
            const stats = await response.json();
            console.log('✅ Estadísticas cargadas desde la base de datos:', stats);
            updateStatistics(stats);
            updateCharts(stats);
            return Promise.resolve();
        } else {
            console.error('❌ Error cargando estadísticas desde la base de datos:', response.status, response.statusText);
            const fallbackStats = {
                totalSystems: systems.length || 0,
                securityNone: systems.filter(s => s.securityMode === 'none').length || 0,
                securityGeneral: systems.filter(s => s.securityMode === 'general').length || 0,
                securityIndividual: systems.filter(s => s.securityMode === 'individual').length || 0,
                totalUsers: 0,
                totalRecords: 0,
                planUsage: {
                    current: systems.length || 0,
                    max: 999,
                    planName: 'Básico'
                }
            };
            updateStatistics(fallbackStats);
            updateCharts(fallbackStats);
            return Promise.resolve();
        }
    } catch (error) {
        console.error('❌ Error loading statistics desde la base de datos:', error);
        const fallbackStats = {
            totalSystems: systems.length || 0,
            securityNone: systems.filter(s => s.securityMode === 'none').length || 0,
            securityGeneral: systems.filter(s => s.securityMode === 'general').length || 0,
            securityIndividual: systems.filter(s => s.securityMode === 'individual').length || 0,
            totalUsers: 0,
            totalRecords: 0,
            planUsage: {
                current: systems.length || 0,
                max: 999,
                planName: 'Básico'
            }
        };
        updateStatistics(fallbackStats);
        updateCharts(fallbackStats);
        return Promise.resolve();
    }
}

function updateStatisticsFromSystems() {
    loadStatistics();
}

function updateStatistics(stats) {
    document.getElementById('statTotalSystems').textContent = stats.totalSystems || 0;
    document.getElementById('statSecurityNone').textContent = stats.securityNone || 0;
    document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('statTotalRecords').textContent = stats.totalRecords || 0;
}

let securityChart = null;
let activityChart = null;
let planChart = null;

function updateCharts(stats) {
    if (securityChart) securityChart.destroy();
    if (activityChart) activityChart.destroy();
    if (planChart) planChart.destroy();

    const securityCtx = document.getElementById('securityChart');
    if (securityCtx) {
        securityChart = new Chart(securityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Sin seguridad', 'General', 'Individual'],
                datasets: [{
                    data: [
                        stats.securityNone || 0,
                        stats.securityGeneral || 0,
                        stats.securityIndividual || 0
                    ],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(16, 185, 129, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                }
            }
        });

        const legendContainer = document.getElementById('securityLegend');
        if (legendContainer) {
            const securityLabels = ['Sin seguridad', 'General', 'Individual'];
            const securityColors = [
                'rgba(239, 68, 68, 1)',
                'rgba(245, 158, 11, 1)',
                'rgba(16, 185, 129, 1)'
            ];
            const securityLetters = ['S', 'G', 'I'];
            const securityData = [
                stats.securityNone || 0,
                stats.securityGeneral || 0,
                stats.securityIndividual || 0
            ];

            legendContainer.innerHTML = '';
            securityLabels.forEach((label, i) => {
                const legendItem = document.createElement('div');
                legendItem.className = 'flex items-center gap-2';

                const circle = document.createElement('div');
                circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2';
                circle.style.backgroundColor = securityColors[i];
                circle.style.borderColor = securityColors[i];
                circle.textContent = securityLetters[i];

                const labelText = document.createElement('span');
                labelText.className = 'text-[#111418] dark:text-white text-sm font-semibold';
                labelText.textContent = `${label}: ${securityData[i]}`;

                legendItem.appendChild(circle);
                legendItem.appendChild(labelText);
                legendContainer.appendChild(legendItem);
            });
        }
    }

    const activityCtx = document.getElementById('activityChart');
    if (activityCtx) {
        loadActivityChart(activityCtx);
    }

    const planCtx = document.getElementById('planChart');
    if (planCtx && stats.planUsage) {
        const current = stats.planUsage.current || 0;
        const max = stats.planUsage.max || 0;
        const used = Math.min(current, max);
        const available = Math.max(0, max - used);

        planChart = new Chart(planCtx, {
            type: 'doughnut',
            data: {
                labels: ['Sistemas Usados', 'Sistemas Disponibles'],
                datasets: [{
                    data: [used, available],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(16, 185, 129, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e2e8f0',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    if (stats.planUsage) {
        document.getElementById('statPlanUsage').textContent = `${stats.planUsage.current || 0}/${stats.planUsage.max || 0}`;
        document.getElementById('statPlanDetails').textContent = `Plan: ${stats.planUsage.planName || 'N/A'}`;
    }
}

async function loadActivityChart(ctx) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            return;
        }

        const systemsResponse = await fetch(API_URL + '/sistemas', {
            method: 'GET',
            headers: headers
        });

        if (!systemsResponse.ok) {
            return;
        }

        const systemsList = await systemsResponse.json();
        if (!systemsList || systemsList.length === 0) {
            createEmptyActivityChart(ctx);
            return;
        }

        const now = new Date();
        const hours = [];
        const hourLabels = [];

        for (let i = 23; i >= 0; i--) {
            const hourDate = new Date(now);
            hourDate.setHours(now.getHours() - i);
            hourDate.setMinutes(0);
            hourDate.setSeconds(0);
            hourDate.setMilliseconds(0);

            const hourKey = hourDate.toISOString();
            hours.push({ key: hourKey, date: hourDate, count: 0 });

            const label = hourDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            hourLabels.push(label);
        }

        const auditPromises = systemsList.map(async (system) => {
            try {
                const auditResponse = await fetch(API_URL + '/auditoria/sistema/' + system.id + '/logs', {
                    method: 'GET',
                    headers: headers
                });

                if (auditResponse.ok) {
                    const audits = await auditResponse.json();
                    return audits || [];
                }
                return [];
            } catch (error) {
                console.error('Error cargando auditorías del sistema ' + system.id, error);
                return [];
            }
        });

        const allAudits = await Promise.all(auditPromises);
        const flattenedAudits = allAudits.flat();

        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        flattenedAudits.forEach(audit => {
            if (audit.createdAt) {
                const auditDate = new Date(audit.createdAt);
                if (auditDate >= last24Hours && auditDate <= now) {
                    const hoursDiff = (auditDate - last24Hours) / (60 * 60 * 1000);
                    const hourIndex = Math.floor(hoursDiff);
                    if (hourIndex >= 0 && hourIndex < 24) {
                        hours[hourIndex].count++;
                    }
                }
            }
        });

        const auditCounts = hours.map(h => h.count);

        if (activityChart) {
            activityChart.destroy();
        }

        activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hourLabels,
                datasets: [{
                    label: 'Auditorías',
                    data: auditCounts,
                    backgroundColor: 'rgba(19, 127, 236, 0.6)',
                    borderColor: 'rgba(19, 127, 236, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#e2e8f0',
                            font: {
                                size: 10
                            },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#e2e8f0',
                            font: {
                                size: 10
                            },
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error cargando gráfico de actividad:', error);
        createEmptyActivityChart(ctx);
    }
}

function createEmptyActivityChart(ctx) {
    const now = new Date();
    const hourLabels = [];

    for (let i = 23; i >= 0; i--) {
        const hourDate = new Date(now);
        hourDate.setHours(now.getHours() - i);
        const label = hourDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        hourLabels.push(label);
    }

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Auditorías',
                data: new Array(24).fill(0),
                backgroundColor: 'rgba(19, 127, 236, 0.6)',
                borderColor: 'rgba(19, 127, 236, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#e2e8f0',
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#e2e8f0',
                        font: {
                            size: 10
                        },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function handleSearch() {
    const search = document.getElementById('searchInput').value;
    handleFilter();
}

function handleFilter() {
    const filter = document.getElementById('filterSelect').value;
    const search = document.getElementById('searchInput').value;
    let filtered = systems;

    if (search.trim() !== '') {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
        );
    }

    if (filter !== '') {
        filtered = filtered.filter(s => s.securityMode === filter);
    }

    renderSystems(filtered);
}

function renderSystems(systemsToRender) {
    console.log('🎨 Renderizando sistemas:', systemsToRender);
    const tbody = document.getElementById('systemsTableBody');
    if (!tbody) {
        console.error('❌ systemsTableBody not found');
        return;
    }
    tbody.innerHTML = '';

    if (!systemsToRender || systemsToRender.length === 0) {
        console.log('⚠️ No hay sistemas para renderizar');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-gray-500 dark:text-slate-400">No hay sistemas. Crea tu primer sistema.</td></tr>';
        return;
    }

    console.log(`✅ Renderizando ${systemsToRender.length} sistema(s)`);

    systemsToRender.forEach((system, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200 border-b border-gray-200/50 dark:border-slate-700/50';

        const imageUrl = system.imageUrl ? (system.imageUrl.startsWith('http') ? system.imageUrl : `http://localhost:8080${system.imageUrl}`) : null;
        const userCount = Math.max(1, system.userCount || 1);

        console.log(`Sistema ${system.id} (${system.name}): isInvited = ${system.isInvited}, ownerId = ${system.ownerId}`);

        const securityModeText = system.securityMode === 'none' ? 'Sin seguridad' :
            system.securityMode === 'general' ? 'General' : 'Individual';
        const securityModeClass = system.securityMode === 'none' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
            system.securityMode === 'general' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
        const securityModeIcon = system.securityMode === 'none' ? 'warning' :
            system.securityMode === 'general' ? 'warning' : 'check_circle';
        const securityModeIconColor = system.securityMode === 'none' ? 'text-red-500' :
            system.securityMode === 'general' ? 'text-yellow-500' : 'text-green-500';

        row.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                ${imageUrl ? `<img src="${imageUrl}" alt="${system.name}" class="w-14 h-14 object-cover rounded-lg shadow-md border-2 border-white/50 dark:border-slate-600/50">` : '<div class="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center shadow-md"><span class="material-symbols-outlined text-gray-400 dark:text-gray-500 text-2xl">image</span></div>'}
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="font-bold text-[#111418] dark:text-white text-sm">${system.name || '-'}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${securityModeClass}">
                    <span class="material-symbols-outlined text-base mr-1 ${securityModeIconColor}">${securityModeIcon}</span>
                    ${securityModeText}
                </span>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm hidden md:table-cell">
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-base ${system.isInvited ? 'text-purple-500' : 'text-primary'}">${system.isInvited ? 'mail' : 'people'}</span>
                    <span>${userCount}</span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm hidden lg:table-cell">${formatDate(system.createdAt)}</td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                    <button class="action-btn action-btn-view p-2 rounded-lg transition-all duration-200 opacity-50 cursor-not-allowed" title="Ver" disabled>
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    ${system.isInvited ? '' : `
                        <button onclick="editSystem(${system.id})" class="action-btn action-btn-edit p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Editar">
                            <span class="material-symbols-outlined text-lg">edit</span>
                        </button>
                    `}
                    ${system.isInvited ? '' : `
                        <button onclick="showDeleteModal(${system.id})" class="action-btn action-btn-delete p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Eliminar">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
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


function showCreateForm() {
    currentSystemId = null;
    document.getElementById('systemForm').reset();
    document.getElementById('systemId').value = '';
    document.getElementById('systemImageUrl').value = '';
    document.getElementById('systemImageFile').value = '';
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    preview.classList.add('hidden');
    document.getElementById('systemFieldsContainer').innerHTML = '';
    document.getElementById('systemUsersContainer').innerHTML = '';
    document.getElementById('systemUserPasswordsContainer').innerHTML = '';
    document.getElementById('formTitle').textContent = 'Crear Sistema';
    fieldCounter = 0;
    userCounter = 0;
    passwordCounter = 0;
    document.getElementById('createSystemForm').classList.remove('hidden');
    checkCreateLimit();
}

function hideCreateForm() {
    document.getElementById('createSystemForm').classList.add('hidden');
}

function addFieldField() {
    fieldCounter++;
    const container = document.getElementById('systemFieldsContainer');
    const div = document.createElement('div');
    div.className = 'mb-4 p-4 glass-card rounded-xl';
    div.innerHTML = `
        <div class="grid grid-cols-2 gap-2 mb-2">
            <input type="text" placeholder="Nombre del campo" class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-name required>
            <select class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-type required>
                <option value="text" class="bg-white dark:bg-slate-800">Texto</option>
                <option value="number" class="bg-white dark:bg-slate-800">Número</option>
                <option value="email" class="bg-white dark:bg-slate-800">Email</option>
                <option value="date" class="bg-white dark:bg-slate-800">Fecha</option>
                <option value="select" class="bg-white dark:bg-slate-800">Selección</option>
                <option value="textarea" class="bg-white dark:bg-slate-800">Área de texto</option>
            </select>
        </div>
        <div class="flex gap-2 mb-2 items-center">
            <label class="flex items-center text-[#111418] dark:text-white">
                <input type="checkbox" data-field-required class="mr-2">
                Requerido
            </label>
            <input type="number" placeholder="Orden" value="${fieldCounter}" class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 w-24" data-field-order>
        </div>
        <div class="mb-2" data-field-options-container style="display: none;">
            <input type="text" placeholder="Opciones separadas por coma" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-options>
        </div>
        <button type="button" onclick="removeFieldField(this)" class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span class="material-symbols-outlined text-lg">delete</span>
            <span>Eliminar Campo</span>
        </button>
    `;
    container.appendChild(div);

    const typeSelect = div.querySelector('[data-field-type]');
    typeSelect.addEventListener('change', function () {
        const optionsContainer = div.querySelector('[data-field-options-container]');
        if (this.value === 'select' || this.value === 'radio') {
            optionsContainer.style.display = 'block';
        } else {
            optionsContainer.style.display = 'none';
        }
    });
}

function removeFieldField(btn) {
    btn.parentElement.remove();
}

function addUserField() {
    userCounter++;
    const container = document.getElementById('systemUsersContainer');
    const div = document.createElement('div');
    div.className = 'mb-4 p-4 glass-card rounded-xl flex gap-2 items-center';
    div.innerHTML = `
        <input type="email" placeholder="Email del Usuario" class="flex-1 px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-user-email required>
        <select class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" data-user-role>
            <option value="viewer" class="bg-white dark:bg-slate-800">Viewer</option>
            <option value="editor" class="bg-white dark:bg-slate-800">Editor</option>
            <option value="admin" class="bg-white dark:bg-slate-800">Admin</option>
        </select>
        <button type="button" onclick="removeUserField(this)" class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span class="material-symbols-outlined text-lg">delete</span>
            <span>Eliminar</span>
        </button>
    `;
    container.appendChild(div);
}

function removeUserField(btn) {
    btn.parentElement.remove();
}

function addUserPasswordField() {
    passwordCounter++;
    const container = document.getElementById('systemUserPasswordsContainer');
    const div = document.createElement('div');
    div.className = 'mb-4 p-4 glass-card rounded-xl flex gap-2 items-center';
    div.innerHTML = `
        <input type="email" placeholder="Email del Usuario" class="flex-1 px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-password-user-email required>
        <input type="password" placeholder="Contraseña" class="flex-1 px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-password-value>
        <button type="button" onclick="removeUserPasswordField(this)" class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span class="material-symbols-outlined text-lg">delete</span>
            <span>Eliminar</span>
        </button>
    `;
    container.appendChild(div);
}

function removeUserPasswordField(btn) {
    btn.parentElement.remove();
}

function handleSecurityModeChange() {
    const mode = document.getElementById('systemSecurityMode').value;
    const section = document.getElementById('generalPasswordSection');
    if (mode === 'general') {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = obtenerToken();
    if (!token) {
        throw new Error('No hay token de autenticación');
    }

    try {
        const response = await fetch(API_URL + '/upload/image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error al subir imagen:', errorText);
            throw new Error('Error al subir la imagen: ' + response.statusText);
        }

        const data = await response.json();
        const imageUrl = data.url || data.path;
        return imageUrl;
    } catch (error) {
        console.error('Error en uploadImage:', error);
        throw error;
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('systemName').value.trim();
    if (!name) {
        alert('El nombre del sistema es requerido');
        return;
    }

    const imageFile = document.getElementById('systemImageFile').files[0];
    let imageUrl = document.getElementById('systemImageUrl').value || null;

    if (imageFile) {
        try {
            imageUrl = await uploadImage(imageFile);
            document.getElementById('systemImageUrl').value = imageUrl;
        } catch (error) {
            showNotification('Error al subir la imagen: ' + error.message, 'error');
            return;
        }
    }

    const fieldFields = document.querySelectorAll('[data-field-name]');
    const fieldsToCreate = [];
    fieldFields.forEach(field => {
        const fieldName = field.value.trim();
        if (fieldName) {
            const fieldType = field.parentElement.querySelector('[data-field-type]').value;
            const fieldRequired = field.parentElement.parentElement.querySelector('[data-field-required]').checked;
            const fieldOrder = parseInt(field.parentElement.parentElement.querySelector('[data-field-order]').value) || 0;
            const fieldOptions = field.parentElement.parentElement.querySelector('[data-field-options]');
            const options = fieldOptions && fieldOptions.value ? fieldOptions.value.split(',').map(o => o.trim()) : [];

            fieldsToCreate.push({
                name: fieldName,
                type: fieldType,
                required: fieldRequired,
                orderIndex: fieldOrder,
                options: options
            });
        }
    });

    const formData = {
        name: name,
        description: document.getElementById('systemDescription').value.trim() || null,
        imageUrl: imageUrl || null,
        securityMode: document.getElementById('systemSecurityMode').value || 'none',
        generalPassword: document.getElementById('systemGeneralPassword').value || null,
        fields: fieldsToCreate,
        users: [],
        userPasswords: []
    };

    const userFields = document.querySelectorAll('[data-user-email]');
    userFields.forEach(field => {
        const userEmail = field.value.trim();
        const roleField = field.parentElement.querySelector('[data-user-role]');
        const role = roleField ? roleField.value : 'viewer';
        if (userEmail && userEmail !== '') {
            formData.users.push({ email: userEmail, role: role });
        }
    });

    const passwordFields = document.querySelectorAll('[data-password-user-email]');
    passwordFields.forEach(field => {
        const userEmail = field.value.trim();
        const passwordField = field.parentElement.querySelector('[data-password-value]');
        const password = passwordField ? passwordField.value : '';
        if (userEmail && password && userEmail !== '' && password.trim() !== '') {
            formData.userPasswords.push({ email: userEmail, password: password });
        }
    });

    console.log('📤 Enviando datos del sistema:', JSON.stringify(formData, null, 2));

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
            setTimeout(() => window.location.href = '../../login.html', 2000);
            return;
        }

        const url = currentSystemId ? API_URL + '/sistemas/' + currentSystemId : API_URL + '/sistemas';
        const method = currentSystemId ? 'PUT' : 'POST';

        console.log(`🔄 ${method} ${url}`);

        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(formData)
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (response.ok) {
            const systemResponse = await response.json();
            console.log('✅ Sistema creado/actualizado:', systemResponse);

            hideCreateForm();

            await loadSystems();
            loadStatistics();
            checkCreateLimit();

            showNotification(currentSystemId ? 'Sistema actualizado exitosamente' : 'Sistema creado exitosamente', 'success');
        } else {
            let errorText = '';
            try {
                const errorData = await response.json();
                errorText = errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`;
                console.error('❌ Error response:', errorData);
            } catch (e) {
                errorText = await response.text().catch(() => `Error ${response.status}: ${response.statusText}`);
                console.error('❌ Error text:', errorText);
            }
            showNotification('Error: ' + errorText, 'error');
        }
    } catch (error) {
        console.error('❌ Error saving system:', error);
        showNotification('Error de conexión. Verifica que el servidor esté corriendo en http://localhost:8080', 'error');
    }
}

async function createSystemFields(systemId, fields) {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        for (const fieldData of fields) {
            await fetch(API_URL + '/sistemas/' + systemId + '/campos', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(fieldData)
            });
        }
    } catch (error) {
        console.error('Error creating fields:', error);
    }
}

async function editSystem(id) {
    try {
        const response = await fetch(API_URL + '/sistemas/' + id, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const system = await response.json();
            currentSystemId = system.id;
            document.getElementById('systemId').value = system.id;
            document.getElementById('systemName').value = system.name;
            document.getElementById('systemDescription').value = system.description || '';
            document.getElementById('systemImageUrl').value = system.imageUrl || '';
            document.getElementById('systemSecurityMode').value = system.securityMode || 'none';
            document.getElementById('systemGeneralPassword').value = system.generalPassword || '';
            document.getElementById('formTitle').textContent = 'Editar Sistema';
            handleSecurityModeChange();

            const imageUrl = system.imageUrl ? (system.imageUrl.startsWith('http') ? system.imageUrl : `http://localhost:8080${system.imageUrl}`) : null;
            const preview = document.getElementById('imagePreview');
            if (imageUrl) {
                preview.innerHTML = `<img src="${imageUrl}" alt="Preview" class="w-32 h-32 object-cover rounded-xl glass-card p-2 mt-2">`;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
                preview.innerHTML = '';
            }

            document.getElementById('systemImageFile').value = '';

            document.getElementById('systemFieldsContainer').innerHTML = '';
            fieldCounter = 0;
            if (system.fields && system.fields.length > 0) {
                system.fields.forEach(field => {
                    fieldCounter++;
                    const container = document.getElementById('systemFieldsContainer');
                    const div = document.createElement('div');
                    div.className = 'mb-4 p-4 glass-card rounded-xl';
                    const optionsValue = field.options && field.options.length > 0 ? field.options.join(', ') : '';
                    div.innerHTML = `
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <input type="text" placeholder="Nombre del campo" value="${field.name || ''}" class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-name required>
                            <select class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-type required>
                                <option value="text" ${field.type === 'text' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Texto</option>
                                <option value="number" ${field.type === 'number' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Número</option>
                                <option value="email" ${field.type === 'email' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Email</option>
                                <option value="date" ${field.type === 'date' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Fecha</option>
                                <option value="datetime" ${field.type === 'datetime' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Fecha y Hora</option>
                                <option value="url" ${field.type === 'url' ? 'selected' : ''} class="bg-white dark:bg-slate-800">URL</option>
                                <option value="tel" ${field.type === 'tel' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Teléfono</option>
                                <option value="select" ${field.type === 'select' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Selección</option>
                                <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Área de texto</option>
                                <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Checkbox</option>
                                <option value="radio" ${field.type === 'radio' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Radio</option>
                            </select>
                        </div>
                        <div class="flex gap-2 mb-2 items-center">
                            <label class="flex items-center text-[#111418] dark:text-white">
                                <input type="checkbox" data-field-required class="mr-2" ${field.required ? 'checked' : ''}>
                                Requerido
                            </label>
                            <input type="number" placeholder="Orden" value="${field.orderIndex || fieldCounter}" class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 w-24" data-field-order>
                            <button type="button" onclick="removeFieldField(this)" class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-auto">
                                <span class="material-symbols-outlined text-lg">delete</span>
                                <span>Eliminar</span>
                            </button>
                        </div>
                        <div class="field-options-container ${field.type === 'select' || field.type === 'radio' ? '' : 'hidden'}">
                            <input type="text" placeholder="Opciones (separadas por comas)" value="${optionsValue}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-options>
                        </div>
                    `;
                    container.appendChild(div);

                    const typeSelect = div.querySelector('[data-field-type]');
                    const optionsContainer = div.querySelector('.field-options-container');
                    typeSelect.addEventListener('change', function () {
                        if (this.value === 'select' || this.value === 'radio') {
                            optionsContainer.classList.remove('hidden');
                        } else {
                            optionsContainer.classList.add('hidden');
                        }
                    });
                });
            }
            document.getElementById('systemUsersContainer').innerHTML = '';
            if (system.users && system.users.length > 0) {
                system.users.forEach(user => {
                    userCounter++;
                    const container = document.getElementById('systemUsersContainer');
                    const div = document.createElement('div');
                    div.className = 'mb-4 p-4 glass-card rounded-xl flex gap-2 items-center';
                    div.innerHTML = `
                        <input type="email" value="${user.userEmail || user.email || ''}" class="flex-1 px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-user-email required>
                        <select class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" data-user-role>
                            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Viewer</option>
                            <option value="editor" ${user.role === 'editor' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Editor</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Admin</option>
                        </select>
                        <button type="button" onclick="removeUserField(this)" class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <span class="material-symbols-outlined text-lg">delete</span>
                            <span>Eliminar</span>
                        </button>
                    `;
                    container.appendChild(div);
                });
            }

            document.getElementById('systemUserPasswordsContainer').innerHTML = '';
            document.getElementById('systemGeneralPassword').value = '';

            document.getElementById('createSystemForm').classList.remove('hidden');
        } else {
            const error = await response.json();
            alert('Error: ' + (error.error || 'Error al cargar sistema'));
        }
    } catch (error) {
        console.error('Error loading system:', error);
        alert('Error al cargar sistema');
    }
}

function showDeleteModal(id) {
    deleteSystemId = id;
    document.getElementById('confirmEmail').value = '';
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

function hideDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    deleteSystemId = null;
}

async function confirmDelete() {
    const email = document.getElementById('confirmEmail').value;
    if (!email) {
        showNotification('Por favor ingresa tu email', 'error');
        return;
    }

    try {
        const response = await fetch(API_URL + '/sistemas/' + deleteSystemId, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ email: email })
        });

        if (response.ok) {
            hideDeleteModal();
            loadSystems();
            loadStatistics();
            checkCreateLimit();
            showNotification('Sistema eliminado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification('Error: ' + (error.error || 'Error al eliminar sistema'), 'error');
        }
    } catch (error) {
        console.error('Error deleting system:', error);
        showNotification('Error al eliminar sistema', 'error');
    }
}

async function checkCreateLimit() {
    try {
        const response = await fetch(API_URL + '/sistemas/limites/crear', {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            const btn = document.getElementById('btnCreateSystem');
            if (!data.canCreate) {
                btn.disabled = true;
                btn.classList.add('bg-gray-400', 'cursor-not-allowed');
                btn.title = `Has alcanzado el límite de sistemas (${data.currentCount}/${data.maxSystems})`;
            } else {
                btn.disabled = false;
                btn.classList.remove('bg-gray-400', 'cursor-not-allowed');
                btn.title = '';
            }
        }
    } catch (error) {
        console.error('Error checking limit:', error);
    }
}

function showAuditModal(systemId) {
    currentAuditSystemId = systemId;
    document.getElementById('auditSearchInput').value = '';
    document.getElementById('auditTypeSelect').value = 'logs';
    document.getElementById('auditModal').classList.remove('hidden');
    loadAuditData();
}

function hideAuditModal() {
    document.getElementById('auditModal').classList.add('hidden');
    currentAuditSystemId = null;
}

async function loadAuditData() {
    if (!currentAuditSystemId) return;

    const auditType = document.getElementById('auditTypeSelect').value;
    const search = document.getElementById('auditSearchInput').value.trim();

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        let url;
        if (search) {
            url = API_URL + '/auditoria/sistema/' + currentAuditSystemId + '/' + (auditType === 'logs' ? 'logs/buscar' : 'seguridad/buscar') + '?search=' + encodeURIComponent(search);
        } else {
            url = API_URL + '/auditoria/sistema/' + currentAuditSystemId + '/' + (auditType === 'logs' ? 'logs' : 'seguridad');
        }

        const response = await fetch(url, {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            renderAuditTable(data, auditType);
        }
    } catch (error) {
        console.error('Error loading audit data:', error);
    }
}

function renderAuditTable(items, type) {
    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay registros</td></tr>';
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors';
        if (type === 'logs') {
            row.innerHTML = `
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${formatDate(item.createdAt)}</td>
                <td class="px-6 py-4 text-[#111418] dark:text-white">${item.userName || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.action || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.details || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.ip || '-'}</td>
            `;
        } else {
            const severityColor = item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
            row.innerHTML = `
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${formatDate(item.createdAt)}</td>
                <td class="px-6 py-4 text-[#111418] dark:text-white">${item.userName || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.event || '-'}</td>
                <td class="px-6 py-4 text-gray-600 dark:text-gray-300">${item.details || '-'}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-lg text-white text-sm font-semibold ${severityColor}">${item.severity || '-'}</span>
                </td>
            `;
        }
        tbody.appendChild(row);
    });
}

function searchAudit() {
    loadAuditData();
}

let availableFieldsToImportSystem = [];
let allSystemsForForm = [];

function showLoadingScreen() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'importExportLoading';
    loadingOverlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    loadingOverlay.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Cargando...</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('importExportLoading');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

async function loadAllSystemsForForm() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const response = await fetch(API_URL + '/sistemas', {
            headers: headers
        });

        if (response.ok) {
            allSystemsForForm = await response.json();
        }
    } catch (error) {
        console.error('Error loading systems:', error);
    }
}

function showLoadingScreen() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'importExportLoading';
    loadingOverlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    loadingOverlay.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Cargando...</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('importExportLoading');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

async function showImportFieldsSystemModal() {
    showLoadingScreen();

    try {
        await loadAllSystemsForForm();

        if (allSystemsForForm.length === 0) {
            hideLoadingScreen();
            showNotification('No hay sistemas disponibles para importar campos', 'error');
            return;
        }

        hideLoadingScreen();

        const modal = document.getElementById('importFieldsSystemModal');
        if (!modal) {
            showNotification('Error: Modal de importar no encontrado', 'error');
            return;
        }

        const sourceSelect = document.getElementById('importSourceSystemForm');
        const fieldsList = document.getElementById('importFieldsSystemList');

        if (!sourceSelect || !fieldsList) {
            showNotification('Error: Elementos del modal no encontrados', 'error');
            return;
        }

        sourceSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';

        allSystemsForForm.forEach(system => {
            const option = document.createElement('option');
            option.value = system.id;
            option.textContent = system.name;
            option.className = 'bg-white dark:bg-slate-800';
            sourceSelect.appendChild(option);
        });

        const changeHandler = async function () {
            const selectedSystemId = parseInt(this.value);
            if (!selectedSystemId) {
                fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema primero</p>';
                return;
            }

            fieldsList.innerHTML = '<div class="flex items-center justify-center p-4"><div class="loading-spinner rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div></div>';

            try {
                const headers = getAuthHeaders();
                if (!headers.Authorization) {
                    fieldsList.innerHTML = '<p class="text-center text-red-500">Error: No hay token de autenticación</p>';
                    return;
                }

                const response = await fetch(API_URL + '/sistemas/' + selectedSystemId + '/campos', {
                    headers: headers
                });

                if (!response.ok) {
                    fieldsList.innerHTML = '<p class="text-center text-red-500">Error al cargar campos del sistema</p>';
                    return;
                }

                const fields = await response.json();

                if (!fields || fields.length === 0) {
                    fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Este sistema no tiene campos disponibles</p>';
                    return;
                }

                fieldsList.innerHTML = fields.map(field => `
                    <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                        <input type="checkbox" value="${field.id}" data-field-name="${field.name}" data-field-type="${field.type}" data-field-required="${field.required}" data-field-order="${field.orderIndex || 0}" data-field-options="${JSON.stringify(field.options || [])}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                        <div class="flex-1">
                            <span class="text-[#111418] dark:text-white font-medium">${field.name}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${field.type}</span>
                            ${field.required ? '<span class="text-xs text-red-500 ml-2">*Requerido</span>' : ''}
                        </div>
                    </label>
                `).join('');
            } catch (error) {
                console.error('Error loading fields:', error);
                fieldsList.innerHTML = '<p class="text-center text-red-500">Error al cargar campos</p>';
            }
        };

        sourceSelect.onchange = null;
        sourceSelect.addEventListener('change', changeHandler);

        fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema primero</p>';
        modal.classList.remove('hidden');
    } catch (error) {
        hideLoadingScreen();
        console.error('Error loading systems:', error);
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function closeImportFieldsSystemModal() {
    const modal = document.getElementById('importFieldsSystemModal');
    modal.classList.add('hidden');
    document.getElementById('importSourceSystemForm').value = '';
    document.getElementById('importFieldsSystemList').innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema primero</p>';
}

function importSelectedFieldsToForm() {
    const checkboxes = document.querySelectorAll('#importFieldsSystemList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para importar', 'error');
        return;
    }

    const importAnimation = document.createElement('div');
    importAnimation.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    importAnimation.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Importando campos...</p>
        </div>
    `;
    document.body.appendChild(importAnimation);

    setTimeout(() => {
        checkboxes.forEach(checkbox => {
            fieldCounter++;
            const container = document.getElementById('systemFieldsContainer');
            const div = document.createElement('div');
            div.className = 'mb-4 p-4 glass-card rounded-xl animate-fade-in';
            const fieldName = checkbox.getAttribute('data-field-name');
            const fieldType = checkbox.getAttribute('data-field-type');
            const fieldRequired = checkbox.getAttribute('data-field-required') === 'true';
            const fieldOrder = checkbox.getAttribute('data-field-order') || fieldCounter;
            const fieldOptions = JSON.parse(checkbox.getAttribute('data-field-options') || '[]');
            const optionsValue = fieldOptions.length > 0 ? fieldOptions.join(', ') : '';

            div.innerHTML = `
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" placeholder="Nombre del campo" value="${fieldName}" class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-name required>
                    <select class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-type required>
                        <option value="text" ${fieldType === 'text' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Texto</option>
                        <option value="number" ${fieldType === 'number' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Número</option>
                        <option value="email" ${fieldType === 'email' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Email</option>
                        <option value="date" ${fieldType === 'date' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Fecha</option>
                        <option value="datetime" ${fieldType === 'datetime' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Fecha y Hora</option>
                        <option value="url" ${fieldType === 'url' ? 'selected' : ''} class="bg-white dark:bg-slate-800">URL</option>
                        <option value="tel" ${fieldType === 'tel' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Teléfono</option>
                        <option value="select" ${fieldType === 'select' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Selección</option>
                        <option value="textarea" ${fieldType === 'textarea' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Área de texto</option>
                        <option value="checkbox" ${fieldType === 'checkbox' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Checkbox</option>
                        <option value="radio" ${fieldType === 'radio' ? 'selected' : ''} class="bg-white dark:bg-slate-800">Radio</option>
                    </select>
                </div>
                <div class="flex gap-2 mb-2 items-center">
                    <label class="flex items-center text-[#111418] dark:text-white">
                        <input type="checkbox" data-field-required class="mr-2" ${fieldRequired ? 'checked' : ''}>
                        Requerido
                    </label>
                    <input type="number" placeholder="Orden" value="${fieldOrder}" class="px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 w-24" data-field-order>
                    <button type="button" onclick="removeFieldField(this)" class="hover-smooth flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-background-light dark:bg-gray-800 text-[#111418] dark:text-white text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-auto">
                        <span class="material-symbols-outlined text-lg">delete</span>
                        <span>Eliminar</span>
                    </button>
                </div>
                <div class="field-options-container ${fieldType === 'select' || fieldType === 'radio' ? '' : 'hidden'}">
                    <input type="text" placeholder="Opciones (separadas por comas)" value="${optionsValue}" class="w-full px-4 py-3 glass-card rounded-lg text-[#111418] dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50" data-field-options>
                </div>
            `;
            container.appendChild(div);

            const typeSelect = div.querySelector('[data-field-type]');
            const optionsContainer = div.querySelector('.field-options-container');
            typeSelect.addEventListener('change', function () {
                if (this.value === 'select' || this.value === 'radio') {
                    optionsContainer.classList.remove('hidden');
                } else {
                    optionsContainer.classList.add('hidden');
                }
            });
        });

        importAnimation.innerHTML = `
            <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                    <span class="material-symbols-outlined text-white text-3xl">check</span>
                </div>
                <p class="text-[#111418] dark:text-white text-lg font-semibold">¡Campos importados exitosamente!</p>
            </div>
        `;

        setTimeout(() => {
            importAnimation.remove();
            closeImportFieldsSystemModal();
            showNotification('Campos importados exitosamente al formulario', 'success');
        }, 1500);
    }, 500);
}

function showExportFieldsSystemModal() {
    const container = document.getElementById('systemFieldsContainer');
    const fieldDivs = container.querySelectorAll('[data-field-name]');

    if (fieldDivs.length === 0) {
        showNotification('No hay campos en el formulario para exportar', 'error');
        return;
    }

    showLoadingScreen();

    loadAllSystemsForForm().then(() => {
        hideLoadingScreen();

        if (allSystemsForForm.length === 0) {
            showNotification('No hay sistemas disponibles para exportar campos', 'error');
            return;
        }

        const modal = document.getElementById('exportFieldsSystemModal');
        const targetSelect = document.getElementById('exportTargetSystemForm');
        const fieldsList = document.getElementById('exportFieldsSystemList');

        targetSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';

        allSystemsForForm.forEach(system => {
            const option = document.createElement('option');
            option.value = system.id;
            option.textContent = system.name;
            option.className = 'bg-white dark:bg-slate-800';
            targetSelect.appendChild(option);
        });

        fieldsList.innerHTML = Array.from(fieldDivs).map((div, index) => {
            const nameInput = div.querySelector('[data-field-name]');
            const typeSelect = div.querySelector('[data-field-type]');
            const requiredCheckbox = div.querySelector('[data-field-required]');
            const name = nameInput ? nameInput.value : `Campo ${index + 1}`;
            const type = typeSelect ? typeSelect.value : 'text';
            const required = requiredCheckbox ? requiredCheckbox.checked : false;

            return `
                <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                    <input type="checkbox" value="${index}" data-field-index="${index}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                    <div class="flex-1">
                        <span class="text-[#111418] dark:text-white font-medium">${name}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${type}</span>
                        ${required ? '<span class="text-xs text-red-500 ml-2">*Requerido</span>' : ''}
                    </div>
                </label>
            `;
        }).join('');

        modal.classList.remove('hidden');
    }).catch(error => {
        hideLoadingScreen();
        console.error('Error loading systems:', error);
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    });
}

function closeExportFieldsSystemModal() {
    const modal = document.getElementById('exportFieldsSystemModal');
    modal.classList.add('hidden');
    document.getElementById('exportTargetSystemForm').value = '';
    document.getElementById('exportFieldsSystemList').innerHTML = '';
}

async function exportSelectedFieldsFromForm() {
    const targetSystemId = document.getElementById('exportTargetSystemForm').value;
    if (!targetSystemId) {
        showNotification('Por favor selecciona un sistema destino', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#exportFieldsSystemList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para exportar', 'error');
        return;
    }

    const container = document.getElementById('systemFieldsContainer');
    const fieldDivs = Array.from(container.querySelectorAll('[data-field-name]'));
    const fieldsToExport = [];

    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.getAttribute('data-field-index'));
        const div = fieldDivs[index];
        if (div) {
            const nameInput = div.querySelector('[data-field-name]');
            const typeSelect = div.querySelector('[data-field-type]');
            const requiredCheckbox = div.querySelector('[data-field-required]');
            const orderInput = div.querySelector('[data-field-order]');
            const optionsInput = div.querySelector('[data-field-options]');

            const field = {
                name: nameInput ? nameInput.value : '',
                type: typeSelect ? typeSelect.value : 'text',
                required: requiredCheckbox ? requiredCheckbox.checked : false,
                orderIndex: orderInput ? parseInt(orderInput.value) || 0 : 0,
                options: optionsInput && optionsInput.value ? optionsInput.value.split(',').map(o => o.trim()).filter(o => o) : []
            };

            if (field.name) {
                fieldsToExport.push(field);
            }
        }
    });

    if (fieldsToExport.length === 0) {
        showNotification('No se pudieron obtener los campos seleccionados', 'error');
        return;
    }

    const exportAnimation = document.createElement('div');
    exportAnimation.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    exportAnimation.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Exportando campos...</p>
        </div>
    `;
    document.body.appendChild(exportAnimation);

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            exportAnimation.remove();
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        for (const field of fieldsToExport) {
            const response = await fetch(API_URL + '/sistemas/' + parseInt(targetSystemId) + '/campos', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(field)
            });

            if (!response.ok) {
                exportAnimation.innerHTML = `
                    <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                        <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                            <span class="material-symbols-outlined text-white text-3xl">close</span>
                        </div>
                        <p class="text-[#111418] dark:text-white text-lg font-semibold">Error al exportar campos</p>
                    </div>
                `;

                let errorMessage = 'Error al exportar campos';
                try {
                    const error = await response.json();
                    errorMessage = error.error || error.message || errorMessage;
                } catch (e) {
                    errorMessage = `Error ${response.status}: ${response.statusText}`;
                }

                setTimeout(() => {
                    exportAnimation.remove();
                    showNotification('Error: ' + errorMessage, 'error');
                }, 2000);
                return;
            }
        }

        exportAnimation.innerHTML = `
            <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                    <span class="material-symbols-outlined text-white text-3xl">check</span>
                </div>
                <p class="text-[#111418] dark:text-white text-lg font-semibold">¡Campos exportados exitosamente!</p>
            </div>
        `;

        setTimeout(() => {
            exportAnimation.remove();
            closeExportFieldsSystemModal();
            showNotification('Campos exportados exitosamente', 'success');
        }, 1500);
    } catch (error) {
        exportAnimation.innerHTML = `
            <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                    <span class="material-symbols-outlined text-white text-3xl">close</span>
                </div>
                <p class="text-[#111418] dark:text-white text-lg font-semibold">Error de conexión</p>
            </div>
        `;

        setTimeout(() => {
            exportAnimation.remove();
            console.error('Error exporting fields:', error);
            showNotification('Error al exportar campos: ' + (error.message || 'Error de conexión'), 'error');
        }, 2000);
    }
}

// Navigate to system data view
function viewSystem(systemId) {
    window.location.href = `system-data.html?systemId=${systemId}`;
}
