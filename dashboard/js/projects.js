// =========================================================
// CREVIO PROJECTS JS (with proper theme handling)
// =========================================================

// ----- DOM REFS -----
const container = document.getElementById('projectsContainer');
const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutButton');
const mobileToggle = document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

let projectToDelete = null;

// ----- AUTH -----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ----- LOGOUT -----
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('crevio_token');
        localStorage.removeItem('crevio_user');
        window.location.href = '/admin/pages/login.html';
    });
}

// ----- THEME TOGGLE (FIXED) -----
function initTheme() {
    const saved = localStorage.getItem('crevio_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
    if (themeToggle) {
        const icon = themeToggle.querySelector('.icon');
        if (icon) {
            icon.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
        }
        // Update the button text (optional)
        // themeToggle.innerHTML = '<i data-lucide="' + (theme === 'dark' ? 'moon' : 'sun') + '" class="icon"></i> Theme';
        // But we'll just update the attribute and call refreshIcons
    }
}

// Handle theme toggle click
if (themeToggle) {
    // Initialize theme on load
    initTheme();

    themeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('crevio_theme', next);
        updateThemeIcon(next);
        // Refresh icons after changing the attribute
        refreshIcons();
    });
}

// ----- MOBILE TOGGLE -----
if (mobileToggle && sidebar && overlay) {
    mobileToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    });
}

// ----- USER INFO -----
function loadUserInfo() {
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatarEl = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatarEl && user.display_name) {
                avatarEl.textContent = user.display_name.charAt(0).toUpperCase();
            }
            if (nameDisplay && user.display_name) {
                nameDisplay.textContent = user.display_name;
            }
        } catch (e) {
            console.error('Error loading user info:', e);
        }
    }
}
loadUserInfo();

// ----- HELPERS -----
function refreshIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ----- LOAD PROJECTS -----
async function loadProjects() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/projects', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        if (!data.success || !data.projects) throw new Error('Invalid response');

        renderProjects(data.projects);

    } catch (err) {
        console.error('Load projects error:', err);
        container.innerHTML = '<div class="error-state">Unable to load projects.</div>';
    }
}

// ----- RENDER PROJECTS -----
function renderProjects(projects) {
    if (!projects || projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No projects yet. Create your first project to showcase your work.</p>
                <a href="/dashboard/pages/project-create.html" class="primary-button" style="margin-top:12px; display:inline-flex; align-items:center; gap:6px;">
                    <i data-lucide="plus" class="icon"></i> New Project
                </a>
            </div>
        `;
        refreshIcons();
        return;
    }

    let html = `
        <div class="table-wrap">
            <table class="projects-table">
                <thead>
                    <tr>
                        <th>Thumbnail</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Client</th>
                        <th>Year</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    projects.forEach(function(p) {
        const title = p.title || 'Untitled';
        const category = p.category || '—';
        const client = p.client_name || '—';
        const year = p.year || '—';
        const thumb = p.thumbnail_url ? `<img src="${p.thumbnail_url}" alt="${title}" loading="lazy" onerror="this.style.display='none'">` : '—';

        html += `
            <tr>
                <td class="thumbnail-cell">${thumb}</td>
                <td class="title-cell">${title}</td>
                <td>${category}</td>
                <td>${client}</td>
                <td>${year}</td>
                <td class="actions-cell">
                    <a href="/dashboard/pages/project-edit.html?id=${p.id}" class="btn-icon" title="Edit">
                        <i data-lucide="edit-2" style="width:18px;height:18px;"></i>
                    </a>
                    <button class="btn-icon danger" data-id="${p.id}" data-title="${title}" title="Delete">
                        <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // Attach delete events
    container.querySelectorAll('.btn-icon.danger').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const title = this.dataset.title;
            showDeleteModal(id, title);
        });
    });

    refreshIcons();
}

// ----- DELETE MODAL -----
function showDeleteModal(id, title) {
    projectToDelete = id;
    deleteMessage.textContent = 'Are you sure you want to delete "' + title + '"? This action cannot be undone.';
    deleteModal.classList.add('open');
}

function closeDeleteModal() {
    deleteModal.classList.remove('open');
    projectToDelete = null;
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}
if (deleteModal) {
    deleteModal.addEventListener('click', function(e) {
        if (e.target === deleteModal) closeDeleteModal();
    });
}
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async function() {
        if (!projectToDelete) return;
        const id = projectToDelete;
        this.disabled = true;
        this.textContent = 'Deleting...';

        try {
            const token = getToken();
            if (!token) return;
            const res = await fetch('/api/projects/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
            closeDeleteModal();
            await loadProjects();
            refreshIcons();
        } catch (err) {
            console.error('Delete error:', err);
            alert(err.message || 'Unable to delete project.');
        } finally {
            this.disabled = false;
            this.textContent = 'Delete';
        }
    });
}

// ----- INIT -----
document.addEventListener('DOMContentLoaded', function() {
    // Ensure theme is applied on load
    initTheme();
    loadProjects();
    refreshIcons();
});