// =========================================================
// CREVIO — ACCOUNT MANAGEMENT JS (FULLY WORKING)
// =========================================================

console.log('✅ account-management.js loaded');

// ----- AUTH -----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ----- DOM REFS -----
const deactivateBtn = document.getElementById('deactivateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const logoutBtn = document.getElementById('logoutBtn');

const deactivateModal = document.getElementById('deactivateModal');
const cancelDeactivateBtn = document.getElementById('cancelDeactivateBtn');
const confirmDeactivateBtn = document.getElementById('confirmDeactivateBtn');

const deleteModal = document.getElementById('deleteModal');
const cancelDeleteModalBtn = document.getElementById('cancelDeleteModalBtn');
const proceedDeleteBtn = document.getElementById('proceedDeleteBtn');

const feedbackModal = document.getElementById('feedbackModal');
const skipFeedbackBtn = document.getElementById('skipFeedbackBtn');
const finalDeleteBtn = document.getElementById('finalDeleteBtn');

const finalConfirmModal = document.getElementById('finalConfirmModal');
const cancelFinalBtn = document.getElementById('cancelFinalBtn');
const confirmFinalDeleteBtn = document.getElementById('confirmFinalDeleteBtn');

const tabBtns = document.querySelectorAll('.tab-btn');
const panelControl = document.getElementById('panel-control');
const panelInfo = document.getElementById('panel-info');

let selectedReason = null;

// ----- TABS -----
tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        if (tab === 'control') {
            panelControl.style.display = 'block';
            panelInfo.style.display = 'none';
        } else {
            panelControl.style.display = 'none';
            panelInfo.style.display = 'block';
            loadAccountInfo();
        }
    });
});

// ----- LOAD ACCOUNT INFO -----
async function loadAccountInfo() {
    const token = getToken();
    if (!token) return;
    const container = document.getElementById('accountInfoContainer');
    try {
        const res = await fetch('/api/account/info', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load account info');
        renderAccountInfo(data.account);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load account information.</div>';
    }
}

function renderAccountInfo(account) {
    const statusClass = account.account_status === 'active' ? 'active' :
                        account.account_status === 'deactivated' ? 'deactivated' :
                        account.account_status === 'pending_deletion' ? 'pending_deletion' : '';
    const statusLabel = account.account_status ? account.account_status.charAt(0).toUpperCase() + account.account_status.slice(1).replace('_', ' ') : '—';

    const getBadge = (verified) => {
        if (verified) {
            return `<span class="badge-verified">Verified</span>`;
        } else {
            return `<span class="badge-unverified">Not Verified</span>`;
        }
    };

    const html = `
        <div class="info-grid">
            <div class="info-item"><div class="label">Username</div><div class="value">${account.username || '—'}</div></div>
            <div class="info-item"><div class="label">Display Name</div><div class="value">${account.display_name || '—'}</div></div>
            <div class="info-item"><div class="label">Email</div><div class="value">${account.email || '—'} ${getBadge(account.email_verified)}</div></div>
            <div class="info-item"><div class="label">Phone</div><div class="value">${account.phone || '—'} ${getBadge(account.phone_verified)}</div></div>
            <div class="info-item"><div class="label">Location</div><div class="value">${account.location || '—'}</div></div>
            <div class="info-item"><div class="label">Account Created</div><div class="value">${new Date(account.created_at).toLocaleDateString()}</div></div>
            <div class="info-item"><div class="label">Account Status</div><div class="value"><span class="status-badge ${statusClass}">${statusLabel}</span></div></div>
            <div class="info-item"><div class="label">Two-Factor</div><div class="value">${account.two_factor_enabled ? 'Enabled' : 'Disabled'}</div></div>
        </div>
    `;
    document.getElementById('accountInfoContainer').innerHTML = html;
    refreshIcons();
}

// ----- DEACTIVATE -----
if (deactivateBtn) {
    deactivateBtn.addEventListener('click', function() {
        const username = localStorage.getItem('crevio_user') ? JSON.parse(localStorage.getItem('crevio_user')).username : 'User';
        document.getElementById('deactivateTitle').textContent = username + ': Deactivate this account?';
        deactivateModal.classList.add('open');
    });
}

if (cancelDeactivateBtn) {
    cancelDeactivateBtn.addEventListener('click', function() {
        deactivateModal.classList.remove('open');
    });
}

if (confirmDeactivateBtn) {
    confirmDeactivateBtn.addEventListener('click', async function() {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch('/api/account/deactivate', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Deactivation failed.');
            alert('✅ Account deactivated. You can reactivate by logging in again.');
            localStorage.removeItem('crevio_token');
            localStorage.removeItem('crevio_user');
            window.location.href = '/admin/pages/login.html';
        } catch (err) {
            console.error(err);
            alert('❌ ' + err.message);
        }
        deactivateModal.classList.remove('open');
    });
}

// ----- DELETE (first step) -----
if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
        deleteModal.classList.add('open');
    });
}

if (cancelDeleteModalBtn) {
    cancelDeleteModalBtn.addEventListener('click', function() {
        deleteModal.classList.remove('open');
    });
}

if (proceedDeleteBtn) {
    proceedDeleteBtn.addEventListener('click', function() {
        deleteModal.classList.remove('open');
        feedbackModal.classList.add('open');
        document.querySelectorAll('input[name="exitReason"]').forEach(r => r.checked = false);
        document.getElementById('feedbackConfirm').classList.remove('show');
        selectedReason = null;
    });
}

// ----- FEEDBACK -----
document.querySelectorAll('input[name="exitReason"]').forEach(radio => {
    radio.addEventListener('change', function() {
        selectedReason = this.value;
        document.getElementById('feedbackConfirm').classList.add('show');
        document.getElementById('feedbackConfirm').textContent = 'Thanks for your feedback';
    });
});

if (skipFeedbackBtn) {
    skipFeedbackBtn.addEventListener('click', function() {
        feedbackModal.classList.remove('open');
        finalConfirmModal.classList.add('open');
    });
}

if (finalDeleteBtn) {
    finalDeleteBtn.addEventListener('click', function() {
        feedbackModal.classList.remove('open');
        finalConfirmModal.classList.add('open');
    });
}

// ----- FINAL DELETE -----
if (cancelFinalBtn) {
    cancelFinalBtn.addEventListener('click', function() {
        finalConfirmModal.classList.remove('open');
    });
}

if (confirmFinalDeleteBtn) {
    confirmFinalDeleteBtn.addEventListener('click', async function() {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch('/api/account/request-deletion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ reason: selectedReason })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Deletion request failed.');
            alert('✅ Deletion requested. You have 30 days to cancel. Your account will be permanently deleted after that.');
            localStorage.removeItem('crevio_token');
            localStorage.removeItem('crevio_user');
            window.location.href = '/admin/pages/login.html';
        } catch (err) {
            console.error(err);
            alert('❌ ' + err.message);
        }
        finalConfirmModal.classList.remove('open');
    });
}

// ----- LOGOUT -----
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        const token = getToken();
        if (token) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            }).catch(() => {});
        }
        localStorage.removeItem('crevio_token');
        localStorage.removeItem('crevio_user');
        window.location.href = '/admin/pages/login.html';
    });
}

// ----- HELPERS -----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ----- INIT -----
document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) avatar.textContent = user.display_name.charAt(0).toUpperCase();
            if (nameDisplay && user.display_name) nameDisplay.textContent = user.display_name;
        } catch (e) { console.error(e); }
    }
    // Load account info if info tab is active
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'info') {
        loadAccountInfo();
    }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('open');
        }
    });
});

// Close modals on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
});