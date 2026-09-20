// =========================================================
// CREVIO — MESSAGES ENTITLEMENTS
// File: dashboard/js/messages-entitlements.js
// Reads /api/billing/entitlements once and injects a live
// character counter next to the message composer. Disables
// send when the plan limit is exceeded. Never hardcodes
// plan limits — always reads from the API.
// Isolated from messages.js — safe to remove.
// =========================================================
(function () {
    if (window.__crevioEntitlementsInstalled) return;
    window.__crevioEntitlementsInstalled = true;

    let entCache = null;
    let entPending = null;

    function authHeaders() {
        const token = localStorage.getItem("token");
        return { "Authorization": token ? "Bearer " + token : "" };
    }

    async function loadEntitlements() {
        if (entCache) return entCache;
        if (entPending) return entPending;
        entPending = (async function () {
            try {
                const res = await fetch("/api/billing/entitlements", { headers: authHeaders() });
                const data = await res.json();
                if (data && data.success && data.entitlements) {
                    entCache = data.entitlements;
                    return entCache;
                }
            } catch (e) {}
            return null;
        })();
        return entPending;
    }

    function findComposer() {
        const bar = document.querySelector(".chat-input-bar");
        if (!bar) return null;
        const ta = bar.querySelector("textarea");
        const btn = bar.querySelector(".send-btn");
        return { bar: bar, ta: ta, btn: btn };
    }

    async function injectCounter() {
        const c = findComposer();
        if (!c || !c.bar || !c.ta || !c.btn) return;
        if (c.bar.dataset.entInjected === "1") return;
        c.bar.dataset.entInjected = "1";

        const ent = await loadEntitlements();
        if (!ent) return;

        const maxLen = ent.limits && ent.limits["messages.max_length"];
        const unlimited = (maxLen === -1);

        let counter = c.bar.querySelector(".ent-counter");
        if (!counter) {
            counter = document.createElement("span");
            counter.className = "ent-counter";
            counter.style.cssText =
                "font-size:11px;color:var(--text-muted);align-self:center;" +
                "margin-right:6px;white-space:nowrap;font-variant-numeric:tabular-nums;";
            c.bar.insertBefore(counter, c.btn);
        }

        function update() {
            const current = c.ta.value.length;
            if (unlimited) {
                counter.textContent = current + " / unlimited";
                counter.style.color = "var(--text-muted)";
                c.btn.disabled = false;
                return;
            }
            counter.textContent = current + " / " + maxLen;
            if (current > maxLen) {
                counter.style.color = "var(--danger, #EF4444)";
                c.btn.disabled = true;
            } else if (current >= Math.floor(maxLen * 0.9)) {
                counter.style.color = "var(--warning, #F59E0B)";
                c.btn.disabled = false;
            } else {
                counter.style.color = "var(--text-muted)";
                c.btn.disabled = false;
            }
        }

        c.ta.addEventListener("input", update);
        update();

        // Expose for debugging
        window.__crevioEntitlements = ent;
    }

    function scan() {
        const c = findComposer();
        if (c && c.bar && c.bar.dataset.entInjected !== "1") {
            injectCounter();
        }
    }

    if (window.MutationObserver) {
        let t;
        new MutationObserver(function () {
            clearTimeout(t);
            t = setTimeout(scan, 200);
        }).observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("load", function () { setTimeout(scan, 500); });
    if (document.readyState === "complete") setTimeout(scan, 300);
    else document.addEventListener("DOMContentLoaded", function () { setTimeout(scan, 300); });

    console.log("[MessagesEntitlements] installed");
})();
