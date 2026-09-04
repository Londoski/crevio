// =========================================================
// CREVIO — BILLING PAGE JS
// =========================================================

const container = document.getElementById('billingContainer');

// ----- AUTH -----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ----- HELPERS -----
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
}

function getStatusClass(status) {
    if (!status) return '';
    const map = {
        'active': 'active',
        'canceled': 'canceled',
        'past_due': 'past_due',
        'paid': 'status-paid',
        'pending': 'status-pending',
        'failed': 'status-failed'
    };
    return map[status] || '';
}

// ----- LOAD BILLING -----
async function loadBilling() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/billing/status', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.status === 401) {
            localStorage.removeItem('crevio_token');
            window.location.href = '/admin/pages/login.html';
            return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        if (!data.success) throw new Error('Failed to load billing');

        renderBilling(data.billing);

    } catch (err) {
        console.error('Billing load error:', err);
        container.innerHTML = '<div class="loading-state" style="color:var(--danger);">Unable to load billing information.</div>';
    }
}

// ----- RENDER BILLING -----
function renderBilling(billing) {
    const { subscription, limits, features, payments } = billing;

    const plan = subscription.plan || 'free';
    const planLabel = subscription.planLabel || 'Free';
    const status = subscription.status || 'active';
    const statusClass = getStatusClass(status);
    const isFree = plan === 'free';

    // Calculate percentages for usage bars
    const projectMax = limits.projects.max;
    const projectUsed = limits.projects.used;
    const projectPercent = projectMax ? Math.min((projectUsed / projectMax) * 100, 100) : 0;

    const mediaMax = limits.media.max;
    const mediaUsed = limits.media.used;
    const mediaPercent = mediaMax ? Math.min((mediaUsed / mediaMax) * 100, 100) : 0;

    const storageMax = limits.storage.maxBytes;
    const storageUsed = limits.storage.usedBytes;
    const storagePercent = storageMax ? Math.min((storageUsed / storageMax) * 100, 100) : 0;

    const botMax = limits.bot.monthlyLimit;
    const botUsed = limits.bot.used;
    const botPercent = botMax ? Math.min((botUsed / botMax) * 100, 100) : 0;

    function getBarClass(percent) {
        if (percent < 60) return 'good';
        if (percent < 85) return 'warning';
        return 'danger';
    }

    const featureList = [
        { key: 'customDomain', label: 'Custom Domain' },
        { key: 'removeBranding', label: 'Remove Crevio Branding' },
        { key: 'advancedAnalytics', label: 'Advanced Analytics' },
        { key: 'teamWorkspace', label: 'Team Workspace' },
        { key: 'customThemes', label: 'Custom Themes' },
        { key: 'seoControls', label: 'SEO Controls' },
        { key: 'prioritySupport', label: 'Priority Support' }
    ];

    let html = `
        <div class="billing-grid">
            <!-- PLAN CARD -->
            <div class="card plan-card">
                <div class="plan-header">
                    <span class="plan-name">${planLabel}</span>
                    <span class="plan-price">$${billing.subscription?.price || 0}<span>/month</span></span>
                </div>
                <div>
                    <span class="plan-status ${statusClass}">${status}</span>
                </div>
                ${subscription.current_period_end ? `<p style="color:var(--text-muted);font-size:13px;margin-top:8px;">Renews on ${formatDate(subscription.current_period_end)}</p>` : ''}
                ${subscription.cancel_at_period_end ? `<p style="color:var(--warning);font-size:13px;margin-top:4px;">⚠️ Cancels at period end</p>` : ''}

                <div class="plan-actions">
                    ${isFree ? `
                        <button class="primary-button" onclick="upgradePlan('creator')"><i data-lucide="arrow-up-circle" class="icon"></i> Upgrade to Creator</button>
                        <button class="primary-button" onclick="upgradePlan('business')"><i data-lucide="arrow-up-circle" class="icon"></i> Upgrade to Business</button>
                    ` : `
                        <button class="secondary-button" onclick="upgradePlan('${plan === 'creator' ? 'business' : 'creator'}')"><i data-lucide="arrow-up-circle" class="icon"></i> Upgrade</button>
                        ${!subscription.cancel_at_period_end ? `
                            <button class="secondary-button" style="color:var(--danger);border-color:var(--danger);" onclick="cancelSubscription()"><i data-lucide="x-circle" class="icon"></i> Cancel</button>
                        ` : `
                            <button class="primary-button" onclick="reactivateSubscription()"><i data-lucide="refresh-cw" class="icon"></i> Reactivate</button>
                        `}
                    `}
                </div>
            </div>

            <!-- USAGE CARD -->
            <div class="card">
                <h3 style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:16px;">Usage</h3>

                <div class="usage-item">
                    <span class="label">Projects</span>
                    <span class="value">${projectUsed} ${projectMax ? '/ ' + projectMax : ''}</span>
                </div>
                ${projectMax ? `<div class="usage-bar"><div class="fill ${getBarClass(projectPercent)}" style="width:${projectPercent}%;"></div></div>` : ''}

                <div class="usage-item">
                    <span class="label">Media</span>
                    <span class="value">${mediaUsed} ${mediaMax ? '/ ' + mediaMax : ''}</span>
                </div>
                ${mediaMax ? `<div class="usage-bar"><div class="fill ${getBarClass(mediaPercent)}" style="width:${mediaPercent}%;"></div></div>` : ''}

                <div class="usage-item">
                    <span class="label">Storage</span>
                    <span class="value">${formatBytes(storageUsed)} ${storageMax ? '/ ' + formatBytes(storageMax) : ''}</span>
                </div>
                ${storageMax ? `<div class="usage-bar"><div class="fill ${getBarClass(storagePercent)}" style="width:${storagePercent}%;"></div></div>` : ''}

                <div class="usage-item" style="border-bottom:none;">
                    <span class="label">Crevio Bot</span>
                    <span class="value">${botUsed} ${botMax ? '/ ' + botMax : ''}</span>
                </div>
                ${botMax ? `<div class="usage-bar"><div class="fill ${getBarClass(botPercent)}" style="width:${botPercent}%;"></div></div>` : ''}
            </div>

            <!-- FEATURES CARD -->
            <div class="card" style="grid-column:1/-1;">
                <h3 style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:16px;">Features</h3>
                <div class="features-grid">
                    ${featureList.map(f => `
                        <div class="feature-item">
                            ${features[f.key] ? `<i data-lucide="check-circle" class="check" style="width:18px;height:18px;"></i>` : `<i data-lucide="x-circle" class="cross" style="width:18px;height:18px;"></i>`}
                            ${f.label}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- PAYMENT HISTORY -->
            <div class="card" style="grid-column:1/-1;">
                <h3 style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:16px;">Payment History</h3>
                ${payments && payments.length > 0 ? `
                    <table class="payment-table">
                        <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                        <tbody>
                            ${payments.map(p => `
                                <tr>
                                    <td>${formatDate(p.payment_date)}</td>
                                    <td>$${p.amount} ${p.currency || 'USD'}</td>
                                    <td class="${getStatusClass(p.status)}">${p.status || '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <p style="color:var(--text-muted);font-size:14px;">No payment history yet.</p>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function upgradePlan(planId) {
    const token = getToken();
    if (!token) return;

    if (!confirm(`Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan?`)) return;

    try {
        const res = await fetch('/api/billing/upgrade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ planId })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Upgrade failed.');
        }

        // Redirect to Stripe checkout
        if (data.checkout_url) {
            window.location.href = data.checkout_url;
        } else {
            // Fallback: if no checkout_url, reload billing
            loadBilling();
        }

    } catch (err) {
        console.error('Upgrade error:', err);
        alert('❌ ' + err.message);
    }
}

// ----- CANCEL SUBSCRIPTION -----
async function cancelSubscription() {
    const token = getToken();
    if (!token) return;

    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of the billing period.')) return;

    try {
        const res = await fetch('/api/billing/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Cancel failed.');
        }

        alert('✅ Subscription will be cancelled at the end of the billing period.');
        loadBilling();

    } catch (err) {
        console.error('Cancel error:', err);
        alert('❌ ' + err.message);
    }
}

// ----- REACTIVATE SUBSCRIPTION -----
async function reactivateSubscription() {
    const token = getToken();
    if (!token) return;

    if (!confirm('Reactivate your subscription?')) return;

    try {
        const res = await fetch('/api/billing/reactivate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Reactivation failed.');
        }

        alert('✅ Subscription reactivated!');
        loadBilling();

    } catch (err) {
        console.error('Reactivate error:', err);
        alert('❌ ' + err.message);
    }
}

// ----- INIT -----
document.addEventListener('DOMContentLoaded', function() {
    loadBilling();
    // Load user info for avatar
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