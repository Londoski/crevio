// =========================================================
// CREVIO PROJECTS LIST JS
// =========================================================

const PROJECTS_API = '/api/projects';

// ----- DOM REFS -----
const container = document.getElementById('projectsContainer');
const messageEl = document.getElementById('projectsMessage');

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

// ----- LOAD PROJECTS -----
async function loadProjects() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(PROJECTS_API, {
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

        if (!data.success || !data.projects) {
            throw new Error('Invalid response');
        }

        renderProjects(data.projects);

    } catch (err) {
        console.error('Load projects error:', err);
        if (container) {
            container.innerHTML = `<div class="error-state">Unable to load projects.</div>`;
        }
    }
}

// ----- RENDER PROJECTS -----
function renderProjects(projects) {
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = `<div class="empty-state">No projects yet. Create one!</div>`;
        return;
    }

    let html = `
        <table class="projects-table">
            <thead>
                <tr>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Client</th>
                    <th>Year</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    projects.forEach(p => {
        html += `
            <tr>
                <td class="project-title-cell">${p.title || 'Untitled'}</td>
                <td>${p.category || '—'}</td>
                <td>${p.client_name || '—'}</td>
                <td>${p.year || '—'}</td>
                <td>
                    <div class="project-actions">
                        <button class="edit-btn" data-id="${p.id}">Edit</button>
                        <button class="delete-btn" data-id="${p.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Attach edit events
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = `/admin/pages/project-edit.html?id=${btn.dataset.id}`;
        });
    });

    // Attach delete events
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm('Delete this project permanently?')) return;

            const token = getToken();
            if (!token) return;

            try {
                const res = await fetch(`${PROJECTS_API}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const result = await res.json();

                if (!res.ok || !result.success) {
                    showMessage(result.message || 'Delete failed.', 'error');
                    return;
                }

                showMessage('Project deleted successfully.');
                loadProjects();

            } catch (err) {
                console.error(err);
                showMessage('Network error. Please try again.', 'error');
            }
        });
    });
}

// ----- INIT -----
loadProjects();