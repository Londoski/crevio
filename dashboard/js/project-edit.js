// =========================================================
// CREVIO PROJECT EDIT JS (FIXED)
// =========================================================

// ----- DOM REFS -----
const form = document.getElementById('projectForm');
const formContainer = document.getElementById('projectFormContainer');
const loadingState = document.getElementById('loadingState');
const mediaSection = document.getElementById('mediaSection');
const mediaGrid = document.getElementById('mediaGrid');
const mediaCount = document.getElementById('mediaCount');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadStatus = document.getElementById('uploadStatus');
const submitBtn = document.getElementById('submitBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const messageEl = document.getElementById('formMessage');

// Delete modal
const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// ----- STATE -----
let projectId = null;
let currentMedia = [];

// ----- GET PROJECT ID -----
function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { window.location.href = '/dashboard/pages/projects.html'; return null; }
    return parseInt(id);
}
projectId = getProjectId();

// ----- AUTH -----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ----- THEME / LOGOUT / MOBILE (shared) -----
function initTheme() {
    const saved = localStorage.getItem('crevio_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}
initTheme();

document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('crevio_token');
    localStorage.removeItem('crevio_user');
    window.location.href = '/admin/pages/login.html';
});

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('crevio_theme', next);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
}

const mobileToggle = document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
if (mobileToggle && sidebar && overlay) {
    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    });
}

// User info
const userData = localStorage.getItem('crevio_user');
if (userData) {
    try {
        const user = JSON.parse(userData);
        const avatarEl = document.getElementById('userAvatar');
        const nameDisplay = document.getElementById('userNameDisplay');
        if (avatarEl && user.display_name) avatarEl.textContent = user.display_name.charAt(0).toUpperCase();
        if (nameDisplay && user.display_name) nameDisplay.textContent = user.display_name;
    } catch (e) { console.error(e); }
}

// ----- HELPERS -----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
function showMessage(text, type = 'success') {
    messageEl.style.display = 'block';
    messageEl.textContent = text;
    messageEl.className = 'form-message ' + type;
}
function hideMessage() {
    messageEl.style.display = 'none';
}

// ----- LOAD PROJECT -----
async function loadProject() {
    const token = getToken();
    if (!token || !projectId) return;

    try {
        const res = await fetch(`/api/projects/${projectId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        if (!data.success || !data.project) throw new Error('Project not found');

        populateForm(data.project);
        currentMedia = data.project.media || [];
        renderMedia(currentMedia);

        loadingState.style.display = 'none';
        formContainer.style.display = 'block';
        mediaSection.style.display = 'block';

        document.getElementById('pageTitle').textContent = data.project.title || 'Edit Project';

    } catch (err) {
        console.error('Load error:', err);
        loadingState.innerHTML = `<div class="error-state">Unable to load project.</div>`;
    }
}

// ----- POPULATE FORM (USING .value) -----
function populateForm(project) {
    // All fields are inputs/textarea, so we set .value
    document.getElementById('title').value = project.title || '';
    document.getElementById('description').value = project.description || '';
    document.getElementById('category').value = project.category || '';
    document.getElementById('year').value = project.year || '';
    document.getElementById('client_name').value = project.client_name || '';
    document.getElementById('project_url').value = project.project_url || '';
    document.getElementById('thumbnail_url').value = project.thumbnail_url || '';
}

// ----- RENDER MEDIA -----
function renderMedia(mediaItems) {
    if (!mediaItems || mediaItems.length === 0) {
        mediaGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:20px 0;">No media uploaded yet.</div>`;
        mediaCount.textContent = '0 files';
        saveOrderBtn.style.display = 'none';
        return;
    }

    const sorted = [...mediaItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    let html = '';
    sorted.forEach(media => {
        const isImage = media.media_type === 'image';
        html += `
            <div class="media-item" data-id="${media.id}" data-order="${media.sort_order || 0}">
                <div class="preview">
                    ${isImage ? `<img src="${media.media_url}" alt="${media.title || 'Media'}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=placeholder>Image unavailable</span>'">` :
                    `<video src="${media.media_url}" preload="metadata" controls></video>`}
                </div>
                <div class="info">
                    <span class="title" title="${media.title || 'Untitled'}">${media.title || 'Untitled'}</span>
                    <div class="actions">
                        <input type="number" class="order-input" value="${media.sort_order || 0}" min="0" data-id="${media.id}">
                        <button class="danger" data-id="${media.id}" title="Delete media">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    mediaGrid.innerHTML = html;
    mediaCount.textContent = mediaItems.length + ' files';
    saveOrderBtn.style.display = 'block';
    refreshIcons();

    // Delete media events
    mediaGrid.querySelectorAll('.actions .danger').forEach(btn => {
        btn.addEventListener('click', () => deleteMedia(parseInt(btn.dataset.id)));
    });
}

// ----- SAVE PROJECT -----
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    const data = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        category: document.getElementById('category').value.trim(),
        year: parseInt(document.getElementById('year').value) || null,
        client_name: document.getElementById('client_name').value.trim(),
        project_url: document.getElementById('project_url').value.trim(),
        thumbnail_url: document.getElementById('thumbnail_url').value.trim()
    };

    if (!data.title) { showMessage('Project title is required.', 'error'); return; }

    hideMessage();
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';

    try {
        const res = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.message || 'Update failed.');
        showMessage('Project updated successfully!', 'success');
        document.getElementById('pageTitle').textContent = data.title;
        await loadProject();
    } catch (err) {
        console.error('Update error:', err);
        showMessage(err.message || 'Unable to update project.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="save" class="icon"></i> Save Changes';
        refreshIcons();
    }
});

// ----- UPLOAD MEDIA -----
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--accent)'; });
uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        uploadFiles();
    }
});
fileInput.addEventListener('change', uploadFiles);

async function uploadFiles() {
    const token = getToken();
    if (!token) return;
    const files = fileInput.files;
    if (!files.length) return;

    uploadStatus.textContent = `Uploading ${files.length} file(s)...`;
    uploadStatus.style.color = 'var(--text-secondary)';

    let successCount = 0, errorCount = 0;
    for (const file of files) {
        const formData = new FormData();
        formData.append('media', file);
        try {
            const res = await fetch(`/api/projects/${projectId}/media/upload`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) successCount++; else errorCount++;
        } catch (err) { errorCount++; console.error(err); }
    }

    await loadProject();
    uploadStatus.textContent = errorCount === 0 ? `✅ ${successCount} file(s) uploaded!` : `⚠️ ${successCount} uploaded, ${errorCount} failed.`;
    uploadStatus.style.color = errorCount === 0 ? '#22c55e' : '#ef4444';
    fileInput.value = '';
    setTimeout(() => { uploadStatus.textContent = ''; }, 5000);
}

// ----- DELETE MEDIA -----
async function deleteMedia(mediaId) {
    if (!confirm('Delete this media permanently?')) return;
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/projects/${projectId}/media/${mediaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
        await loadProject();
    } catch (err) {
        console.error('Delete media error:', err);
        alert(err.message || 'Unable to delete media.');
    }
}

// ----- SAVE MEDIA ORDER -----
saveOrderBtn.addEventListener('click', async () => {
    const token = getToken();
    if (!token) return;
    const inputs = mediaGrid.querySelectorAll('.order-input');
    const updates = [];
    inputs.forEach(input => updates.push({ mediaId: parseInt(input.dataset.id), sortOrder: parseInt(input.value) || 0 }));
    if (!updates.length) return;
    saveOrderBtn.disabled = true;
    saveOrderBtn.innerHTML = 'Saving...';
    try {
        for (const update of updates) {
            const res = await fetch(`/api/projects/${projectId}/media/${update.mediaId}/order`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ sort_order: update.sortOrder })
            });
            if (!res.ok) throw new Error('Failed to update order');
        }
        await loadProject();
        uploadStatus.textContent = '✅ Media order updated!';
        uploadStatus.style.color = '#22c55e';
        setTimeout(() => { uploadStatus.textContent = ''; }, 3000);
    } catch (err) {
        console.error('Save order error:', err);
        alert('Unable to save media order.');
    } finally {
        saveOrderBtn.disabled = false;
        saveOrderBtn.innerHTML = '<i data-lucide="save" class="icon"></i> Save Order';
        refreshIcons();
    }
});

// ----- DELETE PROJECT -----
deleteBtn.addEventListener('click', () => {
    deleteMessage.textContent = 'Are you sure you want to delete this project? This will also delete all associated media. This action cannot be undone.';
    deleteModal.classList.add('open');
});
cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.remove('open'));
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) deleteModal.classList.remove('open'); });

confirmDeleteBtn.addEventListener('click', async () => {
    const token = getToken();
    if (!token) return;
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';
    try {
        const res = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
        deleteModal.classList.remove('open');
        window.location.href = '/dashboard/pages/projects.html';
    } catch (err) {
        console.error('Delete project error:', err);
        alert(err.message || 'Unable to delete project.');
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Delete';
    }
});

// ----- INIT -----
loadProject();