// =========================================================
// CREVIO CONFIRM DIALOG
// File: dashboard/js/crevio-confirm.js
// Self-contained: injects its own CSS + overlay on load.
// API: await window.crevioConfirm(message, opts) -> boolean
// =========================================================
(function () {
    if (window.__crevioConfirmInstalled) return;
    window.__crevioConfirmInstalled = true;

    // ---------- CSS ----------
    if (!document.getElementById("__crevioConfirmStyles")) {
        const st = document.createElement("style");
        st.id = "__crevioConfirmStyles";
        st.textContent = `
            .crevio-confirm-overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(3px);
                display: flex; align-items: center; justify-content: center;
                padding: 20px;
                z-index: 5000;
                opacity: 0; visibility: hidden;
                transition: opacity 0.15s, visibility 0.15s;
            }
            .crevio-confirm-overlay.open { opacity: 1; visibility: visible; }
            .crevio-confirm-card {
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
            }
            .crevio-confirm-overlay.open .crevio-confirm-card {
                transform: translateY(0) scale(1);
            }
            .crevio-confirm-header {
                display: flex; align-items: flex-start; gap: 12px;
            }
            .crevio-confirm-icon {
                width: 40px; height: 40px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                background: rgba(239,68,68,0.12);
                color: #EF4444;
            }
            .crevio-confirm-icon.info {
                background: rgba(37,99,235,0.12);
                color: #2563EB;
            }
            .crevio-confirm-icon .icon { width: 20px; height: 20px; }
            .crevio-confirm-titles { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
            .crevio-confirm-title {
                font-size: 16px; font-weight: 700;
                color: var(--text-primary, #F1F5F9);
                line-height: 1.3;
            }
            .crevio-confirm-message {
                font-size: 14px;
                color: var(--text-secondary, #94A3B8);
                line-height: 1.5;
                word-wrap: break-word;
            }
            .crevio-confirm-actions {
                display: flex; gap: 10px; justify-content: flex-end;
                margin-top: 4px;
            }
            .dialog-btn {
                font-family: inherit;
                font-size: 13px; font-weight: 600;
                padding: 9px 18px;
                border-radius: 9px;
                border: none;
                cursor: pointer;
                transition: background 0.12s, opacity 0.12s;
                min-width: 84px;
            }
            .dialog-btn.primary {
                background: var(--accent, #2563EB);
                color: #fff;
            }
            .dialog-btn.primary:hover { background: var(--accent-hover, #1D4ED8); }
            .dialog-btn.danger {
                background: var(--danger, #EF4444);
                color: #fff;
            }
            .dialog-btn.danger:hover { opacity: 0.9; }
            .dialog-btn.ghost {
                background: transparent;
                color: var(--text-secondary, #94A3B8);
                border: 1px solid var(--border-color, #334155);
            }
            .dialog-btn.ghost:hover {
                background: var(--bg-input, rgba(255,255,255,0.04));
                color: var(--text-primary, #F1F5F9);
            }
        `;
        document.head.appendChild(st);
    }

    // ---------- Overlay markup (injected once) ----------
    function ensureOverlay() {
        let overlay = document.getElementById("crevioConfirmOverlay");
        if (overlay) return overlay;

        overlay = document.createElement("div");
        overlay.id = "crevioConfirmOverlay";
        overlay.className = "crevio-confirm-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
            <div class="crevio-confirm-card">
                <div class="crevio-confirm-header">
                    <div class="crevio-confirm-icon" id="crevioConfirmIcon">
                        <i data-lucide="alert-triangle" class="icon"></i>
                    </div>
                    <div class="crevio-confirm-titles">
                        <div class="crevio-confirm-title" id="crevioConfirmTitle">Are you sure?</div>
                        <div class="crevio-confirm-message" id="crevioConfirmMessage"></div>
                    </div>
                </div>
                <div class="crevio-confirm-actions">
                    <button type="button" class="dialog-btn ghost" id="crevioConfirmCancel">Cancel</button>
                    <button type="button" class="dialog-btn danger" id="crevioConfirmOk">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function refreshIcons() {
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    // ---------- Public API ----------
    window.crevioConfirm = function (message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            const overlay = ensureOverlay();
            const iconEl  = document.getElementById("crevioConfirmIcon");
            const titleEl = document.getElementById("crevioConfirmTitle");
            const msgEl   = document.getElementById("crevioConfirmMessage");
            const okBtn   = document.getElementById("crevioConfirmOk");
            const cancel  = document.getElementById("crevioConfirmCancel");

            titleEl.textContent = opts.title || "Are you sure?";
            msgEl.textContent   = message || "";
            okBtn.textContent   = opts.confirmText || "Confirm";
            cancel.textContent  = opts.cancelText  || "Cancel";

            iconEl.classList.toggle("info", !!opts.info);
            iconEl.innerHTML = opts.info
                ? '<i data-lucide="info" class="icon"></i>'
                : '<i data-lucide="alert-triangle" class="icon"></i>';

            okBtn.className = "dialog-btn " + (opts.danger === false ? "primary" : "danger");

            refreshIcons();
            overlay.classList.add("open");

            function close(result) {
                overlay.classList.remove("open");
                okBtn.removeEventListener("click", onOk);
                cancel.removeEventListener("click", onCancel);
                overlay.removeEventListener("click", onOverlay);
                document.removeEventListener("keydown", onKey);
                resolve(result);
            }
            function onOk()       { close(true); }
            function onCancel()   { close(false); }
            function onOverlay(e) { if (e.target === overlay) close(false); }
            function onKey(e) {
                if (e.key === "Escape") close(false);
                if (e.key === "Enter")  close(true);
            }

            okBtn.addEventListener("click", onOk);
            cancel.addEventListener("click", onCancel);
            overlay.addEventListener("click", onOverlay);
            document.addEventListener("keydown", onKey);
        });
    };

    console.log("[Crevio Confirm] installed");
})();