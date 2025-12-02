const API_URL = 'http://localhost:8080/api';
let allSystems = [];
let sourceBlockCounter = 0;
let processChart = null;

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../../login.html';
        return null;
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await loadSystems();
    showLoadingSuccess();
    setTimeout(() => {
        hideLoadingScreen();
    }, 1000);
});

function showLoadingSuccess() {
    const spinner = document.getElementById('loading-spinner');
    const checkmark = document.getElementById('checkmark');
    const loadingText = document.getElementById('loading-text');

    if (spinner) spinner.style.display = 'none';
    if (checkmark) checkmark.classList.add('show');
    if (loadingText) {
        loadingText.textContent = '¡Listo!';
        loadingText.classList.add('success-text');
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

function initChart() {
    const ctx = document.getElementById('processChart').getContext('2d');
    processChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendiente', 'Exitoso', 'Error'],
            datasets: [{
                data: [100, 0, 0],
                backgroundColor: ['#374151', '#10B981', '#EF4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9CA3AF', font: { family: 'Inter' } }
                }
            },
            cutout: '70%'
        }
    });
}

function updateChart(pending, success, error) {
    if (processChart) {
        processChart.data.datasets[0].data = [pending, success, error];
        processChart.update();
    }
    document.getElementById('successCount').textContent = success;
    document.getElementById('errorCount').textContent = error;
}

async function loadSystems() {
    try {
        const headers = getAuthHeaders();
        if (!headers) return;

        const response = await fetch(API_URL + '/sistemas', { headers });
        if (response.ok) {
            allSystems = await response.json();
            populateTargetSelect();
        } else {
            showNotification('Error al cargar sistemas', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

function populateTargetSelect() {
    const targetSelect = document.getElementById('targetSystem');
    targetSelect.innerHTML = '<option value="" class="bg-slate-800">Selecciona el sistema donde se guardarán los datos...</option>';

    allSystems.forEach(system => {
        targetSelect.insertAdjacentHTML('beforeend', `<option value="${system.id}" class="bg-slate-800">${system.name}</option>`);
    });
}

function handleTargetChange() {
    const targetId = document.getElementById('targetSystem').value;
    const btnAddSource = document.getElementById('btnAddSource');
    const sourcesContainer = document.getElementById('sourcesContainer');

    if (targetId) {
        btnAddSource.disabled = false;
        if (sourcesContainer.children.length === 0) {
            addSourceBlock();
        }
        updateAllSourceSelects();
    } else {
        btnAddSource.disabled = true;
        sourcesContainer.innerHTML = '';
        checkExportValidity();
    }
}

function addSourceBlock() {
    sourceBlockCounter++;
    const container = document.getElementById('sourcesContainer');
    const blockId = `source-block-${sourceBlockCounter}`;

    const blockHTML = `
        <div id="${blockId}" class="glass-card p-6 rounded-2xl shadow-lg relative slide-up">
            <button onclick="removeSourceBlock('${blockId}')" class="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10">
                <span class="material-symbols-outlined">close</span>
            </button>
            
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-green-500">database</span>
                Origen #${document.querySelectorAll('[id^="source-block-"]').length + 1}
            </h3>
            
            <div class="mb-4">
                <select onchange="loadFieldsForBlock('${blockId}')" class="source-system-select w-full pl-4 pr-10 py-3 bg-white/5 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none cursor-pointer text-white">
                    <option value="" class="bg-slate-800">Selecciona un sistema de origen...</option>
                </select>
            </div>
            
            <div class="fields-container hidden">
                <div class="flex items-center justify-between mb-2">
                    <label class="text-sm font-semibold text-gray-400">Columnas a exportar:</label>
                    <button onclick="toggleSelectAll('${blockId}')" class="text-xs text-primary hover:text-primary/80 font-bold">Seleccionar Todo</button>
                </div>
                <div class="fields-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 bg-black/20 rounded-xl">
                    <!-- Fields will be loaded here -->
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', blockHTML);
    populateSourceSelect(blockId);
    checkExportValidity();
}

function removeSourceBlock(blockId) {
    const block = document.getElementById(blockId);
    block.style.opacity = '0';
    block.style.transform = 'scale(0.95)';
    setTimeout(() => {
        block.remove();
        document.querySelectorAll('[id^="source-block-"] h3').forEach((header, index) => {
            header.innerHTML = `
                <span class="material-symbols-outlined text-green-500">database</span>
                Origen #${index + 1}
            `;
        });
        checkExportValidity();
    }, 200);
}

function populateSourceSelect(blockId) {
    const block = document.getElementById(blockId);
    const select = block.querySelector('.source-system-select');
    const targetId = document.getElementById('targetSystem').value;

    select.innerHTML = '<option value="" class="bg-slate-800">Selecciona un sistema de origen...</option>';

    allSystems.forEach(system => {
        if (system.id != targetId) {
            select.insertAdjacentHTML('beforeend', `<option value="${system.id}" class="bg-slate-800">${system.name}</option>`);
        }
    });
}

function updateAllSourceSelects() {
    const blocks = document.querySelectorAll('[id^="source-block-"]');
    blocks.forEach(block => {
        const select = block.querySelector('.source-system-select');
        const currentVal = select.value;
        populateSourceSelect(block.id);
        select.value = currentVal;
        if (!select.value) {
            block.querySelector('.fields-container').classList.add('hidden');
        }
    });
}

async function loadFieldsForBlock(blockId) {
    const block = document.getElementById(blockId);
    const select = block.querySelector('.source-system-select');
    const fieldsContainer = block.querySelector('.fields-container');
    const fieldsList = block.querySelector('.fields-list');
    const systemId = select.value;

    if (!systemId) {
        fieldsContainer.classList.add('hidden');
        checkExportValidity();
        return;
    }

    fieldsList.innerHTML = '<div class="col-span-full text-center py-4"><div class="loading-spinner w-6 h-6 border-2 mx-auto"></div></div>';
    fieldsContainer.classList.remove('hidden');

    try {
        const headers = getAuthHeaders();
        const response = await fetch(API_URL + `/sistemas/${systemId}/campos`, { headers });

        if (response.ok) {
            const fields = await response.json();
            fieldsList.innerHTML = '';

            if (fields.length === 0) {
                fieldsList.innerHTML = '<div class="col-span-full text-center text-gray-500 py-2">No hay campos disponibles</div>';
                return;
            }

            fields.forEach(field => {
                fieldsList.insertAdjacentHTML('beforeend', `
                    <label class="checkbox-wrapper cursor-pointer select-none hover:bg-white/5 transition-colors rounded-lg p-2">
                        <input type="checkbox" value="${field.id}" onchange="checkExportValidity()" class="w-4 h-4 text-primary rounded border-gray-600 bg-slate-800 focus:ring-primary transition-all">
                        <span class="ml-2 text-sm text-gray-200">${field.name} <span class="text-xs text-gray-500">(${field.type})</span></span>
                    </label>
                `);
            });
        }
    } catch (error) {
        console.error('Error:', error);
        fieldsList.innerHTML = '<div class="col-span-full text-center text-red-500 py-2">Error al cargar campos</div>';
    }
    checkExportValidity();
}

function toggleSelectAll(blockId) {
    const block = document.getElementById(blockId);
    const checkboxes = block.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(cb => cb.checked = !allChecked);
    checkExportValidity();
}

function checkExportValidity() {
    const targetId = document.getElementById('targetSystem').value;
    const blocks = document.querySelectorAll('[id^="source-block-"]');
    let hasValidSource = false;

    blocks.forEach(block => {
        const checked = block.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > 0) hasValidSource = true;
    });

    const btnExport = document.getElementById('btnExportAll');
    btnExport.disabled = !(targetId && hasValidSource);
}

async function executeExport() {
    const targetId = document.getElementById('targetSystem').value;
    const btnExport = document.getElementById('btnExportAll');
    const blocks = document.querySelectorAll('[id^="source-block-"]');

    if (!targetId) return;

    // UI Updates start
    const originalText = btnExport.innerHTML;
    btnExport.disabled = true;
    btnExport.innerHTML = '<div class="loading-spinner w-6 h-6 border-2"></div><span>Procesando...</span>';

    document.getElementById('processStats').classList.remove('hidden');
    document.getElementById('visualFlow').classList.remove('hidden');

    let successCount = 0;
    let errorCount = 0;
    let totalBlocks = 0;

    // Count valid blocks first
    blocks.forEach(block => {
        if (block.querySelector('input[type="checkbox"]:checked').length > 0) totalBlocks++;
    });

    updateChart(totalBlocks, 0, 0);

    for (const block of blocks) {
        const sourceId = block.querySelector('.source-system-select').value;
        const checkboxes = block.querySelectorAll('input[type="checkbox"]:checked');
        const fieldIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (sourceId && fieldIds.length > 0) {
            // Highlight current block
            block.classList.add('ring-2', 'ring-primary', 'scale-[1.02]');

            try {
                const headers = getAuthHeaders();
                const response = await fetch(API_URL + `/sistemas/${sourceId}/campos/transferir`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        fieldIds: fieldIds,
                        targetSystemId: parseInt(targetId)
                    })
                });

                block.classList.remove('ring-2', 'ring-primary', 'scale-[1.02]');

                if (response.ok) {
                    successCount++;
                    block.classList.add('border-green-500', 'border-2');
                    block.insertAdjacentHTML('beforeend', '<div class="absolute top-4 right-14 text-green-500"><span class="material-symbols-outlined">check_circle</span></div>');
                } else {
                    errorCount++;
                    block.classList.add('border-red-500', 'border-2');
                    block.insertAdjacentHTML('beforeend', '<div class="absolute top-4 right-14 text-red-500"><span class="material-symbols-outlined">error</span></div>');
                }
            } catch (error) {
                console.error('Error exporting block:', error);
                errorCount++;
                block.classList.remove('ring-2', 'ring-primary', 'scale-[1.02]');
                block.classList.add('border-red-500', 'border-2');
            }

            // Update chart after each block
            updateChart(totalBlocks - (successCount + errorCount), successCount, errorCount);

            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    document.getElementById('visualFlow').classList.add('hidden');

    if (errorCount === 0) {
        showNotification(`¡Éxito! Se exportaron datos de ${successCount} sistemas.`, 'success');
        setTimeout(() => {
            window.location.href = `../Systems/system-data.html?id=${targetId}`;
        }, 2000);
    } else {
        showNotification(`Proceso completado con ${errorCount} errores.`, 'warning');
        btnExport.disabled = false;
        btnExport.innerHTML = originalText;
    }
}
