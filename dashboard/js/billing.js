// =========================================================
// CREVIO — BILLING PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const toast = document.getElementById("toast");

    // ---------- LOAD PLAN ----------
    async function loadPlan() {
        try {
            const res  = await window.apiFetch("/api/billing/plan");
            const data = await res.json();

            if (data.success && data.plan) {
                const p = data.plan;
                document.getElementById("planName").textContent   = p.name || "Free Plan";
                document.getElementById("planStatus").textContent = p.status || "Active";
                document.getElementById("planDesc").textContent   = p.description || "Basic features to get you started";
                document.getElementById("planPrice").innerHTML    =
                    `$${p.price || 0}<small>/${p.interval || "mo"}</small>`;
            }
        } catch (err) {
            console.warn("Load plan error:", err);
        }
    }

    // ---------- LOAD USAGE ----------
    async function loadUsage() {
        const container = document.getElementById("usageContainer");
        try {
            const res  = await window.apiFetch("/api/billing/usage");
            const data = await res.json();

            if (!data.success || !data.usage) {
                container.innerHTML = `<div class="empty-state"><p>No usage data available.</p></div>`;
                return;
            }

            const u = data.usage;
            const items = [
                { label: "Projects",      used: u.projects_used     || 0, max: u.projects_limit     || 10 },
                { label: "Media Files",   used: u.media_used        || 0, max: u.media_limit        || 50 },
                { label: "Services",      used: u.services_used     || 0, max: u.services_limit     || 5 },
                { label: "Messages",      used: u.messages_used     || 0, max: u.messages_limit     || 100 }
            ];

            container.innerHTML = items.map(renderUsage).join("");
        } catch (err) {
            console.warn("Load usage error:", err);
            container.innerHTML = `<div class="empty-state"><p>No usage data available.</p></div>`;
        }
    }

    function renderUsage(item) {
        const pct = Math.min(Math.round((item.used / item.max) * 100), 100);
        let cls = "";
        if (pct >= 90)      cls = "danger";
        else if (pct >= 70) cls = "warn";

        return `
            <div class="usage-item">
                <div class="usage-head">
                    <span>${item.label}</span>
                    <span>${item.used} / ${item.max}</span>
                </div>
                <div class="usage-bar">
                    <div class="fill ${cls}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }

    // ---------- LOAD PAYMENT HISTORY ----------
    async function loadPayments() {
        const container = document.getElementById("paymentsContainer");
        try {
            const res  = await window.apiFetch("/api/billing/payments");
            const data = await res.json();

            if (!data.success || !data.payments || !data.payments.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="receipt" class="icon"></i>
                        <p>No payments yet.</p>
                    </div>`;
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
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.payments.map(renderPaymentRow).join("")}
                        </tbody>
                    </table>
                </div>`;

            // Download handler
            container.querySelectorAll("[data-invoice]").forEach(el => {
                el.addEventListener("click", () => {
                    const id = el.dataset.invoice;
                    window.apiFetch(`/api/billing/payments/${id}/invoice`)
                        .then(r => r.blob())
                        .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `invoice-${id}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                        })
                        .catch(() => showToast("Invoice not available", true));
                });
            });
        } catch (err) {
            console.warn("Load payments error:", err);
            container.innerHTML = `<div class="empty-state"><p>Could not load payments.</p></div>`;
        }
    }

    function renderPaymentRow(p) {
        const date   = p.created_at ? new Date(p.created_at.replace(" ", "T") + "Z").toLocaleDateString() : "—";
        const amount = ((p.amount || 0) / 100).toFixed(2);
        const status = (p.status || "succeeded").toLowerCase();
        const ok     = status === "succeeded" || status === "paid" || status === "completed";

        return `
            <tr>
                <td>${date}</td>
                <td>${escapeHtml(p.description || "Subscription payment")}</td>
                <td>${escapeHtml(p.payment_method || "Card")}</td>
                <td class="${ok ? 'status-ok' : 'status-fail'}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                <td class="amount" style="text-align:right;">$${amount}</td>
                <td style="text-align:right;">
                    <button class="btn-secondary btn-sm" data-invoice="${p.id}">Invoice</button>
                </td>
            </tr>
        `;
    }

    // ---------- UPGRADE / ADD CARD ----------
    document.getElementById("upgradeBtn")?.addEventListener("click", () => {
        showToast("Plan upgrades coming soon — contact sales@crevio.test");
    });

    document.getElementById("addCardBtn")?.addEventListener("click", () => {
        showToast("Card setup coming soon — Stripe integration pending");
    });

    // ---------- HELPERS ----------
    let toastTimer;
    function showToast(msg, isError = false) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    // ---------- INIT ----------
    loadPlan();
    loadUsage();
    loadPayments();
});