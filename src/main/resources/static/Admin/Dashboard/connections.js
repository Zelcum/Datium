const API_URL = 'http://localhost:8080/api';
let allSystems = [];
let availableFieldsToImport = [];

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

function showLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    loadingScreen.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    loadingScreen.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Cargando...</p>
        </div>
    `;
    document.body.appendChild(loadingScreen);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.remove();
    }
}

async function loadAllSystems() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas', {
            method: 'GET',
            headers: headers
        });

        if (response.ok) {
            allSystems = await response.json();
        } else {
            showNotification('Error al cargar sistemas', 'error');
        }
    } catch (error) {
        console.error('Error loading systems:', error);
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    }
}

async function showImportModal() {
    showLoadingScreen();

    try {
        await loadAllSystems();
        hideLoadingScreen();

        if (allSystems.length < 2) {
            showNotification('Necesitas al menos 2 sistemas para importar', 'error');
            return;
        }

        const modal = document.getElementById('importModal');
        const targetSelect = document.getElementById('importTargetSystem');
        const sourceSelect = document.getElementById('importSourceSystem');
        const fieldsList = document.getElementById('importFieldsList');

        targetSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema destino...</option>';
        sourceSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema origen...</option>';

        allSystems.forEach(system => {
            const targetOption = document.createElement('option');
            targetOption.value = system.id;
            targetOption.textContent = system.name;
            targetOption.className = 'bg-white dark:bg-slate-800';
            targetSelect.appendChild(targetOption);

            const sourceOption = document.createElement('option');
            sourceOption.value = system.id;
            sourceOption.textContent = system.name;
            sourceOption.className = 'bg-white dark:bg-slate-800';
            sourceSelect.appendChild(sourceOption);
        });

        sourceSelect.onchange = async function () {
            const selectedSystemId = parseInt(this.value);
            const targetSystemId = parseInt(targetSelect.value);

            if (!selectedSystemId) {
                fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema origen primero</p>';
                return;
            }

            if (selectedSystemId === targetSystemId) {
                fieldsList.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">No puedes importar del mismo sistema</p>';
                return;
            }

            showLoadingScreen();
            try {
                const headers = getAuthHeaders();
                const response = await fetch(API_URL + '/sistemas/' + targetSystemId + '/campos/disponibles-importar', {
                    headers: headers
                });

                if (response.ok) {
                    const availableFields = await response.json();
                    const selectedSystem = availableFields.find(s => s.systemId === selectedSystemId);

                    if (selectedSystem && selectedSystem.fields) {
                        fieldsList.innerHTML = selectedSystem.fields.map(field => `
                            <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                                <input type="checkbox" value="${field.id}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                                <div class="flex-1">
                                    <span class="text-[#111418] dark:text-white font-medium">${field.name}</span>
                                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${field.type}</span>
                                    ${field.required ? '<span class="text-xs text-red-500 ml-2">*Requerido</span>' : ''}
                                </div>
                            </label>
                        `).join('');
                    } else {
                        fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">No hay campos disponibles</p>';
                    }
                } else {
                    fieldsList.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">Error al cargar campos</p>';
                }
            } catch (error) {
                fieldsList.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">Error al cargar campos</p>';
            }
            hideLoadingScreen();
        };

        fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema origen primero</p>';
        modal.classList.remove('hidden');
    } catch (error) {
        hideLoadingScreen();
        console.error('Error loading systems:', error);
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    modal.classList.add('hidden');
    document.getElementById('importTargetSystem').value = '';
    document.getElementById('importSourceSystem').value = '';
    document.getElementById('importFieldsList').innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema origen primero</p>';
}

async function executeImport() {
    const targetSystemId = document.getElementById('importTargetSystem').value;
    const sourceSystemId = document.getElementById('importSourceSystem').value;

    if (!targetSystemId || !sourceSystemId) {
        showNotification('Por favor selecciona ambos sistemas', 'error');
        return;
    }

    if (targetSystemId === sourceSystemId) {
        showNotification('No puedes importar del mismo sistema', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#importFieldsList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para importar', 'error');
        return;
    }

    const fieldIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    const importAnimation = document.createElement('div');
    importAnimation.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]';
    importAnimation.innerHTML = `
        <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
            <div class="loading-spinner rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4 animate-spin"></div>
            <p class="text-[#111418] dark:text-white text-lg font-semibold">Importando campos...</p>
        </div>
    `;
    document.body.appendChild(importAnimation);

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            importAnimation.remove();
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas/' + targetSystemId + '/campos/importar', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sourceSystemId: parseInt(sourceSystemId),
                fieldIds: fieldIds
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const transferredRecords = responseData.transferredRecords || 0;
            
            importAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">¡Campos importados exitosamente!</p>
                    ${transferredRecords > 0 ? `<p class="text-[#111418] dark:text-white text-sm mt-2">Se importaron ${transferredRecords} registros con datos</p>` : ''}
                </div>
            `;
            
            setTimeout(() => {
                importAnimation.remove();
                closeImportModal();
                if (transferredRecords > 0) {
                    showNotification(`Campos y ${transferredRecords} registros importados exitosamente`, 'success');
                } else {
                    showNotification('Campos importados exitosamente', 'success');
                }
            }, 1500);
        } else {
            importAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">close</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">Error al importar campos</p>
                </div>
            `;

            let errorMessage = 'Error al importar campos';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }

            setTimeout(() => {
                importAnimation.remove();
                showNotification(errorMessage, 'error');
            }, 2000);
        }
    } catch (error) {
        importAnimation.remove();
        console.error('Error importing fields:', error);
        showNotification('Error al importar campos: ' + (error.message || 'Error de conexión'), 'error');
    }
}

async function showExportModal() {
    showLoadingScreen();

    try {
        await loadAllSystems();
        hideLoadingScreen();

        if (allSystems.length < 2) {
            showNotification('Necesitas al menos 2 sistemas para exportar', 'error');
            return;
        }

        const modal = document.getElementById('exportModal');
        const sourceSelect = document.getElementById('exportSourceSystem');
        const targetSelect = document.getElementById('exportTargetSystem');
        const fieldsList = document.getElementById('exportFieldsList');

        sourceSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema origen...</option>';
        targetSelect.innerHTML = '<option value="" class="bg-white dark:bg-slate-800">Selecciona un sistema destino...</option>';

        allSystems.forEach(system => {
            const sourceOption = document.createElement('option');
            sourceOption.value = system.id;
            sourceOption.textContent = system.name;
            sourceOption.className = 'bg-white dark:bg-slate-800';
            sourceSelect.appendChild(sourceOption);

            const targetOption = document.createElement('option');
            targetOption.value = system.id;
            targetOption.textContent = system.name;
            targetOption.className = 'bg-white dark:bg-slate-800';
            targetSelect.appendChild(targetOption);
        });

        sourceSelect.onchange = async function () {
            const selectedSystemId = parseInt(this.value);
            const targetSystemId = parseInt(targetSelect.value);

            if (!selectedSystemId) {
                fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema origen primero</p>';
                return;
            }

            if (selectedSystemId === targetSystemId) {
                fieldsList.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">No puedes exportar al mismo sistema</p>';
                return;
            }

            showLoadingScreen();
            try {
                const headers = getAuthHeaders();
                const response = await fetch(API_URL + '/sistemas/' + selectedSystemId + '/campos', {
                    headers: headers
                });

                if (response.ok) {
                    const fields = await response.json();
                    if (fields.length > 0) {
                        fieldsList.innerHTML = fields.map(field => `
                            <label class="flex items-center gap-2 p-3 glass-card rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                                <input type="checkbox" value="${field.id}" class="w-4 h-4 text-primary focus:ring-primary rounded">
                                <div class="flex-1">
                                    <span class="text-[#111418] dark:text-white font-medium">${field.name}</span>
                                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${field.type}</span>
                                    ${field.required ? '<span class="text-xs text-red-500 ml-2">*Requerido</span>' : ''}
                                </div>
                            </label>
                        `).join('');
                    } else {
                        fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">No hay campos disponibles</p>';
                    }
                } else {
                    fieldsList.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">Error al cargar campos</p>';
                }
            } catch (error) {
                fieldsList.innerHTML = '<p class="text-center text-red-500 dark:text-red-400">Error al cargar campos</p>';
            }
            hideLoadingScreen();
        };

        fieldsList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema origen primero</p>';
        modal.classList.remove('hidden');
    } catch (error) {
        hideLoadingScreen();
        console.error('Error loading systems:', error);
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    modal.classList.add('hidden');
    document.getElementById('exportSourceSystem').value = '';
    document.getElementById('exportTargetSystem').value = '';
    document.getElementById('exportFieldsList').innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Selecciona un sistema origen primero</p>';
}

async function executeExport() {
    const sourceSystemId = document.getElementById('exportSourceSystem').value;
    const targetSystemId = document.getElementById('exportTargetSystem').value;

    if (!sourceSystemId || !targetSystemId) {
        showNotification('Por favor selecciona ambos sistemas', 'error');
        return;
    }

    if (sourceSystemId === targetSystemId) {
        showNotification('No puedes exportar al mismo sistema', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#exportFieldsList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showNotification('Por favor selecciona al menos un campo para exportar', 'error');
        return;
    }

    const fieldIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

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

        const response = await fetch(API_URL + '/sistemas/' + sourceSystemId + '/campos/transferir', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fieldIds: fieldIds,
                targetSystemId: parseInt(targetSystemId)
            })
        });

        if (response.ok) {
            const responseData = await response.json();
            const transferredRecords = responseData.transferredRecords || 0;
            
            exportAnimation.innerHTML = `
                <div class="glass-card p-8 rounded-xl shadow-2xl text-center">
                    <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                        <span class="material-symbols-outlined text-white text-3xl">check</span>
                    </div>
                    <p class="text-[#111418] dark:text-white text-lg font-semibold">¡Campos exportados exitosamente!</p>
                    ${transferredRecords > 0 ? `<p class="text-[#111418] dark:text-white text-sm mt-2">Se exportaron ${transferredRecords} registros con datos</p>` : ''}
                </div>
            `;
            
            setTimeout(() => {
                exportAnimation.remove();
                closeExportModal();
                if (transferredRecords > 0) {
                    showNotification(`Campos y ${transferredRecords} registros exportados exitosamente`, 'success');
                } else {
                    showNotification('Campos exportados exitosamente', 'success');
                }
            }, 1500);
        } else {
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
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }

            setTimeout(() => {
                exportAnimation.remove();
                showNotification(errorMessage, 'error');
            }, 2000);
        }
    } catch (error) {
        exportAnimation.remove();
        console.error('Error exporting fields:', error);
        showNotification('Error al exportar campos: ' + (error.message || 'Error de conexión'), 'error');
    }
}

async function loadSystemsForFileExport() {
    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const response = await fetch(API_URL + '/sistemas', {
            method: 'GET',
            headers: headers
        });

        if (response.ok) {
            const systems = await response.json();
            const select = document.getElementById('exportFileSystem');
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
        showNotification('Error al cargar sistemas: ' + (error.message || 'Error de conexión'), 'error');
    }
}

async function exportToFile() {
    const systemId = document.getElementById('exportFileSystem').value;
    const format = document.getElementById('exportFileFormat').value;

    if (!systemId) {
        showNotification('Por favor selecciona un sistema', 'error');
        return;
    }

    showLoadingScreen();

    try {
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            hideLoadingScreen();
            showNotification('Error: No hay token de autenticación', 'error');
            return;
        }

        const recordsResponse = await fetch(API_URL + '/sistemas/' + systemId + '/registros', {
            headers: headers
        });

        if (!recordsResponse.ok) {
            hideLoadingScreen();
            showNotification('Error al cargar registros', 'error');
            return;
        }

        const records = await recordsResponse.json();

        const fieldsResponse = await fetch(API_URL + '/sistemas/' + systemId + '/campos', {
            headers: headers
        });

        if (!fieldsResponse.ok) {
            hideLoadingScreen();
            showNotification('Error al cargar campos', 'error');
            return;
        }

        const fields = await fieldsResponse.json();
        hideLoadingScreen();

        if (records.length === 0) {
            showNotification('No hay registros para exportar', 'error');
            return;
        }

        const system = allSystems.find(s => s.id === parseInt(systemId));
        const systemName = system ? system.name.replace(/[^a-z0-9]/gi, '_') : 'sistema';

        if (format === 'xlsx') {
            exportToExcel(records, fields, systemName);
        } else if (format === 'csv') {
            exportToCSV(records, fields, systemName);
        } else if (format === 'json') {
            exportToJSON(records, fields, systemName);
        }

        showNotification('Archivo exportado exitosamente', 'success');
    } catch (error) {
        hideLoadingScreen();
        console.error('Error exporting to file:', error);
        showNotification('Error al exportar: ' + (error.message || 'Error de conexión'), 'error');
    }
}

function exportToExcel(records, fields, systemName) {
    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    const worksheetData = [];
    const headers = ['ID', ...sortedFields.map(f => f.name), 'Fecha de Creación', 'Fecha de Actualización'];
    worksheetData.push(headers);

    records.forEach(record => {
        const row = [record.id];
        sortedFields.forEach(field => {
            const value = record.fieldValues && record.fieldValues[field.name] ? record.fieldValues[field.name] : '';
            row.push(value);
        });
        row.push(record.createdAt ? new Date(record.createdAt).toLocaleString('es-ES') : '');
        row.push(record.updatedAt ? new Date(record.updatedAt).toLocaleString('es-ES') : '');
        worksheetData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${systemName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToCSV(records, fields, systemName) {
    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    const headers = ['ID', ...sortedFields.map(f => f.name), 'Fecha de Creación', 'Fecha de Actualización'];
    const csvRows = [headers.join(',')];

    records.forEach(record => {
        const row = [record.id];
        sortedFields.forEach(field => {
            const value = record.fieldValues && record.fieldValues[field.name] ? record.fieldValues[field.name] : '';
            const escapedValue = value.toString().replace(/"/g, '""');
            row.push(`"${escapedValue}"`);
        });
        row.push(record.createdAt ? new Date(record.createdAt).toLocaleString('es-ES') : '');
        row.push(record.updatedAt ? new Date(record.updatedAt).toLocaleString('es-ES') : '');
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${systemName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportToJSON(records, fields, systemName) {
    const sortedFields = [...fields].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    const jsonData = {
        sistema: systemName,
        fechaExportacion: new Date().toISOString(),
        campos: sortedFields.map(f => ({
            id: f.id,
            nombre: f.name,
            tipo: f.type,
            requerido: f.required
        })),
        registros: records.map(record => {
            const recordData = {
                id: record.id,
                fechaCreacion: record.createdAt,
                fechaActualizacion: record.updatedAt
            };
            sortedFields.forEach(field => {
                recordData[field.name] = record.fieldValues && record.fieldValues[field.name] ? record.fieldValues[field.name] : null;
            });
            return recordData;
        })
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${systemName}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

document.addEventListener('DOMContentLoaded', function () {
    loadSystemsForFileExport();
    loadAllSystems();
});


