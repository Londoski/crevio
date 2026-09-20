// =========================================================
// CREVIO — RECOVERY CODES MODAL
// File: dashboard/js/recovery-codes-modal.js
// Displays one-time recovery codes in a Crevio-styled modal.
// Grid layout + Copy all + Download .txt + confirm checkbox.
// Public API: window.crevioShowRecoveryCodes(codes, options)
// =========================================================
(function () {
    if (window.__crevioRecoveryModalInstalled) return;
    window.__crevioRecoveryModalInstalled = true;

    // ---------- Styles ----------
    if (!document.getElementById("__rcModalStyles")) {
        const style = document.createElement("style");
        style.id = "__rcModalStyles";
        style.textContent = `
            .rc-overlay {
                position:fixed; inset:0;
                background:rgba(0,0,0,0.6);
                backdrop-filter:blur(3px);
                display:flex; align-items:center; justify-content:center;
                padding:20px; z-index:5000;
                opacity:0; visibility:hidden;
                transition:opacity 0.15s, visibility 0.15s;
            }
            .rc-overlay.open { opacity:1; visibility:visible; }
            .rc-card {
                background:var(--bg-card, #1E293B);
                border:1px solid var(--border-color, #334155);
                border-radius:16px;
                padding:24px;
                width:100%;
                max-width:min(520px, 94vw);
                box-shadow:0 24px 60px rgba(0,0,0,0.6);
                color:var(--text-primary, #F1F5F9);
                font-family:'Inter', system-ui, sans-serif;
            }
            .rc-title { font-size:18px; font-weight:700; margin-bottom:14px; }
            .rc-warning {
                display:flex; gap:10px;
                background:rgba(245,158,11,0.12);
                border:1px solid rgba(245,158,11,0.35);
                border-radius:10px;
                padding:12px 14px; margin-bottom:18px;
                font-size:13px; line-height:1.5;
                color:#FCD34D;
            }
            .rc-warning svg { flex-shrink:0; margin-top:2px; }
            .rc-grid {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:8px; margin-bottom:18px;
            }
            .rc-code {
                background:var(--bg-input, #0F172A);
                border:1px solid var(--border-color, #334155);
                border-radius:8px;
                padding:10px 12px;
                font-family:'SF Mono', Menlo, Consolas, monospace;
                font-size:14px; font-weight:600;
                letter-spacing:0.03em;
                text-align:center;
                color:var(--text-primary, #F1F5F9);
                user-select:all; cursor:text;
            }
            .rc-actions { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
            .rc-btn {
                display:inline-flex; align-items:center; gap:6px;
                padding:9px 14px; border-radius:9px;
                font-size:13px; font-weight:600;
                font-family:inherit; cursor:pointer; border:none;
                transition:background 0.12s, border-color 0.12s, color 0.12s;
            }
            .rc-btn svg { width:14px; height:14px; }
            .rc-btn-ghost {
                background:transparent;
                border:1px solid var(--border-color, #334155);
                color:var(--text-secondary, #94A3B8);
            }
            .rc-btn-ghost:hover {
                border-color:var(--accent, #2563EB);
                color:var(--accent, #2563EB);
                background:var(--accent-dim, rgba(37,99,235,0.15));
            }
            .rc-btn-ghost.copied {
                border-color:#22C55E; color:#22C55E;
                background:rgba(34,197,94,0.12);
            }
            .rc-confirm {
                display:flex; align-items:flex-start; gap:10px;
                padding:12px 14px;
                background:var(--bg-input, #0F172A);
                border:1px solid var(--border-color, #334155);
                border-radius:10px; margin-bottom:16px;
                cursor:pointer; user-select:none;
            }
            .rc-confirm input {
                margin-top:2px; width:16px; height:16px;
                accent-color:var(--accent, #2563EB);
                cursor:pointer; flex-shrink:0;
            }
            .rc-confirm span {
                font-size:13px;
                color:var(--text-secondary, #94A3B8);
                line-height:1.5;
            }
            .rc-footer { display:flex; justify-content:flex-end; gap:10px; }
            .rc-btn-primary { background:var(--accent, #2563EB); color:#fff; }
            .rc-btn-primary:hover:not(:disabled) { background:var(--accent-hover, #1D4ED8); }
            .rc-btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
            @media (max-width: 480px) { .rc-grid { grid-template-columns:1fr; } }
        `;
        document.head.appendChild(style);
    }

    // ---------- Modal DOM ----------
    function ensureModal() {
        let overlay = document.getElementById("__rcOverlay");
        if (overlay) return overlay;

        overlay = document.createElement("div");
        overlay.id = "__rcOverlay";
        overlay.className = "rc-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
            <div class="rc-card">
                <div class="rc-title" id="__rcTitle">Your recovery codes</div>

                <div class="rc-warning">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                        <strong>Save these somewhere safe.</strong>
                        They are your backup if you ever lose access to your authenticator app.
                        You will not see them again after closing this dialog.
                    </div>
                </div>

                <div class="rc-grid" id="__rcGrid"></div>

                <div class="rc-actions">
                    <button class="rc-btn rc-btn-ghost" id="__rcCopyBtn" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span id="__rcCopyLabel">Copy all</span>
                    </button>
                    <button class="rc-btn rc-btn-ghost" id="__rcDownloadBtn" type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download .txt
                    </button>
                </div>

                <label class="rc-confirm">
                    <input type="checkbox" id="__rcCheckbox">
                    <span>I have saved these recovery codes somewhere safe. I understand they will not be shown again.</span>
                </label>

                <div class="rc-footer">
                    <button class="rc-btn rc-btn-primary" id="__rcDoneBtn" type="button" disabled>Done</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    // ---------- Public API ----------
    function showRecoveryCodes(codes, options) {
        options = options || {};
        return new Promise(function (resolve) {
            if (!Array.isArray(codes) || !codes.length) {
                console.warn("[recoveryModal] empty codes array");
                resolve({ success: false });
                return;
            }

            const overlay = ensureModal();
            const titleEl = overlay.querySelector("#__rcTitle");
            const gridEl = overlay.querySelector("#__rcGrid");
            const copyBtn = overlay.querySelector("#__rcCopyBtn");
            const copyLabel = overlay.querySelector("#__rcCopyLabel");
            const dlBtn = overlay.querySelector("#__rcDownloadBtn");
            const checkbox = overlay.querySelector("#__rcCheckbox");
            const doneBtn = overlay.querySelector("#__rcDoneBtn");

            titleEl.textContent = options.title || "Your recovery codes";

            checkbox.checked = false;
            doneBtn.disabled = true;
            copyBtn.classList.remove("copied");
            copyLabel.textContent = "Copy all";

            gridEl.innerHTML = "";
            codes.forEach(function (code) {
                const el = document.createElement("div");
                el.className = "rc-code";
                el.textContent = code;
                gridEl.appendChild(el);
            });

            checkbox.onchange = function () {
                doneBtn.disabled = !checkbox.checked;
            };

            copyBtn.onclick = async function () {
                const text = codes.join("\n");
                let ok = false;
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                        ok = true;
                    } else {
                        const ta = document.createElement("textarea");
                        ta.value = text;
                        ta.style.position = "fixed";
                        ta.style.opacity = "0";
                        document.body.appendChild(ta);
                        ta.select();
                        ok = document.execCommand("copy");
                        document.body.removeChild(ta);
                    }
                } catch (e) { ok = false; }

                if (ok) {
                    copyBtn.classList.add("copied");
                    copyLabel.textContent = "Copied!";
                    setTimeout(function () {
                        copyBtn.classList.remove("copied");
                        copyLabel.textContent = "Copy all";
                    }, 1600);
                }
            };

            dlBtn.onclick = function () {
                const text =
                    "Crevio Recovery Codes\n" +
                    "Generated: " + new Date().toISOString() + "\n" +
                    "----------------------------------------\n\n" +
                    codes.join("\n") + "\n\n" +
                    "Keep these somewhere safe. Each code can be used once.\n" +
                    "If you lose access to your authenticator, use one of these to sign in.\n";
                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "crevio-recovery-codes.txt";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            };

            doneBtn.onclick = function () {
                overlay.classList.remove("open");
                overlay.setAttribute("aria-hidden", "true");
                resolve({ success: true });
            };

            overlay.classList.add("open");
            overlay.setAttribute("aria-hidden", "false");
            setTimeout(function () {
                try { checkbox.focus(); } catch (e) {}
            }, 100);
        });
    }

    window.crevioShowRecoveryCodes = showRecoveryCodes;
    console.log("[RecoveryCodesModal] installed");
})();