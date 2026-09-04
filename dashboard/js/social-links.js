// =========================================================
// CREVIO — SOCIAL JS (Full Analytics)
// =========================================================

console.log('✅ social-links.js loaded');

// ---- DOM refs ----
const addAccountBtn = document.getElementById('addAccountBtn');
const addAccountBtn2 = document.getElementById('addAccountBtn2');
const addAccountBtn3 = document.getElementById('addAccountBtn3');
const modal = document.getElementById('accountModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const accountForm = document.getElementById('accountForm');
const modalTitle = document.getElementById('modalTitle');
const accountId = document.getElementById('accountId');
const accountPlatform = document.getElementById('accountPlatform');
const accountUsername = document.getElementById('accountUsername');
const accountDisplayName = document.getElementById('accountDisplayName');
const accountProfileUrl = document.getElementById('accountProfileUrl');
const accountCtaLabel = document.getElementById('accountCtaLabel');
const accountIsVisible = document.getElementById('accountIsVisible');
const modalMessage = document.getElementById('modalMessage');

// ---- Tab switching ----
const navBtns = document.querySelectorAll('.social-subnav .nav-btn');
const panels = {
    overview: document.getElementById('panel-overview'),
    accounts: document.getElementById('panel-accounts'),
    analytics: document.getElementById('panel-analytics'),
    cta: document.getElementById('panel-cta')
};

let activeTab = 'overview';
let distributionChart = null;
let clicksLineChart = null;

navBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        navBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        activeTab = tab;
        Object.keys(panels).forEach(key => {
            panels[key].classList.toggle('active', key === tab);
        });
        if (tab === 'overview') loadOverview();
        else if (tab === 'accounts') loadAccountsManage();
        else if (tab === 'analytics') loadAnalytics();
        else if (tab === 'cta') loadCTAPerformance();
    });
});

// ---- AUTH ----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- API ----
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            ...options.headers
        }
    });
    if (res.status === 401) {
        localStorage.removeItem('crevio_token');
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return res;
}

// ---- LOAD OVERVIEW ----
async function loadOverview() {
    const token = getToken();
    if (!token) return;

    try {
        // Accounts
        const accountsRes = await apiFetch('/api/social/accounts');
        const accountsData = await accountsRes.json();
        if (accountsData.success) {
            renderAccountsList(accountsData.accounts);
        }

        // Stats (overview)
        const statsRes = await apiFetch('/api/social/analytics/overview?days=30');
        const statsData = await statsRes.json();
        if (statsData.success) {
            const stats = statsData.stats;
            document.getElementById('totalClicks').textContent = stats.totalClicks || 0;
            document.getElementById('uniqueVisitors').textContent = stats.uniqueVisitors || 0;
            document.getElementById('returningVisitors').textContent = stats.returningVisitors || 0;
            document.getElementById('socialCtr').textContent = stats.totalClicks > 0 ? '—' : '0%';
        }

        // Top Pages
        const pagesRes = await apiFetch('/api/social/analytics/top-pages?limit=5');
        const pagesData = await pagesRes.json();
        if (pagesData.success) {
            renderTopPages(pagesData.pages);
        }

        // Distribution chart
        if (statsData.success && statsData.stats.accounts) {
            renderDistributionChart(statsData.stats.accounts);
        }

    } catch (err) {
        console.error('Load overview error:', err);
    }
}

function renderAccountsList(accounts) {
    const container = document.getElementById('accountsList');
    if (!accounts || accounts.length === 0) {
        container.innerHTML = '<div class="empty-state">No social accounts added yet.</div>';
        return;
    }
    let html = '';
    accounts.forEach(acc => {
        const icon = acc.platform.toLowerCase() === 'instagram' ? 'instagram' :
                     acc.platform.toLowerCase() === 'tiktok' ? 'music' :
                     acc.platform.toLowerCase() === 'youtube' ? 'youtube' :
                     acc.platform.toLowerCase() === 'linkedin' ? 'linkedin' :
                     acc.platform.toLowerCase() === 'x' ? 'twitter' :
                     acc.platform.toLowerCase() === 'facebook' ? 'facebook' :
                     acc.platform.toLowerCase() === 'github' ? 'github' : 'link';
        html += `
            <div class="account-item">
                <div class="icon-wrap"><i data-lucide="${icon}" style="width:20px;height:20px;"></i></div>
                <div class="info">
                    <div class="name">${acc.display_name || acc.username || acc.platform}</div>
                    <div class="handle">${acc.platform} · ${acc.username || ''}</div>
                </div>
                <div class="clicks">${acc.clicks || 0} clicks</div>
                <div class="actions">
                    <button class="btn-icon" data-id="${acc.id}" title="Edit"><i data-lucide="edit-2" style="width:16px;height:16px;"></i></button>
                    <button class="btn-icon danger" data-id="${acc.id}" title="Delete"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    refreshIcons();

    container.querySelectorAll('.btn-icon[data-id]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            if (this.classList.contains('danger')) {
                if (confirm('Delete this social account?')) deleteAccount(id);
            } else {
                openEditModal(id);
            }
        });
    });
}

function renderTopPages(pages) {
    const container = document.getElementById('topPagesContainer');
    if (!pages || pages.length === 0) {
        container.innerHTML = '<div class="empty-state">No data yet.</div>';
        return;
    }
    let html = `
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Page</th><th>Clicks</th><th>Visitors</th></tr></thead>
                <tbody>
    `;
    pages.forEach(p => {
        const pageName = p.page ? p.page.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '') || 'Home' : 'Unknown';
        html += `<tr><td class="highlight">${pageName}</td><td>${p.clicks}</td><td>${p.visitors}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderDistributionChart(accounts) {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    if (distributionChart) distributionChart.destroy();

    const labels = accounts.map(a => a.platform);
    const data = accounts.map(a => a.clicks || 0);
    const colors = ['#2563EB', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];

    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() }
                }
            },
            cutout: '70%'
        }
    });
}

// ---- ACCOUNTS MANAGE ----
async function loadAccountsManage() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await apiFetch('/api/social/accounts');
        const data = await res.json();
        if (data.success) {
            renderAccountsManage(data.accounts);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderAccountsManage(accounts) {
    const container = document.getElementById('accountsManageList');
    if (!accounts || accounts.length === 0) {
        container.innerHTML = '<div class="empty-state">No social accounts added yet.</div>';
        return;
    }
    let html = '';
    accounts.forEach(acc => {
        html += `
            <div class="account-item" style="cursor:default;">
                <div class="icon-wrap"><i data-lucide="${acc.platform.toLowerCase() === 'instagram' ? 'instagram' : acc.platform.toLowerCase() === 'tiktok' ? 'music' : acc.platform.toLowerCase() === 'youtube' ? 'youtube' : acc.platform.toLowerCase() === 'linkedin' ? 'linkedin' : 'link'}" style="width:20px;height:20px;"></i></div>
                <div class="info">
                    <div class="name">${acc.display_name || acc.username || acc.platform}</div>
                    <div class="handle">${acc.platform} · ${acc.profile_url}</div>
                    <div style="font-size:12px;color:var(--text-muted);">${acc.is_visible ? 'Visible on portfolio' : 'Hidden'}</div>
                </div>
                <div class="actions">
                    <button class="btn-icon" data-id="${acc.id}" title="Edit"><i data-lucide="edit-2" style="width:16px;height:16px;"></i></button>
                    <button class="btn-icon danger" data-id="${acc.id}" title="Delete"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    refreshIcons();

    container.querySelectorAll('.btn-icon[data-id]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            if (this.classList.contains('danger')) {
                if (confirm('Delete this social account?')) deleteAccount(id);
            } else {
                openEditModal(id);
            }
        });
    });
}

// ---- ANALYTICS ----
async function loadAnalytics() {
    const token = getToken();
    if (!token) return;

    const accountsRes = await apiFetch('/api/social/accounts');
    const accountsData = await accountsRes.json();
    if (accountsData.success) {
        const select = document.getElementById('analyticsPlatform');
        const currentVal = select.value;
        select.innerHTML = '<option value="">All Platforms</option>';
        accountsData.accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.platform;
            opt.textContent = acc.platform;
            select.appendChild(opt);
        });
        select.value = currentVal;
    }

    const days = document.getElementById('analyticsDays').value;
    const platform = document.getElementById('analyticsPlatform').value;
    const res = await apiFetch(`/api/social/analytics/clicks-over-time?days=${days}&platform=${platform}`);
    const data = await res.json();
    if (data.success) {
        renderClicksLineChart(data.data);
    }

    const sourcesRes = await apiFetch(`/api/social/analytics/traffic-sources?days=${days}`);
    const sourcesData = await sourcesRes.json();
    if (sourcesData.success) {
        renderTrafficSources(sourcesData.sources);
    }
}

function renderClicksLineChart(data) {
    const ctx = document.getElementById('clicksLineChart').getContext('2d');
    if (clicksLineChart) clicksLineChart.destroy();

    const labels = data.map(d => d.date);
    const values = data.map(d => d.clicks);
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    clicksLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Clicks',
                data: values,
                borderColor: color,
                backgroundColor: color + '20',
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() },
                    grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() }
                },
                y: {
                    ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() },
                    grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() },
                    beginAtZero: true
                }
            }
        }
    });
}

function renderTrafficSources(sources) {
    const container = document.getElementById('trafficSourcesContainer');
    if (!sources || sources.length === 0) {
        container.innerHTML = '<div class="empty-state">No data yet.</div>';
        return;
    }
    const total = sources.reduce((sum, s) => sum + s.visits, 0);
    let html = '';
    sources.forEach(s => {
        const pct = total > 0 ? Math.round((s.visits / total) * 100) : 0;
        html += `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-secondary);">${s.source}</span>
                <span style="color:var(--text-primary); font-weight:500;">${s.visits} (${pct}%)</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ---- CTA PERFORMANCE ----
async function loadCTAPerformance() {
    const token = getToken();
    if (!token) return;
    const res = await apiFetch('/api/social/analytics/cta-performance');
    const data = await res.json();
    if (data.success) {
        renderCTAPerformance(data.data);
    }
}

function renderCTAPerformance(data) {
    const container = document.getElementById('ctaPerformanceContainer');
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state">No data yet.</div>';
        return;
    }
    let html = `
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>CTA Location</th><th>Clicks</th><th>Unique Visitors</th></tr></thead>
                <tbody>
    `;
    data.forEach(item => {
        const location = item.cta_location || 'Unknown';
        html += `<tr><td class="highlight">${location}</td><td>${item.clicks}</td><td>${item.unique_visitors}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ---- MODAL ----
function openAddModal() {
    modalTitle.textContent = 'Add Social Account';
    accountId.value = '';
    accountForm.reset();
    document.getElementById('accountIsVisible').checked = true;
    modalMessage.textContent = '';
    modal.classList.add('open');
}

function openEditModal(id) {
    fetchAccount(id).then(acc => {
        if (!acc) return;
        modalTitle.textContent = 'Edit Social Account';
        accountId.value = acc.id;
        accountPlatform.value = acc.platform || '';
        accountUsername.value = acc.username || '';
        accountDisplayName.value = acc.display_name || '';
        accountProfileUrl.value = acc.profile_url || '';
        accountCtaLabel.value = acc.cta_label || '';
        accountIsVisible.checked = acc.is_visible === 1;
        modalMessage.textContent = '';
        modal.classList.add('open');
    });
}

async function fetchAccount(id) {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await apiFetch('/api/social/accounts');
        const data = await res.json();
        if (data.success) {
            return data.accounts.find(a => a.id === id);
        }
    } catch (e) { return null; }
}

function closeModal() {
    modal.classList.remove('open');
}

accountForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    const id = accountId.value;
    const platform = accountPlatform.value;
    const username = accountUsername.value.trim();
    const display_name = accountDisplayName.value.trim();
    const profile_url = accountProfileUrl.value.trim();
    const cta_label = accountCtaLabel.value.trim();
    const is_visible = accountIsVisible.checked ? 1 : 0;

    if (!platform || !profile_url) {
        modalMessage.textContent = 'Platform and Profile URL are required.';
        return;
    }

    const payload = { platform, username, display_name, profile_url, cta_label, is_visible };
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `/api/social/accounts/${id}` : '/api/social/accounts';

    try {
        const res = await apiFetch(endpoint, {
            method,
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Save failed.');
        closeModal();
        loadOverview();
        loadAccountsManage();
        if (activeTab === 'analytics') loadAnalytics();
        if (activeTab === 'cta') loadCTAPerformance();
    } catch (err) {
        modalMessage.textContent = '❌ ' + err.message;
    }
});

async function deleteAccount(id) {
    const token = getToken();
    if (!token) return;
    try {
        const res = await apiFetch(`/api/social/accounts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Delete failed.');
        loadOverview();
        loadAccountsManage();
        if (activeTab === 'analytics') loadAnalytics();
        if (activeTab === 'cta') loadCTAPerformance();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

addAccountBtn?.addEventListener('click', openAddModal);
addAccountBtn2?.addEventListener('click', openAddModal);
addAccountBtn3?.addEventListener('click', openAddModal);
closeModalBtn?.addEventListener('click', closeModal);
cancelModalBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('analyticsDays')?.addEventListener('change', loadAnalytics);
document.getElementById('analyticsPlatform')?.addEventListener('change', loadAnalytics);

function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', function() {
    loadOverview();
});