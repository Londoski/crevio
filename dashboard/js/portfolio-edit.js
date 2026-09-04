// =========================================================
// CREVIO — PORTFOLIO EDIT JS (with preview theme support)
// =========================================================

console.log('✅ portfolio-edit.js loaded');

// ---- DOM refs ----
const templateGrid = document.getElementById('templateGrid');
const themeSettingsContainer = document.getElementById('themeSettingsContainer');
const previewFrameWrapper = document.getElementById('previewFrameWrapper');
const publishStatusContainer = document.getElementById('publishStatusContainer');

let currentConfig = null;
let selectedTemplateId = null;

// ---- AUTH ----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- TABS ----
document.querySelectorAll('.edit-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const tabName = this.dataset.tab;
        document.querySelectorAll('.edit-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + tabName).classList.add('active');
        if (tabName === 'preview') loadPreview();
        if (tabName === 'publish') loadPublishStatus();
    });
});

// ---- LOAD CONFIG ----
async function loadConfig() {
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
        if (!data.success) throw new Error('Failed to load portfolio config');

        currentConfig = data.config;
        selectedTemplateId = currentConfig.template_id;

        await loadTemplates();
        await loadThemeSettings();

    } catch (err) {
        console.error('Load config error:', err);
        templateGrid.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load portfolio configuration.</div>';
    }
}

// ---- LOAD TEMPLATES ----
async function loadTemplates() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/portfolio/templates', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load templates');

        renderTemplates(data.templates);

    } catch (err) {
        console.error('Load templates error:', err);
        templateGrid.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load templates.</div>';
    }
}

// ---- RENDER TEMPLATES ----
function renderTemplates(templates) {
    if (!templates || templates.length === 0) {
        templateGrid.innerHTML = '<div class="empty-state">No templates available.</div>';
        return;
    }

    let html = '';
    templates.forEach(t => {
        const isSelected = selectedTemplateId === t.id;
        const bg = '#1E293B';
        const accent = '#2563EB';

        html += `
            <div class="template-card ${isSelected ? 'selected' : ''}" data-id="${t.id}" onclick="selectTemplate(${t.id})">
                ${isSelected ? '<div class="check-mark">✓</div>' : ''}
                <div class="preview-box" style="background:${bg};color:#fff;">
                    <span class="label">${t.name}</span>
                    <span class="sub">${t.category || 'Template'}</span>
                    <div class="bar" style="background:${accent};"></div>
                </div>
                <div class="name">${t.name}</div>
                <div class="desc">${t.description || ''}</div>
                <span class="category-tag">${t.category || 'General'}</span>
            </div>
        `;
    });

    templateGrid.innerHTML = html;
    refreshIcons();
}

// ---- SELECT TEMPLATE ----
window.selectTemplate = async function(templateId) {
    const token = getToken();
    if (!token) return;

    if (selectedTemplateId === templateId) return;

    if (!confirm('Switch to this template? Your content will remain unchanged.')) return;

    try {
        const res = await fetch('/api/portfolio/template', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ templateId })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to update template.');

        selectedTemplateId = templateId;
        await loadConfig();
        await loadTemplates();
        await loadThemeSettings();

    } catch (err) {
        console.error('Select template error:', err);
        alert('❌ ' + err.message);
    }
};

// ---- LOAD THEME SETTINGS ----
async function loadThemeSettings() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/portfolio/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load theme settings');

        const config = data.config;
        let themeSettings = {};
        try {
            themeSettings = JSON.parse(config.theme_settings || '{}');
        } catch (e) {}

        renderThemeSettings(themeSettings, config);

    } catch (err) {
        console.error('Load theme settings error:', err);
        themeSettingsContainer.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load theme settings.</div>';
    }
}

// ---- RENDER THEME SETTINGS ----
function renderThemeSettings(settings, config) {
    const colors = settings.colors || {
        background: '#0F172A',
        surface: '#1E293B',
        primary: '#F1F5F9',
        secondary: '#94A3B8',
        accent: '#2563EB'
    };
    const typography = settings.typography || {
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif'
    };
    const layout = settings.layout || {
        navigation: 'centered',
        heroSize: 'full'
    };
    const animations = settings.animations !== undefined ? settings.animations : true;

    const html = `
        <div class="theme-grid">
            <div class="theme-group">
                <h4>Colors</h4>
                <div class="field">
                    <label>Background</label>
                    <input type="color" id="themeBg" value="${colors.background || '#0F172A'}">
                </div>
                <div class="field">
                    <label>Surface</label>
                    <input type="color" id="themeSurface" value="${colors.surface || '#1E293B'}">
                </div>
                <div class="field">
                    <label>Primary Text</label>
                    <input type="color" id="themePrimary" value="${colors.primary || '#F1F5F9'}">
                </div>
                <div class="field">
                    <label>Secondary Text</label>
                    <input type="color" id="themeSecondary" value="${colors.secondary || '#94A3B8'}">
                </div>
                <div class="field">
                    <label>Accent</label>
                    <input type="color" id="themeAccent" value="${colors.accent || '#2563EB'}">
                </div>
                <button class="btn btn-primary" onclick="saveThemeSettings()" style="margin-top:8px;width:100%;">
                    <i data-lucide="save" class="icon"></i> Save Colors
                </button>
            </div>

            <div class="theme-group">
                <h4>Typography & Layout</h4>
                <div class="field">
                    <label>Heading Font</label>
                    <select id="headingFont">
                        <option value="Inter, sans-serif" ${typography.headingFont === 'Inter, sans-serif' ? 'selected' : ''}>Inter</option>
                        <option value="Playfair Display, serif" ${typography.headingFont === 'Playfair Display, serif' ? 'selected' : ''}>Playfair Display</option>
                        <option value="Georgia, serif" ${typography.headingFont === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                        <option value="Poppins, sans-serif" ${typography.headingFont === 'Poppins, sans-serif' ? 'selected' : ''}>Poppins</option>
                    </select>
                </div>
                <div class="field">
                    <label>Body Font</label>
                    <select id="bodyFont">
                        <option value="Inter, sans-serif" ${typography.bodyFont === 'Inter, sans-serif' ? 'selected' : ''}>Inter</option>
                        <option value="System UI, sans-serif" ${typography.bodyFont === 'System UI, sans-serif' ? 'selected' : ''}>System UI</option>
                        <option value="Georgia, serif" ${typography.bodyFont === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
                    </select>
                </div>
                <div class="field">
                    <label>Navigation Style</label>
                    <select id="navStyle">
                        <option value="minimal" ${layout.navigation === 'minimal' ? 'selected' : ''}>Minimal</option>
                        <option value="centered" ${layout.navigation === 'centered' ? 'selected' : ''}>Centered</option>
                        <option value="sidebar" ${layout.navigation === 'sidebar' ? 'selected' : ''}>Sidebar</option>
                    </select>
                </div>
                <div class="field">
                    <label>Hero Size</label>
                    <select id="heroSize">
                        <option value="small" ${layout.heroSize === 'small' ? 'selected' : ''}>Small</option>
                        <option value="medium" ${layout.heroSize === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="full" ${layout.heroSize === 'full' ? 'selected' : ''}>Full</option>
                    </select>
                </div>
                <div class="field" style="display:flex;align-items:center;gap:8px;">
                    <label style="margin:0;">Enable Animations</label>
                    <input type="checkbox" id="animations" ${animations ? 'checked' : ''}>
                </div>
                <button class="btn btn-primary" onclick="saveThemeSettings()" style="margin-top:8px;width:100%;">
                    <i data-lucide="save" class="icon"></i> Save Theme
                </button>
            </div>
        </div>
    `;

    themeSettingsContainer.innerHTML = html;
    refreshIcons();
}

// ---- SAVE THEME SETTINGS (with preview update) ----
window.saveThemeSettings = async function() {
    const token = getToken();
    if (!token) return;

    const settings = {
        colors: {
            background: document.getElementById('themeBg').value,
            surface: document.getElementById('themeSurface').value,
            primary: document.getElementById('themePrimary').value,
            secondary: document.getElementById('themeSecondary').value,
            accent: document.getElementById('themeAccent').value
        },
        typography: {
            headingFont: document.getElementById('headingFont').value,
            bodyFont: document.getElementById('bodyFont').value
        },
        layout: {
            navigation: document.getElementById('navStyle').value,
            heroSize: document.getElementById('heroSize').value
        },
        animations: document.getElementById('animations').checked
    };

    try {
        const res = await fetch('/api/portfolio/theme', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(settings)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to save theme settings.');

        // ---- SAVE TO LOCALSTORAGE FOR PREVIEW ----
        localStorage.setItem('crevio_preview_theme', JSON.stringify(settings));

        // ---- RELOAD THE PREVIEW IFRAME (if visible) ----
        const previewPanel = document.getElementById('panel-preview');
        if (previewPanel && previewPanel.classList.contains('active')) {
            loadPreview();
        }

        alert('✅ Theme settings saved successfully!');

    } catch (err) {
        console.error('Save theme error:', err);
        alert('❌ ' + err.message);
    }
};

// ---- LOAD PREVIEW (UPDATED) ----
async function loadPreview() {
    const token = getToken();
    if (!token) return;

    const wrapper = document.getElementById('previewFrameWrapper');
    if (!wrapper) return;

    wrapper.innerHTML = '<div class="loading-state" style="padding:40px 0;">Loading preview...</div>';

    try {
        // Get the current username from localStorage
        const userData = localStorage.getItem('crevio_user');
        let username = 'creator';

        if (userData) {
            try {
                const user = JSON.parse(userData);
                username = user.username || 'creator';
            } catch (e) {
                console.error('Failed to parse user data:', e);
            }
        }

        // Load the public portfolio in the iframe with preview flag
        const previewUrl = `/public/${username}?preview=true&t=${Date.now()}`;

        wrapper.innerHTML = `
            <iframe 
                src="${previewUrl}" 
                style="width:100%;height:100%;border:none;display:block;"
                loading="lazy"
            ></iframe>
        `;

    } catch (err) {
        console.error('Load preview error:', err);
        wrapper.innerHTML = '<div class="error-state" style="color:var(--danger);padding:40px 0;text-align:center;">Unable to load preview.</div>';
    }
}

// ---- LOAD PUBLISH STATUS ----
async function loadPublishStatus() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/portfolio/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load publish status');

        const config = data.config;
        const isPublished = config.published === 1;
        const username = localStorage.getItem('crevio_user') ? JSON.parse(localStorage.getItem('crevio_user')).username : 'creator';

        const html = `
            <div class="publish-card">
                <div class="publish-status-row">
                    <div>
                        <span class="badge ${isPublished ? 'published' : 'draft'}">
                            <i data-lucide="${isPublished ? 'check-circle' : 'edit-3'}" style="width:14px;height:14px;"></i>
                            ${isPublished ? 'Published' : 'Draft'}
                        </span>
                    </div>
                    <div style="flex:1;">
                        <a href="/u/${username}" target="_blank" class="publish-url">
                            <i data-lucide="link" style="width:14px;height:14px;"></i>
                            /u/${username}
                        </a>
                    </div>
                    <button class="btn btn-secondary" onclick="copyPortfolioLink()" style="padding:6px 14px;">
                        <i data-lucide="copy" class="icon"></i> Copy Link
                    </button>
                </div>
            </div>

            <div class="publish-actions">
                <button class="${isPublished ? 'btn btn-warning' : 'btn btn-primary'}" onclick="togglePublish()">
                    <i data-lucide="${isPublished ? 'eye-off' : 'globe'}" class="icon"></i>
                    ${isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <a href="/u/${username}" target="_blank" class="btn btn-secondary">
                    <i data-lucide="eye" class="icon"></i> View Portfolio
                </a>
            </div>

            <div style="margin-top:12px;font-size:13px;color:var(--text-muted);">
                ${isPublished ? '✅ Your portfolio is live and visible to everyone.' : '📝 Your portfolio is currently in draft mode. Publish to make it visible.'}
            </div>
        `;

        publishStatusContainer.innerHTML = html;
        refreshIcons();

    } catch (err) {
        console.error('Load publish status error:', err);
        publishStatusContainer.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load publish status.</div>';
    }
}

// ---- TOGGLE PUBLISH ----
window.togglePublish = async function() {
    const token = getToken();
    if (!token) return;

    const isPublished = document.querySelector('.publish-card .badge.published') !== null;
    const newStatus = !isPublished;
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

        await loadPublishStatus();

    } catch (err) {
        console.error('Publish toggle error:', err);
        alert('❌ ' + err.message);
    }
};

// ---- COPY PORTFOLIO LINK ----
window.copyPortfolioLink = function() {
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
};

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();

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