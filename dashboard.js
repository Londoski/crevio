// =========================================================
// CREVIO DASHBOARD JS
// =========================================================

// ----- DOM REFS -----
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutButton');
const mobileToggle = document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

// ----- AUTH -----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}
<span id="themeToggleBtn" class="theme-toggle-btn" onclick="toggleTheme()" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;color:var(--text-secondary);font-size:18px;">
    <i data-lucide="moon" class="icon"></i>
</span>

// ----- LOGOUT -----
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('crevio_token');
        localStorage.removeItem('crevio_user');
        window.location.href = '/admin/pages/login.html';
    });
}

// ----- THEME -----
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
    }
}
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('crevio_theme', next);
        updateThemeIcon(next);
        refreshIcons();
    });
}

// ----- MOBILE -----
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

// ----- USER INFO -----
function loadUserInfo() {
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatarEl = document.getElementById('userAvatar');
            const nameEl = document.getElementById('userName');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatarEl && user.display_name) avatarEl.textContent = user.display_name.charAt(0).toUpperCase();
            if (nameEl && user.display_name) nameEl.textContent = user.display_name;
            if (nameDisplay && user.display_name) nameDisplay.textContent = user.display_name;
        } catch (e) { console.error(e); }
    }
}

// ----- HELPERS -----
function timeAgo(dateStr) {
    const now = new Date();
    const past = new Date(dateStr);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

// ----- REFRESH ICONS -----
function refreshIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ----- RENDER DASHBOARD -----
async function loadDashboard() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/dashboard', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        if (!data.success || !data.dashboard) throw new Error('Invalid response');

        const { user, stats, recent_projects } = data.dashboard;

        // --- Portfolio Status ---
        const urlEl = document.getElementById('portfolioUrl');
        if (urlEl) urlEl.textContent = user.username + '.crevio.site';
        const badge = document.getElementById('statusBadge');
        if (badge) {
            const status = stats.status || 'Draft';
            badge.textContent = status;
            badge.className = 'status-badge ' + status.toLowerCase();
        }

        // --- Stats ---
        document.getElementById('projectsCount').textContent = stats.projects || 0;
        document.getElementById('mediaCount').textContent = stats.media || 0;
        document.getElementById('servicesCount').textContent = stats.services || 0;
        document.getElementById('skillsCount').textContent = stats.skills || 0;

        // --- Completion ---
        const completion = stats.completion || 0;
        document.getElementById('completionLabel').textContent = completion + '% complete';
        document.getElementById('completionFill').style.width = completion + '%';

        // --- Checklist ---
        const checklist = document.getElementById('checklist');
        if (checklist) {
            const items = [
                { label: 'Add profile photo', done: !!user.profile_image },
                { label: 'Complete your bio', done: !!(user.bio && user.bio.trim().length > 0) },
                { label: 'Add your first project', done: stats.projects > 0 },
                { label: 'Add a service', done: stats.services > 0 },
                { label: 'Add a skill', done: stats.skills > 0 },
                { label: 'Add social links', done: stats.social > 0 }
            ];
            checklist.innerHTML = items.map(item =>
                `<div class="checklist-item ${item.done ? 'done' : ''}">
                    <span class="check">${item.done ? '✅' : '⬜'}</span>
                    ${item.label}
                </div>`
            ).join('');
            refreshIcons();
        }

        // --- Recent Projects ---
        const container = document.getElementById('projectsContainer');
        if (container) {
            if (!recent_projects || recent_projects.length === 0) {
                container.innerHTML = '<div class="empty-state">No projects yet. Create your first project!</div>';
            } else {
                container.innerHTML = recent_projects.map(p => `
                    <a href="/dashboard/pages/project-edit.html?id=${p.id}" class="project-item">
                        <img src="${p.thumbnail_url || '/assets/images/placeholder.jpg'}" alt="${p.title || 'Project'}" class="project-thumb" loading="lazy" onerror="this.style.display='none'">
                        <div class="project-info">
                            <h4>${p.title || 'Untitled'}</h4>
                            <span>${p.category || 'Uncategorized'} · ${timeAgo(p.created_at)}</span>
                        </div>
                        <span class="project-badge">${p.media_count || 0} media</span>
                    </a>
                `).join('');
                refreshIcons();
            }
        }

        // --- Activity Feed (placeholder) ---
        const activityContainer = document.getElementById('activityContainer');
        if (activityContainer) {
            activityContainer.innerHTML = `
                <div class="activity-item">
                    <span>👋 Welcome to Crevio!</span>
                    <span class="time">just now</span>
                </div>
                <div class="activity-item">
                    <span>📁 Start by adding your first project</span>
                    <span class="time">—</span>
                </div>
            `;
            refreshIcons();
        }

        // --- Quick Action placeholders ---
        document.getElementById('addServiceBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Services management will be available soon.');
        });
        document.getElementById('addSkillBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Skills management will be available soon.');
        });

        // --- Refresh icons after all dynamic content ---
        refreshIcons();

    } catch (err) {
        console.error('Dashboard error:', err);
        document.getElementById('projectsContainer').innerHTML = '<div class="error-state">Unable to load dashboard.</div>';
    }
}

// ----- INIT -----
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadUserInfo();
    loadDashboard();
    // Ensure icons are created
    refreshIcons();
});

// Inside the nav click handler (in dashboard.js)
if (section === 'overview') {
    // ... existing overview rendering
} else if (section === 'media') {
    // Show media section, hide others
    document.querySelectorAll('.content-area').forEach(el => el.style.display = 'none');
    document.getElementById('mediaContent').style.display = 'block';
    pageTitle.textContent = 'Media';
    // Load media (already loaded via media.js init)
} else {
    // ... other placeholders
}