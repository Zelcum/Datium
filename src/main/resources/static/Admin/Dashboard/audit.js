const API_URL = 'http://localhost:8080/api';
let currentSystemId = null;
let allAuditData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 20;
let severityChart = null;
let activityChart = null;
let allUsers = [];

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
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        return '-';
    }
}

function formatDateOnly(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadAllSystems();
    document.getElementById('systemSelect').addEventListener('change', function () {
        const selectedSystemId = this.value;
        if (selectedSystemId) {
            currentSystemId = parseInt(selectedSystemId);
            document.getElementById('auditContent').classList.remove('hidden');
            loadAllData();
        } else {
            document.getElementById('auditContent').classList.add('hidden');
            currentSystemId = null;
        }
    });
    document.getElementById('auditTypeSelect').addEventListener('change', function () {
        const isSecurity = this.value === 'security';
        document.getElementById('severityFilterContainer').classList.toggle('hidden', !isSecurity);
        if (currentSystemId) {
            loadAllData();
        }
    });
    document.getElementById('auditSearchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
});

async function loadAllSystems() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas', {
            headers: headers
        });

        if (response.ok) {
            const systems = await response.json();
            const select = document.getElementById('systemSelect');
            select.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema...</option>';
            systems.forEach(system => {
                const option = document.createElement('option');
                option.value = system.id;
                option.textContent = system.name;
                option.className = 'bg-white dark:bg-slate-800';
                select.appendChild(option);
            });
        } else {
            showNotification('Error al cargar sistemas', 'error');
        }
    } catch (error) {
        console.error('Error loading systems:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function loadAllData() {
    if (!currentSystemId) return;

    const tbody = document.getElementById('auditTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8"><div class="flex flex-col items-center gap-2"><div class="loading-spinner rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div><span class="text-gray-500 dark:text-gray-400">Cargando...</span></div></td></tr>';
    }

    try {
        await Promise.all([
            loadAuditData(),
            loadStatistics(),
            loadUsers()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error al cargar datos', 'error');
    }
}

async function loadAuditData() {
    if (!currentSystemId) return;

    const auditType = document.getElementById('auditTypeSelect')?.value || 'logs';
    const search = document.getElementById('auditSearchInput')?.value.trim() || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    const userId = document.getElementById('userFilter')?.value || '';
    const severity = document.getElementById('severityFilter')?.value || '';

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        let url = API_URL + '/auditoria/sistema/' + currentSystemId;
        if (auditType === 'security') {
            url += '/seguridad';
        } else {
            url += '/logs';
        }

        if (search || dateFrom || dateTo || userId || severity) {
            url += '/filtrar?';
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            if (userId) params.append('userId', userId);
            if (severity && auditType === 'security') params.append('severity', severity);
            url += params.toString();
        }

        const response = await fetch(url, {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            allAuditData = Array.isArray(data) ? data : [];
            applyClientFilters();
        } else {
            console.error('Error loading audit data:', response.status, response.statusText);
            const tbody = document.getElementById('auditTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-red-500">Error al cargar los datos de auditoría</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading audit data:', error);
        const tbody = document.getElementById('auditTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-red-500">Error de conexión</td></tr>';
        }
    }
}

function applyClientFilters() {
    filteredData = [...allAuditData];
    currentPage = 1;
    renderAuditTable();
    updatePagination();
    updateCharts();
    updateStatistics();
}

async function loadStatistics() {
    if (!currentSystemId) return;

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const response = await fetch(API_URL + '/auditoria/sistema/' + currentSystemId + '/estadisticas', {
            headers: headers
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('statTotalLogs').textContent = stats.totalLogs || 0;
            document.getElementById('statHighSeverity').textContent = stats.highSeverity || 0;
            document.getElementById('statMediumSeverity').textContent = stats.mediumSeverity || 0;
            document.getElementById('statLowSeverity').textContent = stats.lowSeverity || 0;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadUsers() {
    if (!currentSystemId) return;

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) return;

        const response = await fetch(API_URL + '/auditoria/sistema/' + currentSystemId + '/usuarios', {
            headers: headers
        });

        if (response.ok) {
            const users = await response.json();
            allUsers = users;
            const select = document.getElementById('userFilter');
            select.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Todos los usuarios</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.userId || user.id;
                option.textContent = user.userName || user.name || user.userEmail || user.email;
                option.className = 'bg-white dark:bg-slate-800';
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderAuditTable() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!filteredData || filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center px-6 py-8 text-gray-500 dark:text-gray-400">No hay registros</td></tr>';
        document.getElementById('recordsInfo').textContent = 'Mostrando 0 de 0';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    const auditType = document.getElementById('auditTypeSelect')?.value || 'logs';

    pageData.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-200 border-b border-gray-200/50 dark:border-slate-700/50';
        
        if (auditType === 'logs') {
            row.innerHTML = `
                <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm">${formatDate(item.createdAt)}</td>
                <td class="px-4 py-4 whitespace-nowrap text-[#111418] dark:text-white text-sm">${item.userName || '-'}</td>
                <td class="px-4 py-4 text-gray-600 dark:text-gray-300 text-sm">${item.action || '-'}</td>
                <td class="px-4 py-4 text-gray-600 dark:text-gray-300 text-sm hidden md:table-cell">${(item.details || '-').substring(0, 50)}${(item.details || '').length > 50 ? '...' : ''}</td>
                <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm">${item.ip || '-'}</td>
                <td class="px-4 py-4 whitespace-nowrap text-center">
                    <button onclick="showDetailModal(${item.id}, 'logs')" 
                        class="action-btn action-btn-view p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Ver Detalles">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                </td>
            `;
        } else {
            const severityColor = item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
            row.innerHTML = `
                <td class="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm">${formatDate(item.createdAt)}</td>
                <td class="px-4 py-4 whitespace-nowrap text-[#111418] dark:text-white text-sm">${item.userName || '-'}</td>
                <td class="px-4 py-4 text-gray-600 dark:text-gray-300 text-sm">${item.event || '-'}</td>
                <td class="px-4 py-4 text-gray-600 dark:text-gray-300 text-sm hidden md:table-cell">${(item.details || '-').substring(0, 50)}${(item.details || '').length > 50 ? '...' : ''}</td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-lg text-white text-sm font-semibold ${severityColor}">${item.severity || '-'}</span>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-center">
                    <button onclick="showDetailModal(${item.id}, 'security')" 
                        class="action-btn action-btn-view p-2 rounded-lg transition-all duration-200 hover:scale-110" title="Ver Detalles">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                </td>
            `;
        }
        tbody.appendChild(row);
    });

    document.getElementById('recordsInfo').textContent = `Mostrando ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} de ${filteredData.length}`;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginationContainer = document.getElementById('paginationContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    if (totalPages <= 1) {
        paginationContainer.classList.add('hidden');
        return;
    }

    paginationContainer.classList.remove('hidden');
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderAuditTable();
        updatePagination();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderAuditTable();
        updatePagination();
    }
}

function updateCharts() {
    const auditType = document.getElementById('auditTypeSelect')?.value || 'logs';
    
    if (auditType === 'security') {
        updateSeverityChart();
    }
    updateActivityChart();
}

function updateSeverityChart() {
    const ctx = document.getElementById('severityChart');
    if (!ctx) return;

    const high = filteredData.filter(d => d.severity === 'high').length;
    const medium = filteredData.filter(d => d.severity === 'medium').length;
    const low = filteredData.filter(d => d.severity === 'low').length;

    if (severityChart) {
        severityChart.destroy();
    }

    severityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Alta', 'Media', 'Baja'],
            datasets: [{
                data: [high, medium, low],
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
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#111418',
                        font: {
                            family: 'Inter'
                        }
                    }
                }
            }
        }
    });
}

function updateActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const activityData = last7Days.map(date => {
        return filteredData.filter(item => {
            const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
            return itemDate === date;
        }).length;
    });

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
            datasets: [{
                label: 'Actividad',
                data: activityData,
                borderColor: 'rgba(19, 127, 236, 1)',
                backgroundColor: 'rgba(19, 127, 236, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#111418'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#111418'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function updateStatistics() {
    const auditType = document.getElementById('auditTypeSelect')?.value || 'logs';
    
    if (auditType === 'security') {
        const high = filteredData.filter(d => d.severity === 'high').length;
        const medium = filteredData.filter(d => d.severity === 'medium').length;
        const low = filteredData.filter(d => d.severity === 'low').length;
        document.getElementById('statHighSeverity').textContent = high;
        document.getElementById('statMediumSeverity').textContent = medium;
        document.getElementById('statLowSeverity').textContent = low;
    }
    
    document.getElementById('statTotalLogs').textContent = filteredData.length;
}

function applyFilters() {
    loadAuditData();
}

function resetFilters() {
    document.getElementById('auditSearchInput').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('userFilter').value = '';
    document.getElementById('severityFilter').value = '';
    loadAuditData();
}

function showDetailModal(id, type) {
    const item = allAuditData.find(d => d.id === id);
    if (!item) return;

    const modal = document.getElementById('auditDetailModal');
    const content = document.getElementById('auditDetailContent');
    
    let html = `
        <div class="space-y-4">
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Fecha</label>
                <p class="text-[#111418] dark:text-white">${formatDate(item.createdAt)}</p>
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Usuario</label>
                <p class="text-[#111418] dark:text-white">${item.userName || 'Sistema'}</p>
            </div>
    `;

    if (type === 'logs') {
        html += `
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Acción</label>
                <p class="text-[#111418] dark:text-white">${item.action || '-'}</p>
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Detalles</label>
                <p class="text-[#111418] dark:text-white whitespace-pre-wrap">${item.details || '-'}</p>
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">IP</label>
                <p class="text-[#111418] dark:text-white">${item.ip || '-'}</p>
            </div>
        `;
    } else {
        const severityColor = item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
        html += `
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Evento</label>
                <p class="text-[#111418] dark:text-white">${item.event || '-'}</p>
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Severidad</label>
                <span class="px-3 py-1 rounded-lg text-white text-sm font-semibold ${severityColor}">${item.severity || '-'}</span>
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-600 dark:text-gray-400">Detalles</label>
                <p class="text-[#111418] dark:text-white whitespace-pre-wrap">${item.details || '-'}</p>
            </div>
        `;
    }

    html += `</div>`;
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeDetailModal() {
    document.getElementById('auditDetailModal').classList.add('hidden');
}

async function exportAuditData() {
    if (!filteredData || filteredData.length === 0) {
        showNotification('No hay datos para exportar', 'error');
        return;
    }

    const format = prompt('Selecciona el formato:\n1. Excel (XLSX)\n2. CSV\n3. JSON', '1');
    
    if (!format) return;

    try {
        const headers = getAuthHeaders();
        const auditType = document.getElementById('auditTypeSelect')?.value || 'logs';
        
        const exportData = {
            type: auditType,
            data: filteredData
        };

        let url = API_URL + '/auditoria/sistema/' + currentSystemId + '/exportar';
        let filename = `auditoria_${auditType}_${new Date().toISOString().split('T')[0]}`;

        if (format === '1' || format === 'Excel' || format === 'XLSX') {
            url += '?format=xlsx';
            filename += '.xlsx';
        } else if (format === '2' || format === 'CSV') {
            url += '?format=csv';
            filename += '.csv';
        } else {
            url += '?format=json';
            filename += '.json';
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(exportData)
        });

        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            showNotification('Exportación completada', 'success');
        } else {
            showNotification('Error al exportar datos', 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Error de conexión al exportar', 'error');
    }
}
