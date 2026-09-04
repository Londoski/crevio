// =========================================================
// CREVIO — PORTFOLIO JS
// =========================================================

const container = document.getElementById('portfolioContainer');

function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- LOAD PORTFOLIO ----
async function loadPortfolio() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/portfolio/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        if (!data.success) throw new Error('Failed to load portfolio');

        renderPortfolio(data.config);

    } catch (err) {
        console.error('Portfolio load error:', err);
        container.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load portfolio.</div>';
    }
}

// ---- RENDER ----
function renderPortfolio(config) {
    const isPublished = config.published === 1;
    const statusClass = isPublished ? 'published' : 'draft';
    const statusText = isPublished ? 'Published' : 'Draft';
    const username = localStorage.getItem('crevio_user') ? JSON.parse(localStorage.getItem('crevio_user')).username : 'creator';

    const templateName = config.template_name || 'No template selected';
    const templateDesc = config.template_description || 'Choose a template to get started';
    const templateInitial = templateName.charAt(0).toUpperCase();

    const html = `
        <div class="portfolio-card">

            <!-- HEADER -->
            <div class="portfolio-header">
                <div>
                    <h2>My Portfolio</h2>
                    <div class="status-row">
                        <span class="status-badge ${statusClass}">
                            <i data-lucide="${isPublished ? 'check-circle' : 'edit-3'}" style="width:14px;height:14px;"></i>
                            ${statusText}
                        </span>
                        <span class="portfolio-link" onclick="copyPortfolioLink()">
                            <i data-lucide="link" style="width:14px;height:14px;"></i>
                            /u/${username}
                        </span>
                    </div>
                </div>
                <a href="/dashboard/pages/portfolio-edit.html" class="btn btn-primary">
                    <i data-lucide="edit-3" style="width:16px;height:16px;"></i> Edit Portfolio
                </a>
            </div>

            <!-- TEMPLATE PREVIEW -->
            <div class="template-preview">
                <div class="icon-box">${templateInitial}</div>
                <div class="info">
                    <div class="name">${templateName}</div>
                    <div class="desc">${templateDesc}</div>
                </div>
                <div class="meta">
                    <i data-lucide="check" style="width:14px;height:14px;color:var(--success);"></i>
                    Updated ${new Date(config.updated_at).toLocaleDateString()}
                </div>
            </div>

            <!-- ACTIONS -->
            <div class="actions-row">
                <a href="/u/${username}" target="_blank" class="btn btn-secondary">
                    <i data-lucide="eye" style="width:16px;height:16px;"></i> View Public Portfolio
                </a>
                <button class="btn btn-secondary" onclick="copyPortfolioLink()">
                    <i data-lucide="copy" style="width:16px;height:16px;"></i> Copy Link
                </button>
                <button class="btn ${isPublished ? 'btn-warning' : 'btn-primary'}" onclick="togglePublish()">
                    <i data-lucide="${isPublished ? 'eye-off' : 'globe'}" style="width:16px;height:16px;"></i>
                    ${isPublished ? 'Unpublish' : 'Publish'}
                </button>
            </div>

        </div>
    `;

    container.innerHTML = html;
    refreshIcons();
}

// ---- TOGGLE PUBLISH ----
async function togglePublish() {
    const token = getToken();
    if (!token) return;

    const currentPublished = document.querySelector('.status-badge.published') !== null;
    const newStatus = !currentPublished;
    const action = newStatus ? 'publish' : 'unpublish';

    if (!confirm(`Are you sure you want to ${action} your portfolio?`)) return;

    try {
        const res = await fetch('/api/portfolio/publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ published: newStatus })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update publish status.');

        loadPortfolio();

    } catch (err) {
        console.error('Publish toggle error:', err);
        alert('❌ ' + err.message);
    }
}

// ---- COPY PORTFOLIO LINK ----
function copyPortfolioLink() {
    const username = localStorage.getItem('crevio_user') ? JSON.parse(localStorage.getItem('crevio_user')).username : 'creator';
    const url = window.location.origin + '/u/' + username;
    navigator.clipboard.writeText(url).then(() => {
        alert('✅ Portfolio link copied!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('✅ Portfolio link copied!');
    });
}

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadPortfolio();
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) {
                avatar.textContent = user.display_name.charAt(0).toUpperCase();
            }
            if (nameDisplay && user.display_name) {
                nameDisplay.textContent = user.display_name;
            }
        } catch (e) { console.error(e); }
    }
});