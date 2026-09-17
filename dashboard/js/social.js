// =========================================================
// CREVIO — SOCIAL DASHBOARD
// File: dashboard/js/social.js
// Uses shared auth from /dashboard/js/auth.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ social.js loaded");

    // ---- Null-safe DOM helper ----
    const $ = (id) => document.getElementById(id);

    // ---- Buttons ----
    const addAccountBtn  = $("addAccountBtn");
    const addAccountBtn2 = $("addAccountBtn2");
    const addAccountBtn3 = $("addAccountBtn3");

    // ---- Modal ----
    const modal          = $("accountModal");
    const closeModalBtn  = $("closeModalBtn");
    const cancelModalBtn = $("cancelModalBtn");
    const accountForm    = $("accountForm");
    const modalTitle     = $("modalTitle");
    const accountId      = $("accountId");
    const accountPlatform     = $("accountPlatform");
    const accountUsername     = $("accountUsername");
    const accountDisplayName  = $("accountDisplayName");
    const accountProfileUrl   = $("accountProfileUrl");
    const accountCtaLabel     = $("accountCtaLabel");
    const accountIsVisible    = $("accountIsVisible");
    const modalMessage        = $("modalMessage");

    // ---- Tabs ----
    const navBtns = document.querySelectorAll(".social-subnav .nav-btn");
    const panels = {
        overview:  $("panel-overview"),
        accounts:  $("panel-accounts"),
        analytics: $("panel-analytics"),
        cta:       $("panel-cta")
    };

    let activeTab = "overview";
    let distributionChart = null;
    let clicksLineChart   = null;

    // ---- Tab switching ----
    navBtns.forEach(btn => {
        btn.addEventListener("click", function () {
            navBtns.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            const tab = this.dataset.tab;
            activeTab = tab;
            Object.keys(panels).forEach(key => {
                panels[key]?.classList.toggle("active", key === tab);
            });
            if (tab === "overview")       loadOverview();
            else if (tab === "accounts")  loadAccountsManage();
            else if (tab === "analytics") loadAnalytics();
            else if (tab === "cta")       loadCTAPerformance();
        });
    });

    // =========================================================
    // LOAD OVERVIEW
    // =========================================================
    async function loadOverview() {
        try {
            const accountsRes  = await window.apiFetch("/api/social/accounts");
            const accountsData = await accountsRes.json();
            if (accountsData.success) renderAccountsList(accountsData.accounts || []);

            const statsRes  = await window.apiFetch("/api/social/analytics/overview?days=30");
            const statsData = await statsRes.json();
            if (statsData.success) {
                const stats = statsData.stats || {};
                setText("totalClicks",        stats.totalClicks       || 0);
                setText("uniqueVisitors",     stats.uniqueVisitors    || 0);
                setText("returningVisitors",  stats.returningVisitors || 0);
                setText("socialCtr",          stats.totalClicks > 0 ? "—" : "0%");

                if (Array.isArray(stats.accounts)) {
                    renderDistributionChart(stats.accounts);
                }
            }

            const pagesRes  = await window.apiFetch("/api/social/analytics/top-pages?limit=5");
            const pagesData = await pagesRes.json();
            if (pagesData.success) renderTopPages(pagesData.pages || []);
        } catch (err) {
            console.error("Load overview error:", err);
        }
    }

    // =========================================================
    // RENDER ACCOUNTS LIST (overview)
    // =========================================================
    function renderAccountsList(accounts) {
        const container = $("accountsList");
        if (!container) return;
        if (!accounts.length) {
            container.innerHTML = `<div class="empty-state">No social accounts added yet.</div>`;
            return;
        }
        container.innerHTML = accounts.map(acc => {
            const icon = platformIcon(acc.platform);
            return `
                <div class="account-item">
                    <div class="icon-wrap"><i data-lucide="${icon}" style="width:20px;height:20px;"></i></div>
                    <div class="info">
                        <div class="name">${escapeHtml(acc.display_name || acc.username || acc.platform)}</div>
                        <div class="handle">${escapeHtml(acc.platform)} · ${escapeHtml(acc.username || "")}</div>
                    </div>
                    <div class="clicks">${acc.clicks || 0} clicks</div>
                    <div class="actions">
                        <button class="btn-icon" data-id="${acc.id}" title="Edit">
                            <i data-lucide="edit-2" style="width:16px;height:16px;"></i>
                        </button>
                        <button class="btn-icon danger" data-id="${acc.id}" title="Delete">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        refreshIcons();
        wireAccountActions(container);
    }

    // =========================================================
    // RENDER TOP PAGES
    // =========================================================
    function renderTopPages(pages) {
        const container = $("topPagesContainer");
        if (!container) return;
        if (!pages.length) {
            container.innerHTML = `<div class="empty-state">No data yet.</div>`;
            return;
        }
        container.innerHTML = `
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr><th>Page</th><th>Clicks</th><th>Visitors</th></tr></thead>
                    <tbody>
                        ${pages.map(p => {
                            const name = p.page
                                ? p.page.replace(/^https?:\/\/[^\/]+/, "").replace(/^\//, "") || "Home"
                                : "Unknown";
                            return `<tr><td class="highlight">${escapeHtml(name)}</td><td>${p.clicks || 0}</td><td>${p.visitors || 0}</td></tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================
    // DISTRIBUTION CHART (donut)
    // =========================================================
    function renderDistributionChart(accounts) {
        const canvas = $("distributionChart");
        if (!canvas || typeof Chart === "undefined") return;

        const ctx = canvas.getContext("2d");
        if (distributionChart) distributionChart.destroy();

        const labels = accounts.map(a => a.platform);
        const data   = accounts.map(a => a.clicks || 0);
        const colors = ["#2563EB", "#EF4444", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899"];

        distributionChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: cssVar("--text-secondary") }
                    }
                },
                cutout: "70%"
            }
        });
    }

    // =========================================================
    // ACCOUNTS MANAGE TAB
    // =========================================================
    async function loadAccountsManage() {
        try {
            const res  = await window.apiFetch("/api/social/accounts");
            const data = await res.json();
            if (data.success) renderAccountsManage(data.accounts || []);
        } catch (err) {
            console.error("Load accounts error:", err);
        }
    }

    function renderAccountsManage(accounts) {
        const container = $("accountsManageList");
        if (!container) return;
        if (!accounts.length) {
            container.innerHTML = `<div class="empty-state">No social accounts added yet.</div>`;
            return;
        }
        container.innerHTML = accounts.map(acc => {
            const icon = platformIcon(acc.platform);
            return `
                <div class="account-item" style="cursor:default;">
                    <div class="icon-wrap"><i data-lucide="${icon}" style="width:20px;height:20px;"></i></div>
                    <div class="info">
                        <div class="name">${escapeHtml(acc.display_name || acc.username || acc.platform)}</div>
                        <div class="handle">${escapeHtml(acc.platform)} · ${escapeHtml(acc.profile_url || "")}</div>
                        <div style="font-size:12px;color:var(--text-muted);">
                            ${acc.is_visible ? "Visible on portfolio" : "Hidden"}
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn-icon" data-id="${acc.id}" title="Edit">
                            <i data-lucide="edit-2" style="width:16px;height:16px;"></i>
                        </button>
                        <button class="btn-icon danger" data-id="${acc.id}" title="Delete">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        refreshIcons();
        wireAccountActions(container);
    }

    // =========================================================
    // ANALYTICS TAB
    // =========================================================
    async function loadAnalytics() {
        try {
            const accountsRes  = await window.apiFetch("/api/social/accounts");
            const accountsData = await accountsRes.json();

            const select = $("analyticsPlatform");
            if (accountsData.success && select) {
                const currentVal = select.value;
                select.innerHTML = `<option value="">All Platforms</option>`;
                (accountsData.accounts || []).forEach(acc => {
                    const opt = document.createElement("option");
                    opt.value = acc.platform;
                    opt.textContent = acc.platform;
                    select.appendChild(opt);
                });
                select.value = currentVal;
            }

            const days     = $("analyticsDays")?.value || 30;
            const platform = $("analyticsPlatform")?.value || "";

            const res  = await window.apiFetch(`/api/social/analytics/clicks-over-time?days=${days}&platform=${encodeURIComponent(platform)}`);
            const data = await res.json();
            if (data.success) renderClicksLineChart(data.data || []);

            const sourcesRes  = await window.apiFetch(`/api/social/analytics/traffic-sources?days=${days}`);
            const sourcesData = await sourcesRes.json();
            if (sourcesData.success) renderTrafficSources(sourcesData.sources || []);
        } catch (err) {
            console.error("Load analytics error:", err);
        }
    }

    function renderClicksLineChart(data) {
        const canvas = $("clicksLineChart");
        if (!canvas || typeof Chart === "undefined") return;

        const ctx = canvas.getContext("2d");
        if (clicksLineChart) clicksLineChart.destroy();

        const labels = data.map(d => d.date);
        const values = data.map(d => d.clicks);
        const color  = cssVar("--accent") || "#2563EB";

        clicksLineChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Clicks",
                    data: values,
                    borderColor: color,
                    backgroundColor: color + "20",
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
                        ticks: { color: cssVar("--text-muted") },
                        grid:  { color: cssVar("--border-color") }
                    },
                    y: {
                        ticks: { color: cssVar("--text-muted") },
                        grid:  { color: cssVar("--border-color") },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderTrafficSources(sources) {
        const container = $("trafficSourcesContainer");
        if (!container) return;
        if (!sources.length) {
            container.innerHTML = `<div class="empty-state">No data yet.</div>`;
            return;
        }
        const total = sources.reduce((sum, s) => sum + (s.visits || 0), 0);
        container.innerHTML = sources.map(s => {
            const pct = total > 0 ? Math.round((s.visits / total) * 100) : 0;
            return `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color);">
                    <span style="color:var(--text-secondary);">${escapeHtml(s.source)}</span>
                    <span style="color:var(--text-primary); font-weight:500;">${s.visits} (${pct}%)</span>
                </div>
            `;
        }).join("");
    }

    // =========================================================
    // CTA PERFORMANCE TAB
    // =========================================================
    async function loadCTAPerformance() {
        try {
            const res  = await window.apiFetch("/api/social/analytics/cta-performance");
            const data = await res.json();
            if (data.success) renderCTAPerformance(data.data || []);
        } catch (err) {
            console.error("Load CTA performance error:", err);
        }
    }

    function renderCTAPerformance(data) {
        const container = $("ctaPerformanceContainer");
        if (!container) return;
        if (!data.length) {
            container.innerHTML = `<div class="empty-state">No data yet.</div>`;
            return;
        }
        container.innerHTML = `
            <div class="table-wrap">
                <table class="data-table">
                    <thead><tr><th>CTA Location</th><th>Clicks</th><th>Unique Visitors</th></tr></thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                <td class="highlight">${escapeHtml(item.cta_location || "Unknown")}</td>
                                <td>${item.clicks || 0}</td>
                                <td>${item.unique_visitors || 0}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================
    // MODAL OPERATIONS
    // =========================================================
    function openAddModal() {
        if (!modal) return;
        if (modalTitle) modalTitle.textContent = "Add Social Account";
        if (accountId)  accountId.value = "";
        if (accountForm) accountForm.reset();
        if (accountIsVisible) accountIsVisible.checked = true;
        if (modalMessage) modalMessage.textContent = "";
        modal.classList.add("open");
    }

    async function openEditModal(id) {
        const acc = await fetchAccount(id);
        if (!acc || !modal) return;
        if (modalTitle) modalTitle.textContent = "Edit Social Account";
        if (accountId)          accountId.value = acc.id;
        if (accountPlatform)    accountPlatform.value = acc.platform || "";
        if (accountUsername)    accountUsername.value = acc.username || "";
        if (accountDisplayName) accountDisplayName.value = acc.display_name || "";
        if (accountProfileUrl)  accountProfileUrl.value = acc.profile_url || "";
        if (accountCtaLabel)    accountCtaLabel.value = acc.cta_label || "";
        if (accountIsVisible)   accountIsVisible.checked = acc.is_visible === 1;
        if (modalMessage) modalMessage.textContent = "";
        modal.classList.add("open");
    }

    async function fetchAccount(id) {
        try {
            const res  = await window.apiFetch("/api/social/accounts");
            const data = await res.json();
            if (data.success) return (data.accounts || []).find(a => a.id === id);
        } catch (e) { return null; }
    }

    function closeModal() {
        modal?.classList.remove("open");
    }

    // =========================================================
    // SAVE ACCOUNT
    // =========================================================
    accountForm?.addEventListener("submit", async function (e) {
        e.preventDefault();

        const id           = accountId?.value || "";
        const platform     = accountPlatform?.value || "";
        const username     = accountUsername?.value.trim() || "";
        const display_name = accountDisplayName?.value.trim() || "";
        const profile_url  = accountProfileUrl?.value.trim() || "";
        const cta_label    = accountCtaLabel?.value.trim() || "";
        const is_visible   = accountIsVisible?.checked ? 1 : 0;

        if (!platform || !profile_url) {
            if (modalMessage) modalMessage.textContent = "Platform and Profile URL are required.";
            return;
        }

        const payload  = { platform, username, display_name, profile_url, cta_label, is_visible };
        const method   = id ? "PUT" : "POST";
        const endpoint = id ? `/api/social/accounts/${id}` : "/api/social/accounts";

        try {
            const res  = await window.apiFetch(endpoint, { method, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Save failed");

            closeModal();
            loadOverview();
            loadAccountsManage();
            if (activeTab === "analytics") loadAnalytics();
            if (activeTab === "cta")       loadCTAPerformance();
        } catch (err) {
            if (modalMessage) modalMessage.textContent = "❌ " + err.message;
        }
    });

    // =========================================================
    // DELETE ACCOUNT
    // =========================================================
    async function deleteAccount(id) {
        try {
            const res  = await window.apiFetch(`/api/social/accounts/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Delete failed");

            loadOverview();
            loadAccountsManage();
            if (activeTab === "analytics") loadAnalytics();
            if (activeTab === "cta")       loadCTAPerformance();
        } catch (err) {
            alert("❌ " + err.message);
        }
    }

    // =========================================================
    // WIRE ACTIONS (shared)
    // =========================================================
    function wireAccountActions(container) {
        container.querySelectorAll(".btn-icon[data-id]").forEach(btn => {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id, 10);
                if (this.classList.contains("danger")) {
                    if (confirm("Delete this social account?")) deleteAccount(id);
                } else {
                    openEditModal(id);
                }
            });
        });
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    addAccountBtn?.addEventListener("click",  openAddModal);
    addAccountBtn2?.addEventListener("click", openAddModal);
    addAccountBtn3?.addEventListener("click", openAddModal);
    closeModalBtn?.addEventListener("click",  closeModal);
    cancelModalBtn?.addEventListener("click", closeModal);

    modal?.addEventListener("click", function (e) {
        if (e.target === this) closeModal();
    });

    $("analyticsDays")?.addEventListener("change",     loadAnalytics);
    $("analyticsPlatform")?.addEventListener("change", loadAnalytics);

    // =========================================================
    // HELPERS
    // =========================================================
    function platformIcon(platform) {
        const p = (platform || "").toLowerCase();
        return {
            instagram: "instagram",
            tiktok:    "music-2",
            youtube:   "youtube",
            linkedin:  "linkedin",
            twitter:   "twitter",
            x:         "twitter",
            facebook:  "facebook",
            github:    "github"
        }[p] || "link";
    }

    function setText(id, val) {
        const el = $(id);
        if (el) el.textContent = val;
    }

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function refreshIcons() {
        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[s]);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadOverview();
    refreshIcons();
});