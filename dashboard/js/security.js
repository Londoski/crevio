// =========================================================
// CREVIO — SECURITY JS (fixed spacing, no icons)
// =========================================================

const container = document.getElementById('securityContainer');

function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- LOAD SECURITY ----
async function loadSecurity() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/auth/security', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load security data');
        renderSecurity(data.security);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="loading-state" style="text-align:center;padding:40px 0;color:var(--danger);">Unable to load security information.</div>';
    }
}

// ---- RENDER ----
function renderSecurity(security) {
    const { email, phone, two_factor_enabled } = security;

    let html = `
        <!-- Verification Status (no icons) -->
        <div class="card">
            <h3><i data-lucide="check-circle" class="icon"></i> Verification Status</h3>
            <div class="status-row">
                <span class="label">Email</span>
                <span class="value ${email.verified ? 'verified' : 'unverified'}">
                    ${email.address || 'Not set'}
                    ${email.verified ? ' (Verified)' : ' (Not verified)'}
                    ${!email.verified ? `<button class="btn-verify" onclick="verifyEmail()">Verify</button>` : ''}
                </span>
            </div>
            <div class="status-row">
                <span class="label">Phone</span>
                <span class="value ${phone.verified ? 'verified' : 'unverified'}">
                    ${phone.number || 'Not set'}
                    ${phone.verified ? ' (Verified)' : ' (Not verified)'}
                    ${!phone.verified ? `<button class="btn-verify" onclick="verifyPhone()">Verify</button>` : ''}
                </span>
            </div>
        </div>

        <!-- Two-Factor Authentication (with toggle) -->
        <div class="card">
            <h3><i data-lucide="shield" class="icon"></i> Two-Factor Authentication</h3>
            <div class="toggle-row">
                <span class="label">Enable 2FA</span>
                <div>
                    <input type="checkbox" class="toggle-switch" id="twoFAToggle" ${two_factor_enabled ? 'checked' : ''}>
                </div>
            </div>
            <div id="twoFASetupContainer"></div>
            <div id="recoveryCodesContainer"></div>
        </div>

        <!-- Change Password -->
        <div class="card">
            <h3><i data-lucide="key" class="icon"></i> Change Password</h3>
            <form id="passwordForm" style="margin-top:8px;">
                <div style="display:grid; gap:12px; max-width:400px;">
                    <div>
                        <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">Current Password</label>
                        <input type="password" id="currentPassword" placeholder="Enter current password" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:14px;font-family:inherit;" required>
                    </div>
                    <div>
                        <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">New Password</label>
                        <input type="password" id="newPassword" placeholder="Enter new password" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:14px;font-family:inherit;" required minlength="8">
                    </div>
                    <div>
                        <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">Confirm New Password</label>
                        <input type="password" id="confirmPassword" placeholder="Confirm new password" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:14px;font-family:inherit;" required>
                    </div>
                    <div id="passwordMessage" style="font-size:13px;color:var(--danger);"></div>
                    <button type="submit" class="btn btn-primary" style="width:fit-content;">Update Password</button>
                </div>
            </form>
        </div>

        <!-- Active Sessions -->
        <div class="card">
            <h3><i data-lucide="monitor" class="icon"></i> Active Sessions</h3>
            <div id="sessionsContainer">
                <div class="loading-state" style="padding:12px 0;color:var(--text-muted);text-align:center;">Loading sessions...</div>
            </div>
            <div style="margin-top:12px;">
                <button class="btn btn-danger" onclick="logoutAllDevices()">Logout All Devices</button>
            </div>
        </div>
    `;

    container.innerHTML = html;
    refreshIcons();

    // ---- 2FA Toggle Handler ----
    const toggle = document.getElementById('twoFAToggle');
    const setupContainer = document.getElementById('twoFASetupContainer');
    const recoveryContainer = document.getElementById('recoveryCodesContainer');

    toggle.addEventListener('change', function() {
        if (this.checked) {
            setup2FA(setupContainer);
        } else {
            disable2FA();
        }
    });

    if (two_factor_enabled) {
        loadRecoveryCodes(recoveryContainer);
        setupContainer.innerHTML = `
            <div style="margin-top:12px;font-size:14px;color:var(--text-secondary);">
                ✅ Two-factor authentication is active.
            </div>
        `;
    }

    // ---- Password form ----
    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const msg = document.getElementById('passwordMessage');

        if (newPass.length < 8) {
            msg.textContent = 'New password must be at least 8 characters.';
            return;
        }
        if (newPass !== confirm) {
            msg.textContent = 'Passwords do not match.';
            return;
        }

        try {
            const token = getToken();
            if (!token) return;
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ currentPassword: current, newPassword: newPass })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Password change failed.');
            }
            msg.style.color = 'var(--success)';
            msg.textContent = '✅ Password updated successfully!';
            document.getElementById('passwordForm').reset();
        } catch (err) {
            console.error(err);
            msg.style.color = 'var(--danger)';
            msg.textContent = err.message;
        }
    });

    // ---- Load sessions ----
    loadSessions();
}

// ---- LOAD SESSIONS ----
async function loadSessions() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch('/api/auth/sessions', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 404) {
            document.getElementById('sessionsContainer').innerHTML = '<div style="color:var(--text-muted);font-size:14px;">Session management coming soon.</div>';
            return;
        }
        if (!res.ok) throw new Error('Failed to load sessions');
        const data = await res.json();
        renderSessions(data.sessions || []);
    } catch (err) {
        console.error(err);
        document.getElementById('sessionsContainer').innerHTML = '<div style="color:var(--text-muted);font-size:14px;">Unable to load sessions.</div>';
    }
}

// ---- RENDER SESSIONS ----
function renderSessions(sessions) {
    const container = document.getElementById('sessionsContainer');
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);font-size:14px;">No active sessions.</div>';
        return;
    }
    let html = '';
    sessions.forEach(s => {
        const isCurrent = s.is_current || false;
        html += `
            <div class="session-item">
                <div class="info">
                    <span class="device">${s.user_agent || 'Unknown device'}</span>
                    <span class="meta">${s.ip_address || 'Unknown IP'} · ${new Date(s.created_at).toLocaleString()}</span>
                    ${isCurrent ? '<span class="current">Current session</span>' : ''}
                </div>
                ${!isCurrent ? `<button class="revoke-btn" data-id="${s.id}" onclick="revokeSession('${s.id}')">Revoke</button>` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

// ---- REVOKE SESSION ----
async function revokeSession(sessionId) {
    if (!confirm('Revoke this session?')) return;
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`/api/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Revoke failed.');
        await loadSessions();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// ---- LOGOUT ALL ----
async function logoutAllDevices() {
    if (!confirm('Logout from all devices? You will need to log in again.')) return;
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch('/api/auth/logout-all', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Logout all failed.');
        localStorage.removeItem('crevio_token');
        window.location.href = '/admin/pages/login.html';
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// ---- VERIFY EMAIL / PHONE (placeholders) ----
function verifyEmail() {
    alert('Email verification will be implemented soon. Please check your email for a verification link.');
}
function verifyPhone() {
    alert('Phone verification will be implemented soon.');
}

// ---- 2FA SETUP (called when toggle is turned on) ----
async function setup2FA(container) {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch('/api/auth/2fa/setup', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Setup failed.');

        container.innerHTML = `
            <div class="qr-container">
                <img src="${data.setup.qr_code}" alt="QR Code" />
                <div class="secret">Secret: ${data.setup.secret}</div>
                <p style="color:var(--text-secondary);font-size:13px;margin-top:8px;">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                <div class="otp-input-group">
                    <input type="text" id="totpSetupCode" placeholder="6-digit code" maxlength="6" inputmode="numeric" />
                    <button class="btn btn-primary" id="verifySetupBtn">Verify & Enable</button>
                    <button class="btn btn-secondary" id="cancelSetupBtn">Cancel</button>
                </div>
                <div id="setupMessage" style="margin-top:8px;font-size:13px;color:var(--danger);"></div>
            </div>
        `;
        refreshIcons();

        document.getElementById('verifySetupBtn').addEventListener('click', async function() {
            const code = document.getElementById('totpSetupCode').value.replace(/\s/g, '');
            const msg = document.getElementById('setupMessage');
            if (!/^\d{6}$/.test(code)) {
                msg.textContent = 'Please enter a valid 6-digit code.';
                return;
            }
            try {
                const verifyRes = await fetch('/api/auth/2fa/verify-setup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ token: code })
                });
                const verifyData = await verifyRes.json();
                if (!verifyRes.ok || !verifyData.success) {
                    throw new Error(verifyData.message || 'Verification failed.');
                }
                const codes = verifyData.recovery_codes || [];
                if (codes.length) {
                    msg.style.color = 'var(--text-primary)';
                    msg.innerHTML = `<strong>✅ 2FA enabled!</strong> Save these recovery codes (one-time use):<br>
                    <div class="recovery-codes">${codes.map(c => `<span>${c}</span>`).join('')}</div>
                    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Store these securely. They will not be shown again.</p>
                    <button class="btn btn-primary" onclick="loadSecurity()">Done</button>
                    `;
                    document.getElementById('twoFAToggle').checked = true;
                } else {
                    msg.style.color = 'var(--success)';
                    msg.textContent = '✅ 2FA enabled successfully!';
                    document.getElementById('twoFAToggle').checked = true;
                    setTimeout(loadSecurity, 1500);
                }
            } catch (err) {
                console.error(err);
                msg.textContent = err.message;
                document.getElementById('twoFAToggle').checked = false;
            }
        });

        document.getElementById('cancelSetupBtn').addEventListener('click', function() {
            container.innerHTML = '';
            document.getElementById('twoFAToggle').checked = false;
            loadSecurity();
        });

    } catch (err) {
        console.error(err);
        alert(err.message);
        document.getElementById('twoFAToggle').checked = false;
    }
}

// ---- DISABLE 2FA (called when toggle is turned off) ----
async function disable2FA() {
    if (!confirm('Disable Two-Factor Authentication? You will need a TOTP code to confirm.')) {
        document.getElementById('twoFAToggle').checked = true;
        return;
    }
    const token = getToken();
    if (!token) return;
    const code = prompt('Enter your current 6-digit authenticator code to disable 2FA:');
    if (!code || !/^\d{6}$/.test(code.replace(/\s/g, ''))) {
        alert('Please enter a valid 6-digit code.');
        document.getElementById('twoFAToggle').checked = true;
        return;
    }
    try {
        const res = await fetch('/api/auth/2fa/disable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ token: code.replace(/\s/g, '') })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Disable failed.');
        alert('✅ 2FA disabled successfully.');
        document.getElementById('twoFAToggle').checked = false;
        document.getElementById('recoveryCodesContainer').innerHTML = '';
        loadSecurity();
    } catch (err) {
        console.error(err);
        alert(err.message);
        document.getElementById('twoFAToggle').checked = true;
    }
}

// ---- REGENERATE RECOVERY CODES ----
async function regenerateRecoveryCodes() {
    if (!confirm('Regenerate recovery codes? Old codes will be invalidated.')) return;
    const token = getToken();
    if (!token) return;
    const code = prompt('Enter your current 6-digit authenticator code to regenerate recovery codes:');
    if (!code || !/^\d{6}$/.test(code.replace(/\s/g, ''))) {
        alert('Please enter a valid 6-digit code.');
        return;
    }
    try {
        const res = await fetch('/api/auth/2fa/recovery-codes/regenerate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ token: code.replace(/\s/g, '') })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Regeneration failed.');
        const codes = data.recovery_codes || [];
        const container = document.getElementById('recoveryCodesContainer');
        if (codes.length) {
            container.innerHTML = `
                <div style="margin-top:12px;">
                    <strong style="font-size:14px;">New Recovery Codes (one-time use):</strong>
                    <div class="recovery-codes">${codes.map(c => `<span>${c}</span>`).join('')}</div>
                    <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Store these securely. They will not be shown again.</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('recoveryCodesContainer').innerHTML='';">Hide Codes</button>
                </div>
            `;
        } else {
            alert('✅ Recovery codes regenerated.');
            loadSecurity();
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// ---- LOAD RECOVERY CODES (show regenerate option) ----
function loadRecoveryCodes(container) {
    if (!container) container = document.getElementById('recoveryCodesContainer');
    if (container) {
        container.innerHTML = `
            <div style="margin-top:12px;font-size:14px;color:var(--text-secondary);">
                ✅ Recovery codes have been generated. They are only shown once.
                <button class="btn btn-warning" onclick="regenerateRecoveryCodes()" style="margin-left:8px;">Regenerate Codes</button>
            </div>
        `;
    }
}

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadSecurity();
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const name = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) avatar.textContent = user.display_name.charAt(0).toUpperCase();
            if (name && user.display_name) name.textContent = user.display_name;
        } catch (e) { console.error(e); }
    }
});