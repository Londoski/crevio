// =========================================================
// CREVIO — BILLING PAGE
// File: dashboard/js/billing.js
// =========================================================
// Reads /api/billing/entitlements + /api/billing/usage,
// renders plan cards + usage bars + cycle toggle,
// wires "Upgrade" → POST /api/billing/checkout → Paystack.
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const toast = document.getElementById("toast");

    let entitlements = null;      // from /api/billing/entitlements
    let currentCycle = "monthly"; // "monthly" | "annual"

    // ---------- NAIRA FORMATTER ----------
    // kobo → "₦5,000" (no decimals for whole naira)
    function formatKobo(kobo) {
        const n = Number(kobo) || 0;
        const naira = n / 100;
        const str = Number.isInteger(naira)
            ? naira.toLocaleString("en-NG")
            : naira.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return "\u20A6" + str;
    }

    // ---------- LOAD ENTITLEMENTS ----------
    async function loadEntitlements() {
        try {
            const res = await window.apiFetch("/api/billing/entitlements");
            const data = await res.json();
            if (!data.success || !data.entitlements) return null;
            entitlements = data.entitlements;
            entitlements.allPlans = data.plans || [];
            return entitlements;
        } catch (e) {
            console.warn("Load entitlements error:", e);
            return null;
        }
    }

    // ---------- RENDER CURRENT PLAN BANNER ----------
    function renderCurrentPlan() {
        const nameEl = document.getElementById("planName");
        const statusEl = document.getElementById("planStatus");
        const descEl = document.getElementById("planDesc");
        const priceEl = document.getElementById("planPrice");

        if (!entitlements) return;

        const p = entitlements.plan;
        const cfg = entitlements.plan;
        const isPaid = p.id !== "free";

        nameEl.textContent = p.name;
        statusEl.textContent = "Active";
        descEl.textContent = p.tagline || "";

        if (isPaid) {
            const monthly = entitlements.limits ? null : null;
            // Pull prices from raw config — plan object has priceLabelMonthly / priceLabelAnnual
            const priceLabel = currentCycle === "annual"
                ? (p.priceLabelAnnual || p.priceLabel)
                : (p.priceLabelMonthly || p.priceLabel);

            priceEl.innerHTML = priceLabel
                ? priceLabel.replace("/", "<small>/").replace("month", "mo").replace("year", "yr") + "</small>"
                : (p.priceLabel || "");
        } else {
            priceEl.innerHTML = "Free <small>forever</small>";
        }
    }

    // ---------- RENDER PLAN CARDS ----------
    function renderPlanCards() {
        const container = document.getElementById("planCards");
        if (!container || !entitlements || !entitlements.allPlans) return;

        const currentId = entitlements.planId;
        const planRank = { free: 0, pro: 1, business: 2 };

        const cards = entitlements.allPlans.map(function (plan) {
            const isCurrent = plan.id === currentId;
            const isUpgrade = planRank[plan.id] > planRank[currentId];
            const isDowngrade = planRank[plan.id] < planRank[currentId];

            // Prices in kobo (from config)
            const pMonthly = plan.priceMonthly || plan.price || 0;
            const pAnnual = plan.priceAnnual || 0;
            const displayPrice = currentCycle === "annual" ? pAnnual : pMonthly;
            const displayLabel = plan.id === "free"
                ? "Free"
                : formatKobo(displayPrice) + (currentCycle === "annual" ? "/yr" : "/mo");

            const intervalSavings = (plan.id !== "free" && currentCycle === "annual")
                ? Math.round((1 - (pAnnual / (pMonthly * 12))) * 100)
                : 0;

            let ctaLabel, ctaClass, ctaAction;
            if (isCurrent) {
                ctaLabel = "Current Plan";
                ctaClass = "btn-disabled";
                ctaAction = null;
            } else if (isUpgrade) {
                ctaLabel = "Upgrade to " + plan.name;
                ctaClass = "btn-primary";
                ctaAction = "checkout:" + plan.id;
            } else if (isDowngrade) {
                ctaLabel = plan.id === "free" ? "Downgrade to Free" : "Switch to " + plan.name;
                ctaClass = "btn-secondary";
                ctaAction = plan.id === "free" ? null : ("checkout:" + plan.id);
            } else {
                ctaLabel = "Select";
                ctaClass = "btn-secondary";
                ctaAction = "checkout:" + plan.id;
            }

            return `
                <div class="plan-card ${isCurrent ? "current" : ""} ${isUpgrade ? "featured" : ""}">
                    ${isUpgrade ? '<div class="plan-ribbon">Recommended</div>' : ""}
                    <div class="plan-card-head">
                        <h3>${escapeHtml(plan.name)}</h3>
                        <p class="plan-card-tagline">${escapeHtml(plan.tagline || "")}</p>
                    </div>
                    <div class="plan-card-price">
                        <div class="plan-card-amount">${displayLabel}</div>
                        ${intervalSavings > 0 ? '<div class="plan-card-save">Save ' + intervalSavings + '%</div>' : ""}
                    </div>
                    <ul class="plan-card-features">
                        ${(plan.features || []).slice(0, 8).map(function (f) {
                            return "<li>" + escapeHtml(f) + "</li>";
                        }).join("")}
                    </ul>
                    <button class="${ctaClass}" ${ctaAction ? 'data-action="' + ctaAction + '"' : "disabled"}>
                        ${escapeHtml(ctaLabel)}
                    </button>
                </div>
            `;
        }).join("");

        container.innerHTML = cards;

        // Wire upgrade buttons
        container.querySelectorAll("[data-action^='checkout:']").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const planId = btn.dataset.action.split(":")[1];
                startCheckout(planId);
            });
        });
    }

    // ---------- START CHECKOUT ----------
    async function startCheckout(planId) {
        try {
            // Disable all plan buttons while we talk to Paystack
            document.querySelectorAll("[data-action^='checkout:']").forEach(function (b) { b.disabled = true; });

            const res = await window.apiFetch("/api/billing/checkout", {
                method: "POST",
                body: JSON.stringify({ plan: planId, cycle: currentCycle })
            });
            const data = await res.json();

            if (!data.success || !data.authorizationUrl) {
                showToast(data.message || "Could not start checkout", true);
                document.querySelectorAll("[data-action^='checkout:']").forEach(function (b) { b.disabled = false; });
                return;
            }

            // Redirect to Paystack hosted checkout
            window.location.href = data.authorizationUrl;
        } catch (e) {
            showToast("Checkout failed: " + (e.message || "network error"), true);
            document.querySelectorAll("[data-action^='checkout:']").forEach(function (b) { b.disabled = false; });
        }
    }

    // ---------- USAGE ----------
    async function loadUsage() {
        const container = document.getElementById("usageContainer");
        if (!container) return;
        try {
            const res = await window.apiFetch("/api/billing/usage");
            const data = await res.json();

            if (!data.success || !data.usage) {
                container.innerHTML = '<div class="empty-state"><p>No usage data available.</p></div>';
                return;
            }

            const u = data.usage;
            const items = [
                { label: "Projects",    used: u.projects_used || 0, max: u.projects_limit },
                { label: "Media Files", used: u.media_used    || 0, max: u.media_limit },
                { label: "Services",    used: u.services_used || 0, max: u.services_limit },
                { label: "Skills",      used: u.skills_used   || 0, max: u.skills_limit }
            ].filter(function (i) { return i.max !== undefined; });

            container.innerHTML = items.map(renderUsage).join("");
        } catch (err) {
            console.warn("Load usage error:", err);
            container.innerHTML = '<div class="empty-state"><p>No usage data available.</p></div>';
        }
    }

    function renderUsage(item) {
        const isUnlimited = item.max === -1;
        const max = isUnlimited ? item.used : Math.max(item.max, 1);
        const pct = isUnlimited ? 0 : Math.min(Math.round((item.used / max) * 100), 100);
        let cls = "";
        if (!isUnlimited) {
            if (pct >= 90) cls = "danger";
            else if (pct >= 70) cls = "warn";
        }
        const limitLabel = isUnlimited ? "unlimited" : item.max;

        return `
            <div class="usage-item">
                <div class="usage-head">
                    <span>${escapeHtml(item.label)}</span>
                    <span>${item.used} / ${limitLabel}</span>
                </div>
                <div class="usage-bar">
                    <div class="fill ${cls}" style="width:${isUnlimited ? 100 : pct}%;${isUnlimited ? "opacity:0.35;" : ""}"></div>
                </div>
            </div>
        `;
    }

    // ---------- PAYMENT HISTORY ----------
    async function loadPayments() {
        const container = document.getElementById("paymentsContainer");
        if (!container) return;
        try {
            const res = await window.apiFetch("/api/billing/payments");
            const data = await res.json();

            if (!data.success || !data.payments || !data.payments.length) {
                container.innerHTML =
                    '<div class="empty-state"><i data-lucide="receipt" class="icon"></i><p>No payments yet.</p></div>';
                if (typeof lucide !== "undefined") lucide.createIcons();
                return;
            }

            container.innerHTML = `
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th style="text-align:right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.payments.map(renderPaymentRow).join("")}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            console.warn("Load payments error:", err);
            container.innerHTML = '<div class="empty-state"><p>Could not load payments.</p></div>';
        }
    }

    function renderPaymentRow(p) {
        const date = p.created_at
            ? new Date(p.created_at.replace(" ", "T") + "Z").toLocaleDateString()
            : "\u2014";
        const amountNaira = formatKobo(p.amount || 0);
        const status = (p.status || "succeeded").toLowerCase();
        const ok = status === "succeeded" || status === "paid" || status === "completed";

        return `
            <tr>
                <td>${date}</td>
                <td>${escapeHtml(p.description || "Subscription payment")}</td>
                <td>${escapeHtml(p.payment_method || "Card")}</td>
                <td class="${ok ? "status-ok" : "status-fail"}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                <td class="amount" style="text-align:right;">${amountNaira}</td>
            </tr>
        `;
    }

    // ---------- CYCLE TOGGLE ----------
    function wireCycleToggle() {
        document.querySelectorAll("[data-cycle]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const cycle = btn.dataset.cycle;
                if (cycle === currentCycle) return;
                currentCycle = cycle;
                document.querySelectorAll("[data-cycle]").forEach(function (b) {
                    b.classList.toggle("active", b.dataset.cycle === cycle);
                });
                renderCurrentPlan();
                renderPlanCards();
            });
        });
    }

    // ---------- MANAGE SUBSCRIPTION ----------
    function wireManageButton() {
        const btn = document.getElementById("manageSubBtn");
        if (!btn) return;
        btn.addEventListener("click", async function () {
            try {
                const res = await window.apiFetch("/api/billing/portal", { method: "POST" });
                const data = await res.json();
                if (data.success && data.manageUrl) {
                    window.open(data.manageUrl, "_blank");
                } else {
                    showToast(data.message || "No active subscription to manage", true);
                }
            } catch (e) {
                showToast("Could not open portal", true);
            }
        });
    }

    // ---------- HELPERS ----------
    let toastTimer;
    function showToast(msg, isError) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", !!isError);
        toast.classList.add("show");
        toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 3000);
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (s) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
        });
    }

    // ---------- INIT ----------
    (async function init() {
        await loadEntitlements();
        renderCurrentPlan();
        renderPlanCards();
        wireCycleToggle();
        wireManageButton();
        loadUsage();
        loadPayments();
        if (typeof lucide !== "undefined") lucide.createIcons();
    })();
});