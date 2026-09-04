// =========================================================
// CREVIO — DASHBOARD JS (Overview)
// =========================================================

function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- LOAD DASHBOARD DATA ----
async function loadDashboard() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/dashboard/overview', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load dashboard');

        const overview = data.overview || {};

        // ---- Update stats ----
        document.getElementById('projectsCount').textContent = overview.total_projects ?? 0;
        document.getElementById('publishedCount').textContent = overview.published_projects ?? 0;
        document.getElementById('mediaCount').textContent = overview.total_media ?? 0;
        document.getElementById('servicesCount').textContent = overview.total_services ?? 0;
        document.getElementById('skillsCount').textContent = overview.total_skills ?? 0;

        // ---- Portfolio status ----
        const isPublished = overview.portfolio_published ?? false;
        const statusBadge = document.getElementById('statusBadge');
        const statusText = statusBadge.querySelector('.status-text');
        const statusIcon = statusBadge.querySelector('.status-icon');
        if (isPublished) {
            statusBadge.className = 'status-badge published';
            statusText.textContent = 'Published';
            statusIcon.setAttribute('data-lucide', 'check-circle');
        } else {
            statusBadge.className = 'status-badge draft';
            statusText.textContent = 'Draft';
            statusIcon.setAttribute('data-lucide', 'edit-3');
        }

        const username = overview.username || 'creator';
        document.getElementById('portfolioUrl').textContent = username + '.crevio.site';

        // ---- COMPLETION (FIXED) ----
        const completion = overview.completion ?? 0;
        document.getElementById('completionLabel').textContent = completion + '% complete';
        document.getElementById('completionFill').style.width = completion + '%';

        // ---- Checklist ----
        const checklist = overview.checklist || [];
        const checklistEl = document.getElementById('checklist');
        if (checklist.length) {
            let html = '';
            checklist.forEach(item => {
                const done = item.done ? 'done' : '';
                const checkIcon = item.done ? 'check-circle' : 'circle';
                html += `
                    <div class="checklist-item ${done}">
                        <i data-lucide="${checkIcon}" class="check" style="width:16px;height:16px;color:${item.done ? 'var(--success)' : 'var(--text-muted)'};"></i>
                        ${item.label}
                    </div>
                `;
            });
            checklistEl.innerHTML = html;
        } else {
            checklistEl.innerHTML = '<div class="loading-state">No checklist items</div>';
        }

        // ---- Recent projects ----
        const projects = overview.recent_projects || [];
        const projectsContainer = document.getElementById('projectsContainer');
        if (projects.length) {
            let html = '';
            projects.forEach(p => {
                const thumb = p.thumbnail_url || '';
                const status = p.published ? 'Published' : 'Draft';
                html += `
                    <a href="/dashboard/pages/project-edit.html?id=${p.id}" class="project-item">
                        ${thumb ? `<img src="${thumb}" alt="${p.title}" class="project-thumb">` : `<div class="project-thumb" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:18px;font-weight:600;">${p.title.charAt(0)}</div>`}
                        <div class="project-info">
                            <h4>${p.title}</h4>
                            <span>${p.category || 'Uncategorized'} · ${new Date(p.updated_at).toLocaleDateString()}</span>
                        </div>
                        <span class="project-badge">${status}</span>
                    </a>
                `;
            });
            projectsContainer.innerHTML = html;
        } else {
            projectsContainer.innerHTML = '<div class="empty-state">No projects yet. <a href="/dashboard/pages/project-create.html" style="color:var(--accent);">Create your first project</a></div>';
        }

        // ---- Recent activity ----
        const activities = overview.recent_activity || [];
        const activityContainer = document.getElementById('activityContainer');
        if (activities.length) {
            let html = '';
            activities.forEach(a => {
                html += `
                    <div class="activity-item">
                        <i data-lucide="${a.icon || 'activity'}" style="width:16px;height:16px;color:var(--text-muted);"></i>
                        <span>${a.message}</span>
                        <span class="time">${a.time_ago || ''}</span>
                    </div>
                `;
            });
            activityContainer.innerHTML = html;
        } else {
            activityContainer.innerHTML = '<div class="empty-state">No recent activity</div>';
        }

        // ---- Refresh Lucide icons ----
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (err) {
        console.error('Dashboard load error:', err);
        document.querySelectorAll('.stat-value').forEach(el => el.textContent = '—');
        document.getElementById('projectsContainer').innerHTML = '<div class="error-state">Unable to load dashboard.</div>';
    }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();

    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            const userName = document.getElementById('userName');
            if (avatar && user.display_name) {
                avatar.textContent = user.display_name.charAt(0).toUpperCase();
            }
            if (nameDisplay && user.display_name) {
                nameDisplay.textContent = user.display_name;
            }
            if (userName && user.display_name) {
                userName.textContent = user.display_name;
            }
        } catch (e) { console.error(e); }
    }
});