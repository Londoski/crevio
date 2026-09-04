// ===========================================================
// CREVIO MEDIA PAGE – Client-Side Logic
// ===========================================================

let currentFilter = 'all';
let currentSort = 'newest';
let currentSearch = '';
let currentPage = 1;
const limit = 24;

// -------------------------------------------------------
// Fetch and render media
// -------------------------------------------------------
async function loadMedia() {
    const token = localStorage.getItem('crevio_token');
    if (!token) return;

    const params = new URLSearchParams({
        filter: currentFilter,
        sort: currentSort,
        search: currentSearch,
        page: currentPage,
        limit
    });

    try {
        const res = await fetch(`/api/media?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load media');
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        renderStats(data.stats);
        renderGrid(data.media);
        renderPagination(data.pagination);

    } catch (err) {
        document.getElementById('mediaGrid').innerHTML = `
            <div class="media-empty">
                <i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i>
                <p>${err.message}</p>
            </div>
        `;
    }
}

// -------------------------------------------------------
// Render stats
// -------------------------------------------------------
function renderStats(stats) {
    const container = document.getElementById('mediaStats');
    container.innerHTML = `
        <span class="stat-item"><span class="stat-number">${stats.total_media}</span> Media</span>
        <span class="stat-item"><span class="stat-number">${stats.images}</span> Images</span>
        <span class="stat-item"><span class="stat-number">${stats.videos}</span> Videos</span>
        <span class="stat-item"><span class="stat-number">${stats.used}</span> Used</span>
        <span class="stat-item"><span class="stat-number">${stats.unassigned}</span> Unassigned</span>
        <span class="stat-item">Storage: ${formatBytes(stats.storage_used)}</span>
    `;
}

// -------------------------------------------------------
// Render media grid
// -------------------------------------------------------
function renderGrid(items) {
    const grid = document.getElementById('mediaGrid');

    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div class="media-empty">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>You haven't uploaded any media yet.</p>
                <p style="font-size:0.9rem;margin-top:0.5rem;">Upload your first image or video to start building your media library.</p>
                <button class="btn-primary" style="margin-top:1rem;display:inline-flex;" id="emptyUploadBtn">
                    <i class="fas fa-plus"></i> Upload Media
                </button>
            </div>
        `;
        const btn = document.getElementById('emptyUploadBtn');
        if (btn) btn.addEventListener('click', () => openUploadModal());
        return;
    }

    let html = '';
    items.forEach(item => {
        const isVideo = item.media_type && item.media_type.startsWith('video/');
        const thumb = item.thumbnail_url || item.media_url || '';
        const title = item.title || path.basename(item.media_url) || 'Untitled';
        const projectName = item.project_id ? 'Assigned' : 'Unassigned';
        const duration = item.duration ? formatDuration(item.duration) : '';

        html += `
            <div class="media-card" data-id="${item.id}">
                <input type="checkbox" class="card-checkbox" data-id="${item.id}" />
                <div class="card-actions">
                    <button class="card-menu-btn" data-id="${item.id}"><i class="fas fa-ellipsis-v"></i></button>
                </div>
                <div class="card-thumb">
                    ${thumb ? (isVideo ? `<video src="${thumb}" muted></video>` : `<img src="${thumb}" alt="${title}" />`) : (isVideo ? `<i class="fas fa-video"></i>` : `<i class="fas fa-image"></i>`)}
                    ${isVideo ? `<span class="play-indicator"><i class="fas fa-play"></i></span>` : ''}
                    ${duration ? `<span style="position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.7rem;">${duration}</span>` : ''}
                </div>
                <div class="card-body">
                    <div class="card-title">${title}</div>
                    <div class="card-meta">
                        <span>${isVideo ? 'Video' : 'Image'}</span>
                        <span>${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="card-project">${projectName}</div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;

    // Attach event listeners to cards (click to preview, etc.)
    grid.querySelectorAll('.media-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-checkbox') || e.target.closest('.card-actions')) return;
            const id = card.dataset.id;
            openPreview(id);
        });
    });
}

// -------------------------------------------------------
// Render pagination
// -------------------------------------------------------
function renderPagination(pagination) {
    const container = document.getElementById('mediaPagination');
    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = '';
    for (let i = 1; i <= pagination.pages; i++) {
        html += `<button class="${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            loadMedia();
        });
    });
}

// -------------------------------------------------------
// Utility functions
// -------------------------------------------------------
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2,'0')}`;
}

function pathBasename(url) {
    return url.split('/').pop().split('?')[0];
}

// -------------------------------------------------------
// Upload modal (placeholder for Stage 4)
// -------------------------------------------------------
function openUploadModal() {
    alert('Upload functionality coming in Stage 4.');
}

// -------------------------------------------------------
// Preview (placeholder for Stage 6)
// -------------------------------------------------------
function openPreview(id) {
    alert(`Preview media ${id} coming in Stage 6.`);
}

// -------------------------------------------------------
// Init: wire up events
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            currentPage = 1;
            loadMedia();
        });
    });

    // Sort select
    document.getElementById('mediaSort').addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        loadMedia();
    });

    // Search input (debounced)
    const searchInput = document.getElementById('mediaSearch');
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = searchInput.value.trim();
            currentPage = 1;
            loadMedia();
        }, 400);
    });

    // Upload button
    document.getElementById('uploadMediaBtn').addEventListener('click', openUploadModal);

    // Load initial media
    loadMedia();
});