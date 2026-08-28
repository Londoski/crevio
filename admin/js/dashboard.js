// =========================================================
// CREVIO ADMIN DASHBOARD JS
// =========================================================

const API_BASE = '/api/dashboard';
const PROJECTS_API = '/api/projects';

// ----- STATE -----
let chartInstance = null;

// ----- DOM REFS -----
const themeToggle = document.getElementById('themeToggle');
const projectList = document.getElementById('projectsContainer');
const messageEl = document.getElementById('dashboardMessage');

const statEls = {
    projects: document.getElementById('projectsCount'),
    media: document.getElementById('mediaCount'),
    storage: document.getElementById('storageUsed'),
    categories: document.getElementById('categoriesCount'),
};

// ----- THEME TOGGLE -----
function initTheme() {
    const saved = localStorage.getItem('crevio_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('crevio_theme', next);
        updateThemeIcon(next);
        // Re-render chart with new theme colors
        if (chartInstance) {
            const canvas = document.getElementById('projectChart');
            if (canvas) loadDashboard();
        }
    });
}

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

// ----- FORMAT HELPERS -----
function formatStorage(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(dateStr) {
    const now = new Date();
    const past = new Date(dateStr);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function showMessage(text, type = 'success') {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `dashboard-message ${type}`;
    setTimeout(() => {
        messageEl.className = 'dashboard-message';
        messageEl.textContent = '';
    }, 4000);
}

// ----- LOAD DASHBOARD DATA -----
async function loadDashboard() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(API_BASE, {
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

        if (!data.success || !data.dashboard) {
            throw new Error('Invalid dashboard response');
        }

        renderDashboard(data.dashboard);

    } catch (err) {
        console.error('Dashboard load error:', err);
        if (projectList) {
            projectList.innerHTML = `<div class="error-state">Unable to load dashboard.</div>`;
        }
    }
}

// ----- RENDER -----
function renderDashboard(dash) {
    const { stats, recent_projects } = dash;

    // Stats
    if (statEls.projects) statEls.projects.textContent = stats.projects || 0;
    if (statEls.media) statEls.media.textContent = stats.media || 0;
    if (statEls.storage) {
        // Approximate storage: assume 2MB per media file
        const storageBytes = (stats.media || 0) * 2 * 1024 * 1024;
        statEls.storage.textContent = formatStorage(storageBytes);
    }
    if (statEls.categories) {
        // Approximate categories: assume 1 per 2 projects
        statEls.categories.textContent = Math.ceil((stats.projects || 0) / 2);
    }

    // Recent Projects
    if (!projectList) return;

    if (!recent_projects || recent_projects.length === 0) {
        projectList.innerHTML = `<div class="empty-state">No projects yet.</div>`;
        return;
    }

    projectList.innerHTML = recent_projects.map(p => `
        <a href="/admin/pages/project-edit.html?id=${p.id}" class="project-item">
            <img src="${p.thumbnail_url || '/assets/images/placeholder.jpg'}" 
                 alt="${p.title || 'Project'}" 
                 class="project-thumb"
                 loading="lazy"
                 onerror="this.src='/assets/images/placeholder.jpg'">
            <div class="project-info">
                <h4>${p.title || 'Untitled Project'}</h4>
                <span>${p.category || 'Uncategorized'} · ${timeAgo(p.created_at)}</span>
            </div>
            <span class="project-badge">${p.media_count || 0} media</span>
        </a>
    `).join('');

    // Chart
    renderChart(recent_projects);
}

// ----- CHART -----
function renderChart(projects) {
    const canvas = document.getElementById('projectChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Generate weekly data (based on created_at)
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const data = weeks.map((_, i) => {
        return projects.filter(p => {
            const d = new Date(p.created_at);
            const week = Math.floor((d.getDate() - 1) / 7);
            return week === i;
        }).length;
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Projects Created',
                data: data,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#2563eb',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(20, 24, 34, 0.9)' : 'rgba(255,255,255,0.9)',
                    titleColor: isDark ? '#f1f3f7' : '#111827',
                    bodyColor: isDark ? '#a0a8b8' : '#4b5563',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: isDark ? '#6b7485' : '#9ca3af',
                    },
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#6b7485' : '#9ca3af',
                    },
                    grid: { display: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });
}

// ----- ADD PROJECT BUTTON -----
const addBtn = document.getElementById('addProjectButton');
if (addBtn) {
    addBtn.addEventListener('click', () => {
        window.location.href = '/admin/pages/project-new.html';
    });
}

// ----- INIT -----
initTheme();
loadDashboard();