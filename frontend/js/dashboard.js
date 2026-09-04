// ===========================================================
// CREVIO DASHBOARD – Client‑Side Logic (with Media)
// ===========================================================

document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------
    // 1. DOM Refs
    // -------------------------------------------------------
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('contentArea');
    const pageTitle = document.getElementById('pageTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const unreadBadge = document.getElementById('unread-badge');
    const userName = document.getElementById('userName');

    // -------------------------------------------------------
    // 2. Auth Check – redirect if no token
    // -------------------------------------------------------
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Decode JWT to get username
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userName.textContent = payload.username || 'Creator';
    } catch {
        userName.textContent = 'Creator';
    }

    // -------------------------------------------------------
    // 3. API Helper
    // -------------------------------------------------------
    const api = async (endpoint, options = {}) => {
        const res = await fetch(`/api${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }
        return res.json();
    };

    // -------------------------------------------------------
    // 4. Render Overview
    // -------------------------------------------------------
    async function renderOverview() {
        try {
            const data = await api('/dashboard');
            if (!data.success) throw new Error(data.message);

            const { stats, recent_projects, recent_activity } = data;

            // Stats cards
            const statsHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-folder-open"></i></div>
                        <div class="stat-number">${stats.total_projects}</div>
                        <div class="stat-label">Total Projects</div>
                        <div class="stat-sub">${stats.published_projects} published</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-eye"></i></div>
                        <div class="stat-number">${stats.total_views}</div>
                        <div class="stat-label">Total Views</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-envelope"></i></div>
                        <div class="stat-number">${stats.total_inquiries}</div>
                        <div class="stat-label">Inquiries</div>
                        <div class="stat-sub">${stats.unread_inquiries} unread</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-rocket"></i></div>
                        <div class="stat-number">${recent_projects.length}</div>
                        <div class="stat-label">Recent Updates</div>
                    </div>
                </div>
            `;

            // Recent Projects
            let projectsHTML = '';
            if (recent_projects.length === 0) {
                projectsHTML = `<p style="color: var(--text-secondary);">No projects yet. <a href="#" style="color: var(--accent);">Create one</a></p>`;
            } else {
                recent_projects.forEach(p => {
                    const statusClass = p.is_published ? 'published' : 'draft';
                    const statusText = p.is_published ? 'Published' : 'Draft';
                    const initial = p.title ? p.title.charAt(0).toUpperCase() : '📄';
                    projectsHTML += `
                        <div class="project-item">
                            <div class="project-thumb">${initial}</div>
                            <div class="project-info">
                                <div class="title">${p.title || 'Untitled'}</div>
                                <div class="meta">Updated ${new Date(p.updated_at).toLocaleDateString()}</div>
                            </div>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                    `;
                });
            }

            // Recent Activity
            let activityHTML = '';
            if (recent_activity.length === 0) {
                activityHTML = `<p style="color: var(--text-secondary);">No recent activity.</p>`;
            } else {
                recent_activity.forEach(a => {
                    const icon = a.type === 'project_updated' ? 'fa-pen' : 'fa-info';
                    activityHTML += `
                        <div class="activity-item">
                            <span class="activity-icon"><i class="fas ${icon}"></i></span>
                            <span class="activity-text">${a.message}</span>
                            <span class="activity-time">${new Date(a.timestamp).toLocaleDateString()}</span>
                        </div>
                    `;
                });
            }

            contentArea.innerHTML = `
                ${statsHTML}
                <div class="section-row">
                    <div class="section-card">
                        <h3>Recent Projects <a href="#">View all →</a></h3>
                        ${projectsHTML}
                    </div>
                    <div class="section-card">
                        <h3>Recent Activity</h3>
                        ${activityHTML}
                    </div>
                </div>
            `;

            // Update unread badge
            if (unreadBadge) {
                unreadBadge.textContent = stats.unread_inquiries || 0;
                unreadBadge.style.display = stats.unread_inquiries > 0 ? 'inline' : 'none';
            }

            pageTitle.textContent = 'Overview';

        } catch (err) {
            contentArea.innerHTML = `
                <div style="text-align:center; padding: 4rem; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444;"></i>
                    <p style="margin-top:1rem;">Failed to load dashboard: ${err.message}</p>
                </div>
            `;
        }
    }

    // -------------------------------------------------------
    // 5. Navigation Handling (includes Media)
    // -------------------------------------------------------
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;

            // Update active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            if (section === 'overview') {
                renderOverview();
                pageTitle.textContent = 'Overview';
            } else if (section === 'media') {
                // Show media section, hide others
                document.querySelectorAll('.content-area').forEach(el => el.style.display = 'none');
                const mediaContent = document.getElementById('mediaContent');
                if (mediaContent) mediaContent.style.display = 'block';
                pageTitle.textContent = 'Media';
                // Media content is loaded by media.js on its own
            } else {
                // Placeholder for other sections
                const labels = {
                    portfolio: 'Portfolio',
                    projects: 'Projects',
                    media: 'Media',
                    socials: 'My Socials',
                    bot: 'Crevio Bot',
                    messages: 'Messages',
                    notifications: 'Notifications',
                    billing: 'Billing',
                    security: 'Security',
                    settings: 'Settings'
                };
                pageTitle.textContent = labels[section] || 'Section';
                // Hide all content areas and show a placeholder
                document.querySelectorAll('.content-area').forEach(el => el.style.display = 'none');
                const placeholder = document.createElement('div');
                placeholder.className = 'content-area';
                placeholder.style.display = 'block';
                placeholder.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 5rem 0; color: var(--text-secondary);">
                        <i class="fas fa-code" style="font-size: 4rem; margin-bottom: 1rem; opacity:0.3;"></i>
                        <h2 style="font-weight:400;">${labels[section] || 'Coming Soon'}</h2>
                        <p style="margin-top:0.5rem;">This section is under development.</p>
                    </div>
                `;
                contentArea.parentNode.insertBefore(placeholder, contentArea);
                contentArea.style.display = 'none';
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // -------------------------------------------------------
    // 6. Toggle Sidebar (mobile)
    // -------------------------------------------------------
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && e.target !== menuToggle) {
                sidebar.classList.remove('open');
            }
        }
    });

    // -------------------------------------------------------
    // 7. Logout
    // -------------------------------------------------------
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await api('/auth/logout', { method: 'POST' });
            } catch {}
            localStorage.removeItem('crevio_token');
            window.location.href = '/login.html';
        });
    }

    // -------------------------------------------------------
    // 8. Load Overview by Default
    // -------------------------------------------------------
    renderOverview();
});