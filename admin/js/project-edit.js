// =========================================================
// CREVIO PROJECT EDIT JS
// =========================================================

const PROJECTS_API = '/api/projects';
const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');

if (!projectId) {
    window.location.href = '/admin/pages/projects.html';
}

// ----- DOM REFS -----
const loadingEl = document.getElementById('loading');
const formEl = document.getElementById('projectForm');
const messageEl = document.getElementById('formMessage');

// ----- AUTH CHECK -----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ----- LOGOUT -----
const logoutBtn = document.getElementById('logoutButton');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('crevio_token');
        localStorage.removeItem('crevio_user');
        window.location.href = '/admin/pages/login.html';
    });
}

// ----- THEME TOGGLE -----
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    const saved = localStorage.getItem('crevio_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    themeToggle.textContent = saved === 'dark' ? '🌙' : '☀️';

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('crevio_theme', next);
        themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
    });
}

// ----- SHOW MESSAGE -----
function showMessage(text, type = 'success') {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `dashboard-message ${type}`;
    setTimeout(() => {
        messageEl.className = 'dashboard-message';
        messageEl.textContent = '';
    }, 4000);
}

// ----- LOAD PROJECT -----
async function loadProject() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${PROJECTS_API}/${projectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/admin/pages/login.html';
                return;
            }
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!data.success || !data.project) {
            throw new Error('Project not found');
        }

        renderProject(data.project);

    } catch (err) {
        console.error('Load project error:', err);
        if (loadingEl) {
            loadingEl.className = 'error-state';
            loadingEl.textContent = 'Unable to load this project.';
        }
    }
}

// ----- RENDER PROJECT -----
function renderProject(project) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (formEl) formEl.style.display = 'block';

    document.getElementById('title').value = project.title || '';
    document.getElementById('description').value = project.description || '';
    document.getElementById('category').value = project.category || '';
    document.getElementById('year').value = project.year || '';
    document.getElementById('client').value = project.client_name || '';
    document.getElementById('url').value = project.project_url || '';
    document.getElementById('thumbnail').value = project.thumbnail_url || '';
}

// ----- SUBMIT FORM -----
if (formEl) {
    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = getToken();
        if (!token) return;

        const data = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            year: parseInt(document.getElementById('year').value) || null,
            client_name: document.getElementById('client').value,
            project_url: document.getElementById('url').value,
            thumbnail_url: document.getElementById('thumbnail').value,
        };

        try {
            const res = await fetch(`${PROJECTS_API}/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                showMessage(result.message || 'Update failed.', 'error');
                return;
            }

            showMessage('Project updated successfully.');
            setTimeout(() => {
                window.location.href = '/admin/pages/projects.html';
            }, 1200);

        } catch (err) {
            console.error(err);
            showMessage('Network error. Please try again.', 'error');
        }
    });
}

// ----- DELETE PROJECT -----
const deleteBtn = document.getElementById('deleteBtn');
if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this project permanently? This cannot be undone.')) return;

        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${PROJECTS_API}/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                showMessage(result.message || 'Delete failed.', 'error');
                return;
            }

            showMessage('Project deleted successfully.');
            setTimeout(() => {
                window.location.href = '/admin/pages/projects.html';
            }, 1200);

        } catch (err) {
            console.error(err);
            showMessage('Network error. Please try again.', 'error');
        }
    });
}

// ----- INIT -----
loadProject();