let editingSystemId = null;

document.addEventListener('DOMContentLoaded', () => {
    initDropZone();

    // Listen for data from parent
    window.addEventListener('message', (event) => {
        if (event.data.type === 'editSystem') {
            loadSystemData(event.data.payload);
        } else if (event.data.type === 'resetForm') {
            resetForm();
        }
    });

    // Notify parent we are ready
    window.parent.postMessage({ type: 'iframeReady' }, '*');
});

// --- Tab Logic ---
function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`content-${tabId}`).classList.remove('hidden');

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-tab', 'border-primary', 'text-primary');
        btn.classList.add('border-transparent');
    });

    const activeBtn = document.getElementById(`tab-${tabId}`);
    activeBtn.classList.add('active-tab', 'border-primary', 'text-primary');
    activeBtn.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
}

function toggleSecurityFields() {
    const mode = document.getElementById('securityMode').value;
    const pwdContainer = document.getElementById('generalPasswordContainer');

    if (mode === 'general') {
        pwdContainer.classList.remove('hidden');
    } else {
        pwdContainer.classList.add('hidden');
        document.getElementById('generalPassword').value = '';
    }
}

function addFieldRow(data = null) {
    const container = document.getElementById('fieldsContainer');
    const noMsg = document.getElementById('noFieldsMsg');

    if (noMsg) noMsg.classList.add('hidden');

    const template = document.getElementById('fieldRowTemplate');
    const clone = template.content.cloneNode(true);

    if (data) {
        clone.querySelector('.field-name').value = data.name;
        clone.querySelector('.field-type').value = data.type;
        clone.querySelector('.field-required').checked = data.required;
    }

    container.appendChild(clone);
}

function removeField(btn) {
    const row = btn.closest('.field-row');
    row.remove();

    const container = document.getElementById('fieldsContainer');
    if (container.children.length === 1 && container.children[0].id === 'noFieldsMsg') {
        document.getElementById('noFieldsMsg').classList.remove('hidden');
    } else if (container.querySelectorAll('.field-row').length === 0) {
        document.getElementById('noFieldsMsg').classList.remove('hidden');
    }
}

function initDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const removeBtn = document.getElementById('removeImageBtn');

    dropZone.addEventListener('click', (e) => {
        if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-primary/5', 'scale-[1.02]');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.02]');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.02]');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileUpload(files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) handleFileUpload(fileInput.files[0]);
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeImage();
    });
}

function removeImage() {
    document.getElementById('newSystemImage').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('removeImageBtn').classList.add('hidden');
    document.getElementById('fileInput').value = '';

    document.getElementById('uploadPlaceholder').classList.remove('opacity-0');
}

async function handleFileUpload(file) {
    if (!file.type.startsWith('image/')) return alert('Solo se permiten imágenes');

    const formData = new FormData();
    formData.append('file', file);

    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const originalContent = uploadPlaceholder.innerHTML;

    uploadPlaceholder.innerHTML = '<span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>';

    try {
        const res = await fetch('http://localhost:8080/api/upload/image', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            const imageUrl = data.url.startsWith('http') ? data.url : `http://localhost:8080${data.url}`;

            document.getElementById('newSystemImage').value = imageUrl;

            const imgPreview = document.getElementById('imagePreview');
            imgPreview.src = imageUrl;
            imgPreview.classList.remove('hidden');
            document.getElementById('removeImageBtn').classList.remove('hidden');

            uploadPlaceholder.classList.add('opacity-0');
            setTimeout(() => { uploadPlaceholder.innerHTML = originalContent; }, 500);

        } else {
            throw new Error('Upload failed');
        }
    } catch (e) {
        alert('Error al subir imagen');
        uploadPlaceholder.innerHTML = originalContent;
    }
}

function loadSystemData(sys) {
    editingSystemId = sys.id;
    document.getElementById('newSystemName').value = sys.name || '';
    document.getElementById('newSystemDesc').value = sys.description || '';
    document.getElementById('newSystemImage').value = sys.imageUrl || '';

    if (sys.securityMode) {
        document.getElementById('securityMode').value = sys.securityMode;
        toggleSecurityFields();
    }

    if (sys.imageUrl) {
        document.getElementById('imagePreview').src = sys.imageUrl;
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('removeImageBtn').classList.remove('hidden');
        document.getElementById('uploadPlaceholder').classList.add('opacity-0');
    } else {
        removeImage();
    }

    document.getElementById('btnSave').innerHTML = '<span class="material-symbols-outlined">save</span> Actualizar';
}

function resetForm() {
    editingSystemId = null;
    document.getElementById('newSystemName').value = '';
    document.getElementById('newSystemDesc').value = '';
    document.getElementById('securityMode').value = 'none';
    document.getElementById('generalPassword').value = '';
    toggleSecurityFields();
    removeImage();

    const container = document.getElementById('fieldsContainer');
    container.innerHTML = '<div class="text-center py-10 text-gray-400" id="noFieldsMsg"><p>No has agregado campos.</p></div>';

    switchTab('general');
    document.getElementById('btnSave').innerHTML = '<span class="material-symbols-outlined">check_circle</span> Guardar';
}

function cancelform() {
    window.parent.postMessage({ type: 'closeModal' }, '*');
}

async function submitForm() {
    const name = document.getElementById('newSystemName').value.trim();
    const description = document.getElementById('newSystemDesc').value.trim();
    const imageUrl = document.getElementById('newSystemImage').value.trim();
    const securityMode = document.getElementById('securityMode').value;
    const generalPassword = document.getElementById('generalPassword').value;

    const fields = [];
    document.querySelectorAll('.field-row').forEach((row, index) => {
        const fieldName = row.querySelector('.field-name').value.trim();
        if (fieldName) {
            fields.push({
                name: fieldName,
                type: row.querySelector('.field-type').value,
                required: row.querySelector('.field-required').checked,
                orderIndex: index
            });
        }
    });

    if (!name) {
        alert('El nombre del sistema es requerido');
        return;
    }

    if (securityMode === 'general' && !generalPassword && !editingSystemId) {
        alert('La contraseña es requerida para el modo de seguridad general');
        return;
    }

    window.parent.postMessage({ type: 'startLoading' }, '*');

    const method = editingSystemId ? 'PUT' : 'POST';
    const url = editingSystemId ? `/systems/${editingSystemId}` : '/systems';

    const payload = {
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        securityMode,
        generalPassword: securityMode === 'general' && generalPassword ? generalPassword : null,
        fields: fields.length > 0 ? fields : null
    };

    try {
        const res = await apiFetch(url, {
            method: method,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            window.parent.postMessage({ type: 'systemSaved' }, '*');
            resetForm();
        } else {
            const errorData = await res.json();
            alert(errorData.message || errorData.error || 'Error al guardar el sistema');
            window.parent.postMessage({ type: 'stopLoading' }, '*');
        }
    } catch (e) {
        console.error('Error:', e);
        alert('Error de conexión. Por favor intenta nuevamente.');
        window.parent.postMessage({ type: 'stopLoading' }, '*');
    }
}
