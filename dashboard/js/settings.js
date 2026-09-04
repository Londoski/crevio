// =========================================================
// CREVIO — SETTINGS JS (redesigned)
// =========================================================

const container = document.getElementById('settingsContainer');

function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- LOAD USER ----
async function loadSettings() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.success || !data.user) throw new Error('Failed to load user');

        renderSettings(data.user);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="loading-state" style="text-align:center;padding:40px 0;color:var(--danger);">Unable to load settings.</div>';
    }
}

// ---- RENDER ----
function renderSettings(user) {
    const savedTheme = localStorage.getItem('crevio_theme') || 'dark';

    let html = `
        <!-- Profile -->
        <div class="card">
            <h3><i data-lucide="user" class="icon"></i> Profile Information</h3>
            <form id="profileForm">
                <div class="form-group">
                    <label for="displayName">Display Name</label>
                    <input type="text" id="displayName" value="${user.display_name || ''}" placeholder="Your display name">
                </div>
                <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea id="bio" rows="3" placeholder="Tell people about yourself">${user.bio || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="location">Location</label>
                        <input type="text" id="location" value="${user.location || ''}" placeholder="City, Country">
                    </div>
                    <div class="form-group">
                        <label for="profileImage">Profile Image URL</label>
                        <input type="url" id="profileImage" value="${user.profile_image || ''}" placeholder="https://example.com/avatar.jpg">
                    </div>
                </div>
                <div id="profileMessage" class="message"></div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Profile</button>
                </div>
            </form>
        </div>

        <!-- Appearance -->
        <div class="card">
            <h3><i data-lucide="palette" class="icon"></i> Appearance</h3>
            <div class="form-group" style="max-width:300px;">
                <label for="themeSelect">Theme</label>
                <select id="themeSelect">
                    <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>Dark</option>
                    <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>Light</option>
                    <option value="system" ${savedTheme === 'system' ? 'selected' : ''}>System</option>
                </select>
            </div>
            <div id="themeMessage" class="message"></div>
            <div class="form-actions">
                <button class="btn btn-primary" id="applyThemeBtn">Apply Theme</button>
            </div>
        </div>

        <!-- Notifications -->
        <div class="card">
            <h3><i data-lucide="bell" class="icon"></i> Notification Preferences</h3>
            <div class="toggle-row">
                <span class="label">Email Notifications</span>
                <input type="checkbox" class="toggle-switch" id="emailNotifications" checked>
            </div>
            <div class="toggle-row">
                <span class="label">Security Alerts</span>
                <input type="checkbox" class="toggle-switch" id="securityAlerts" checked>
            </div>
            <div class="toggle-row">
                <span class="label">Marketing Updates</span>
                <input type="checkbox" class="toggle-switch" id="marketingUpdates">
            </div>
            <div id="notificationMessage" class="message"></div>
            <div class="form-actions">
                <button class="btn btn-primary" id="saveNotificationsBtn">Save Preferences</button>
            </div>
        </div>

        <!-- Account Management Link -->
        <div class="card" style="border-color:var(--accent);">
            <h3><i data-lucide="user-cog" class="icon"></i> Account Management</h3>
            <p style="color:var(--text-secondary);font-size:14px;margin-bottom:12px;">
                Manage your account status, deactivation, deletion, and security settings.
            </p>
            <a href="/dashboard/pages/account-management.html" style="display:inline-flex;align-items:center;gap:8px;color:var(--accent);text-decoration:none;font-weight:500;padding:8px 16px;border:1px solid var(--border-color);border-radius:10px;transition:all 0.15s;">
                <i data-lucide="arrow-right" class="icon"></i> Go to Account Management
            </a>
        </div>
    `;

    container.innerHTML = html;
    refreshIcons();

    // ---- Profile form ----
    document.getElementById('profileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const token = getToken();
        if (!token) return;

        const data = {
            display_name: document.getElementById('displayName').value.trim(),
            bio: document.getElementById('bio').value.trim(),
            location: document.getElementById('location').value.trim(),
            profile_image: document.getElementById('profileImage').value.trim()
        };

        const msg = document.getElementById('profileMessage');
        msg.className = 'message';

        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.message || 'Update failed.');
            msg.className = 'message success';
            msg.textContent = '✅ Profile updated successfully!';
            // Update localStorage
            const userData = localStorage.getItem('crevio_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    Object.assign(user, data);
                    localStorage.setItem('crevio_user', JSON.stringify(user));
                } catch (e) {}
            }
            // Update avatar
            const avatar = document.getElementById('userAvatar');
            if (avatar && data.display_name) avatar.textContent = data.display_name.charAt(0).toUpperCase();
            const nameDisplay = document.getElementById('userNameDisplay');
            if (nameDisplay && data.display_name) nameDisplay.textContent = data.display_name;
        } catch (err) {
            console.error(err);
            msg.className = 'message error';
            msg.textContent = '❌ ' + err.message;
        }
    });

    // ---- Apply theme ----
    document.getElementById('applyThemeBtn').addEventListener('click', function() {
        const theme = document.getElementById('themeSelect').value;
        localStorage.setItem('crevio_theme', theme);
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', systemTheme);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        const toggleBtn = document.getElementById('themeToggleBtn');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('.icon');
            if (icon) icon.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
        }
        refreshIcons();
        const msg = document.getElementById('themeMessage');
        msg.className = 'message success';
        msg.textContent = '✅ Theme applied!';
        setTimeout(() => { msg.className = 'message'; }, 3000);
    });

    // ---- Save notifications ----
    document.getElementById('saveNotificationsBtn').addEventListener('click', function() {
        const msg = document.getElementById('notificationMessage');
        msg.className = 'message success';
        msg.textContent = '✅ Preferences saved (coming soon)';
        setTimeout(() => { msg.className = 'message'; }, 3000);
    });
}

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const name = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) avatar.textContent = user.display_name.charAt(0).toUpperCase();
            if (name && user.display_name) name.textContent = user.display_name;
        } catch (e) {}
    }
});