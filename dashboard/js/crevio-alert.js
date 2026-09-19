// =========================================================
// CREVIO ALERT DIALOG
// File: dashboard/js/crevio-alert.js
// Self-contained: injects CSS + overlay on load.
// API: await window.crevioAlert(message, opts) -> true
//   opts.kind   = "error" | "warning" | "info" | "success"
//   opts.title  = string (overrides default title)
//   opts.confirmText = string (default "OK")
// =========================================================
(function () {
    if (window.__crevioAlertInstalled) return;
    window.__crevioAlertInstalled = true;

    // ---------- CSS ----------
    if (!document.getElementById("__crevioAlertStyles")) {
        const st = document.createElement("style");
        st.id = "__crevioAlertStyles";
        st.textContent = `
            .crevio-alert-overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
                z-index: 5001;
                opacity: 0; visibility: hidden;
                transition: opacity 0.15s, visibility 0.15s;
            }
            .crevio-alert-overlay.open { opacity: 1; visibility: visible; }
            .crevio-alert-card {
                background: var(--bg-card, #1E293B);
                border: 1px solid var(--border-color, #334155);
                border-radius: 14px;
                width: 100%;
                max-width: min(400px, 94vw);
                padding: 24px;
                box-shadow: 0 24px 60px rgba(0,0,0,0.6);
                display: flex;
                flex-direction: column;
                gap: 14px;
                transform: translateY(6px) scale(0.98);
                transition: transform 0.18s;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
            }
            .crevio-alert-overlay.open .crevio-alert-card {
                transform: translateY(0) scale(1);
            }
            .crevio-alert-header {
                display: flex; align-items: flex-start; gap: 12px;
            }
            .crevio-alert-icon {
                width: 40px; height: 40px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                background: rgba(239,68,68,0.12);
                color: #EF4444;
            }
            .crevio-alert-icon.info    { background: rgba(37,99,235,0.12); color: #2563EB; }
            .crevio-alert-icon.success { background: rgba(34,197,94,0.12); color: #22C55E; }
            .crevio-alert-icon.warning { background: rgba(245,158,11,0.12); color: #F59E0B; }
            .crevio-alert-icon .icon { width: 20px; height: 20px; }
            .crevio-alert-titles { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
            .crevio-alert-title {
                font-size: 16px; font-weight: 700;
                color: var(--text-primary, #F1F5F9);
                line-height: 1.3;
            }
            .crevio-alert-message {
                font-size: 14px;
                color: var(--text-secondary, #94A3B8);
                line-height: 1.5;
                word-wrap: break-word;
                white-space: pre-wrap;
            }
            .crevio-alert-actions {
                display: flex; gap: 10px; justify-content: flex-end;
                margin-top: 4px;
            }
            .crevio-alert-btn {
                font-family: inherit;
                font-size: 13px; font-weight: 600;
                padding: 9px 22px;
                border-radius: 9px;
                border: none;
                cursor: pointer;
                transition: background 0.12s, opacity 0.12s;
                min-width: 84px;
                background: var(--accent, #2563EB);
                color: #fff;
            }
            .crevio-alert-btn:hover { background: var(--accent-hover, #1D4ED8); }
        `;
        document.head.appendChild(st);
    }

    // ---------- Overlay ----------
    function ensureOverlay() {
        let o = document.getElementById("crevioAlertOverlay");
        if (o) return o;
        o = document.createElement("div");
        o.id = "crevioAlertOverlay";
        o.className = "crevio-alert-overlay";
        o.setAttribute("role", "dialog");
        o.setAttribute("aria-hidden", "true");
        o.innerHTML = `
            <div class="crevio-alert-card">
                <div class="crevio-alert-header">
                    <div class="crevio-alert-icon" id="crevioAlertIcon">
                        <i data-lucide="alert-circle" class="icon"></i>
                    </div>
                    <div class="crevio-alert-titles">
                        <div class="crevio-alert-title" id="crevioAlertTitle">Notice</div>
                        <div class="crevio-alert-message" id="crevioAlertMessage"></div>
                    </div>
                </div>
                <div class="crevio-alert-actions">
                    <button type="button" class="crevio-alert-btn" id="crevioAlertOk">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(o);
        return o;
    }

    function refreshIcons() {
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    const KINDS = {
        error:   { icon: "alert-circle",   cls: "",        title: "Something went wrong" },
        warning: { icon: "alert-triangle", cls: "warning", title: "Heads up" },
        info:    { icon: "info",           cls: "info",    title: "Notice" },
        success: { icon: "check-circle",   cls: "success", title: "Success" }
    };

    // ---------- Public API ----------
    window.crevioAlert = function (message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            const overlay = ensureOverlay();
            const iconEl  = document.getElementById("crevioAlertIcon");
            const titleEl = document.getElementById("crevioAlertTitle");
            const msgEl   = document.getElementById("crevioAlertMessage");
            const okBtn   = document.getElementById("crevioAlertOk");

            const kind = KINDS[opts.kind] ? opts.kind : "error";
            const conf = KINDS[kind];

            titleEl.textContent = opts.title || conf.title;
            msgEl.textContent   = message || "";
            okBtn.textContent   = opts.confirmText || "OK";

            iconEl.className = "crevio-alert-icon " + conf.cls;
            iconEl.innerHTML = '<i data-lucide="' + conf.icon + '" class="icon"></i>';

            refreshIcons();
            overlay.classList.add("open");

            function close() {
                overlay.classList.remove("open");
                okBtn.removeEventListener("click", onOk);
                overlay.removeEventListener("click", onOverlay);
                document.removeEventListener("keydown", onKey);
                resolve(true);
            }
            function onOk() { close(); }
            function onOverlay(e) { if (e.target === overlay) close(); }
            function onKey(e) {
                if (e.key === "Escape" || e.key === "Enter") close();
            }

            okBtn.addEventListener("click", onOk);
            overlay.addEventListener("click", onOverlay);
            document.addEventListener("keydown", onKey);
            setTimeout(function () { try { okBtn.focus(); } catch (e) {} }, 40);
        });
    };

    console.log("[Crevio Alert] installed");
})();