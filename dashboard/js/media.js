// =========================================================
// CREVIO — MEDIA JS
// =========================================================

console.log('✅ media.js loaded');

// ---- DOM refs ----
const grid = document.getElementById('mediaGrid');
const searchInput = document.getElementById('searchInput');
const filterPills = document.querySelectorAll('.filter-pills .pill');
const uploadBtn = document.getElementById('uploadBtn');
const emptyUploadBtn = document.getElementById('emptyUploadBtn');
const uploadModal = document.getElementById('uploadModal');
const closeUploadModal = document.getElementById('closeUploadModal');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');
const finalizeUploadBtn = document.getElementById('finalizeUploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadProgress = document.getElementById('uploadProgress');
const detailPanel = document.getElementById('detailPanel');
const closeDetailPanel = document.getElementById('closeDetailPanel');
const detailBody = document.getElementById('detailBody');
const detailActions = document.getElementById('detailActions');
const bulkBar = document.getElementById('bulkBar');
const selectedCount = document.getElementById('selectedCount');
const bulkAssignBtn = document.getElementById('bulkAssignBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const bulkClearBtn = document.getElementById('bulkClearBtn');

// ---- State ----
let mediaItems = [];
let selectedIds = new Set();
let currentFilter = 'all';
let currentSearch = '';
let currentPage = 1;
let isUploading = false;

// ---- AUTH ----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- API HELPERS ----
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(endpoint, {
        ...options,
        headers: {
            'Authorization': 'Bearer ' + token,
            ...options.headers
        }
    });
    if (res.status === 401) {
        localStorage.removeItem('crevio_token');
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return res;
}

// ---- LOAD MEDIA ----
async function loadMedia() {
    const params = new URLSearchParams();
    if (currentFilter !== 'all') params.append('filter', currentFilter);
    if (currentSearch) params.append('search', currentSearch);

    try {
        const res = await apiFetch('/api/media?' + params.toString());
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load media');
        mediaItems = data.media || [];
        renderMedia(mediaItems);
        updateStats(mediaItems);
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div class="empty-state"><i data-lucide="alert-circle" class="icon"></i><h3>Unable to load media</h3><p>Please refresh the page.</p></div>';
    }
}

// ---- RENDER MEDIA ----
function renderMedia(items) {
    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i data-lucide="image" class="icon"></i>
                <h3>No media found</h3>
                <p>${currentSearch ? 'Try a different search term.' : 'Upload your first image or video.'}</p>
                ${!currentSearch ? `<button class="primary-button" id="emptyUploadBtn2"><i data-lucide="upload" class="icon"></i> Upload Media</button>` : ''}
            </div>
        `;
        const emptyBtn = document.getElementById('emptyUploadBtn2');
        if (emptyBtn) emptyBtn.addEventListener('click', () => openUploadModal());
        refreshIcons();
        return;
    }

    let html = '';
    items.forEach(item => {
        const isSelected = selectedIds.has(item.id);
        const isVideo = item.media_type && item.media_type.startsWith('video');
        const thumb = item.thumbnail_url || item.media_url || '';
        const projectName = item.project_name || null;
        const projectClass = projectName ? '' : 'unassigned';

        html += `
            <div class="media-card" data-id="${item.id}" data-selected="${isSelected}">
                <div class="checkbox-wrap">
                    <input type="checkbox" class="media-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                </div>
                <div class="thumbnail" style="background: var(--bg-secondary);">
                    ${thumb ? `<img src="${thumb}" alt="${item.title || item.filename}" loading="lazy">` : `<span style="color:var(--text-muted);font-size:12px;">No preview</span>`}
                    ${isVideo ? `<div class="video-overlay"><div class="play-icon">▶</div></div>` : ''}
                    <span class="file-type-badge">${isVideo ? 'Video' : 'Image'}</span>
                </div>
                <div class="info">
                    <div class="name" title="${item.title || item.filename}">${item.title || item.filename}</div>
                    <div class="meta">
                        <span class="project ${projectClass}" title="${projectName || 'Unassigned'}">${projectName || 'Unassigned'}</span>
                        <span style="font-size:10px;">${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                    </div>
                </div>
                <button class="more-btn" data-id="${item.id}" title="Actions">⋯</button>
            </div>
        `;
    });
    grid.innerHTML = html;

    // ---- Event listeners ----
    // Checkbox toggle
    grid.querySelectorAll('.media-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            if (this.checked) {
                selectedIds.add(id);
            } else {
                selectedIds.delete(id);
            }
            updateBulkBar();
            // update card selected state
            const card = this.closest('.media-card');
            if (card) card.dataset.selected = this.checked ? 'true' : 'false';
        });
    });

    // Click card to open details (unless checkbox clicked)
    grid.querySelectorAll('.media-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.checkbox-wrap') || e.target.closest('.more-btn')) return;
            const id = parseInt(this.dataset.id);
            const item = mediaItems.find(m => m.id === id);
            if (item) openDetailPanel(item);
        });
    });

    // More button
    grid.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const item = mediaItems.find(m => m.id === id);
            if (item) openDetailPanel(item);
        });
    });

    refreshIcons();
}

// ---- UPDATE STATS ----
function updateStats(items) {
    const total = items.length;
    const images = items.filter(m => m.media_type && m.media_type.startsWith('image')).length;
    const videos = items.filter(m => m.media_type && m.media_type.startsWith('video')).length;
    const used = items.filter(m => m.project_id).length;
    const unassigned = items.filter(m => !m.project_id).length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('imageCount').textContent = images;
    document.getElementById('videoCount').textContent = videos;
    document.getElementById('usedCount').textContent = used;
    document.getElementById('unassignedCount').textContent = unassigned;
}

// ---- FILTERS & SEARCH ----
filterPills.forEach(pill => {
    pill.addEventListener('click', function() {
        filterPills.forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        loadMedia();
    });
});

searchInput.addEventListener('input', function() {
    currentSearch = this.value.trim();
    loadMedia();
});

// ---- BULK BAR ----
function updateBulkBar() {
    const count = selectedIds.size;
    if (count > 0) {
        bulkBar.classList.add('show');
        selectedCount.textContent = `${count} selected`;
    } else {
        bulkBar.classList.remove('show');
    }
}

bulkClearBtn.addEventListener('click', function() {
    selectedIds.clear();
    updateBulkBar();
    // uncheck all checkboxes
    grid.querySelectorAll('.media-checkbox').forEach(cb => cb.checked = false);
    grid.querySelectorAll('.media-card').forEach(card => card.dataset.selected = 'false');
});

bulkDeleteBtn.addEventListener('click', async function() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected media items? This cannot be undone.`)) return;
    const ids = Array.from(selectedIds);
    try {
        const res = await apiFetch('/api/media/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Bulk delete failed');
        selectedIds.clear();
        updateBulkBar();
        loadMedia();
    } catch (err) {
        alert('❌ ' + err.message);
    }
});

bulkAssignBtn.addEventListener('click', function() {
    if (selectedIds.size === 0) return;
    // Open a simple project selector (we'll prompt for now)
    const projectName = prompt('Enter project name to assign (or leave blank to unassign):');
    if (projectName === null) return;
    assignBulkToProject(Array.from(selectedIds), projectName.trim() || null);
});

async function assignBulkToProject(ids, projectName) {
    try {
        const res = await apiFetch('/api/media/bulk/assign', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, projectName })
        });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Assignment failed');
        selectedIds.clear();
        updateBulkBar();
        loadMedia();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// ---- UPLOAD ----
function openUploadModal() {
    uploadModal.classList.add('open');
    fileInput.value = '';
    uploadProgress.innerHTML = '';
    finalizeUploadBtn.disabled = true;
    isUploading = false;
}

function closeUploadModalFn() {
    uploadModal.classList.remove('open');
    fileInput.value = '';
    uploadProgress.innerHTML = '';
    finalizeUploadBtn.disabled = true;
    isUploading = false;
}

uploadBtn.addEventListener('click', openUploadModal);
emptyUploadBtn.addEventListener('click', openUploadModal);
closeUploadModal.addEventListener('click', closeUploadModalFn);
cancelUploadBtn.addEventListener('click', closeUploadModalFn);

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = 'var(--accent)';
    this.style.background = 'var(--accent-dim)';
});
uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.style.borderColor = '';
    this.style.background = '';
});
uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '';
    this.style.background = '';
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFiles(fileInput.files);
    }
});

fileInput.addEventListener('change', function() {
    if (this.files.length) {
        handleFiles(this.files);
    }
});

function handleFiles(files) {
    // Show selected files in progress area
    let html = '';
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        html += `
            <div class="file-item" data-index="${i}">
                <span>${file.name}</span>
                <span style="font-size:11px;color:var(--text-muted);">${(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <div class="progress-bar"><div class="fill" style="width:0%;"></div></div>
                <span class="status">Pending</span>
            </div>
        `;
    }
    uploadProgress.innerHTML = html;
    finalizeUploadBtn.disabled = false;
}

finalizeUploadBtn.addEventListener('click', async function() {
    if (isUploading) return;
    const files = fileInput.files;
    if (!files || files.length === 0) return;

    isUploading = true;
    this.disabled = true;
    this.textContent = 'Uploading...';

    const total = files.length;
    let completed = 0;
    let errors = [];

    for (let i = 0; i < total; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('media', file);

        try {
            const res = await apiFetch('/api/media/upload', {
                method: 'POST',
                body: formData,
                headers: {} // Let browser set Content-Type
            });
            if (!res) continue;
            const data = await res.json();
            if (!data.success) {
                errors.push({ file: file.name, error: data.message || 'Upload failed' });
                updateFileStatus(i, 'error');
            } else {
                updateFileStatus(i, 'success');
            }
        } catch (err) {
            errors.push({ file: file.name, error: err.message });
            updateFileStatus(i, 'error');
        }
        completed++;
        const progress = Math.round((completed / total) * 100);
        // Update overall progress? We'll just update individual bars.
    }

    isUploading = false;
    this.disabled = false;
    this.textContent = 'Upload';

    if (errors.length === 0) {
        alert('✅ All files uploaded successfully!');
        closeUploadModalFn();
        loadMedia();
    } else {
        let msg = 'Some files failed to upload:\n';
        errors.forEach(e => msg += `- ${e.file}: ${e.error}\n`);
        alert('❌ ' + msg);
        // Keep modal open so user can retry
        finalizeUploadBtn.disabled = true; // disable until new files selected
    }
});

function updateFileStatus(index, status) {
    const items = uploadProgress.querySelectorAll('.file-item');
    if (items[index]) {
        const statusEl = items[index].querySelector('.status');
        const bar = items[index].querySelector('.fill');
        if (status === 'success') {
            statusEl.textContent = '✅ Done';
            statusEl.className = 'status success';
            bar.style.width = '100%';
        } else {
            statusEl.textContent = '❌ Failed';
            statusEl.className = 'status error';
            bar.style.width = '100%';
            bar.style.background = 'var(--danger)';
        }
    }
}

// ---- DETAIL PANEL ----
function openDetailPanel(item) {
    const isVideo = item.media_type && item.media_type.startsWith('video');
    const thumb = item.thumbnail_url || item.media_url || '';
    const projectName = item.project_name || 'Unassigned';

    detailBody.innerHTML = `
        <div class="preview">
            ${isVideo ? `<video controls src="${item.media_url}" poster="${thumb}"></video>` : `<img src="${item.media_url}" alt="${item.title || item.filename}">`}
        </div>
        <div class="field">
            <label>Title</label>
            <div class="value">${item.title || item.filename}</div>
        </div>
        <div class="field">
            <label>Type</label>
            <div class="value">${item.media_type || 'Unknown'}</div>
        </div>
        <div class="field">
            <label>Project</label>
            <div class="value"><span class="badge ${projectName === 'Unassigned' ? 'unassigned' : ''}">${projectName}</span></div>
        </div>
        <div class="field">
            <label>Description</label>
            <div class="value">${item.description || 'No description'}</div>
        </div>
        <div class="field">
            <label>File Size</label>
            <div class="value">${item.file_size ? (item.file_size / 1024 / 1024).toFixed(1) + ' MB' : '—'}</div>
        </div>
        <div class="field">
            <label>Added</label>
            <div class="value">${item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</div>
        </div>
    `;

    detailActions.innerHTML = `
        <button class="btn btn-secondary" id="detailEditBtn"><i data-lucide="edit-2" style="width:14px;height:14px;"></i> Edit</button>
        <button class="btn btn-secondary" id="detailAssignBtn"><i data-lucide="folder" style="width:14px;height:14px;"></i> Assign</button>
        <button class="btn btn-secondary" id="detailDownloadBtn"><i data-lucide="download" style="width:14px;height:14px;"></i> Download</button>
        <button class="btn btn-danger" id="detailDeleteBtn"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> Delete</button>
    `;

    detailPanel.classList.add('open');

    // ---- Action listeners ----
    document.getElementById('detailEditBtn').addEventListener('click', function() {
        const newTitle = prompt('Enter new title:', item.title || item.filename);
        if (newTitle !== null && newTitle.trim() !== '') {
            updateMedia(item.id, { title: newTitle.trim() });
        }
    });

    document.getElementById('detailAssignBtn').addEventListener('click', function() {
        const projectName = prompt('Enter project name to assign (or leave blank to unassign):', item.project_name || '');
        if (projectName === null) return;
        updateMedia(item.id, { project_name: projectName.trim() || null });
    });

    document.getElementById('detailDownloadBtn').addEventListener('click', function() {
        window.open(item.media_url, '_blank');
    });

    document.getElementById('detailDeleteBtn').addEventListener('click', function() {
        if (!confirm(`Delete "${item.title || item.filename}"?`)) return;
        deleteMedia(item.id);
    });

    refreshIcons();
}

closeDetailPanel.addEventListener('click', function() {
    detailPanel.classList.remove('open');
});

// ---- UPDATE MEDIA (PUT) ----
async function updateMedia(id, updates) {
    try {
        const res = await apiFetch(`/api/media/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Update failed');
        loadMedia();
        // Close detail panel if open
        detailPanel.classList.remove('open');
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// ---- DELETE MEDIA ----
async function deleteMedia(id) {
    try {
        const res = await apiFetch(`/api/media/${id}`, { method: 'DELETE' });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Delete failed');
        loadMedia();
        detailPanel.classList.remove('open');
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadMedia();
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) avatar.textContent = user.display_name.charAt(0).toUpperCase();
            if (nameDisplay && user.display_name) nameDisplay.textContent = user.display_name;
        } catch (e) { console.error(e); }
    }
});