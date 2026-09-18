// ============================================================
// CREVIO — GLOBAL BUTTON FEEDBACK (fast)
// File: dashboard/js/button-feedback.js
// - Kills the 300ms mobile tap delay (touch-action: manipulation)
// - Forces pointer-events: auto on every button
// - Icons inside buttons don't steal clicks
// - Instant visual press (no transform — doesn't shift hit area)
// ============================================================
(function () {
    if (window.__crevioBtnFeedback) return;
    window.__crevioBtnFeedback = true;

    // Inject CSS once
    if (!document.getElementById("__crevioBtnFeedbackStyles")) {
        const style = document.createElement("style");
        style.id = "__crevioBtnFeedbackStyles";
        style.textContent = `
            /* ---- 1. Kill the 300ms mobile tap delay ---- */
            button,
            [role="button"],
            .icon-btn,
            .btn-primary,
            .btn-secondary,
            .chip,
            .nav-item,
            .suggestion-chip,
            .confirm-btn,
            .delete-option,
            .delete-cancel,
            .rp-tab,
            .rp-emoji,
            .ip-tab,
            .ip-emoji,
            .reaction-btn,
            .msg-tool,
            .chip-more,
            .ctx-action,
            .ctx-related,
            .ctx-notes-save,
            .conv-item,
            input,
            textarea,
            select,
            a {
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: transparent !important;
            }

            /* ---- 2. Buttons: cursor + pointer-events guaranteed ---- */
            button,
            [role="button"],
            .icon-btn,
            .btn-primary,
            .btn-secondary,
            .chip,
            .chip-more,
            .rp-tab,
            .rp-emoji,
            .ip-tab,
            .ip-emoji,
            .reaction-btn,
            .msg-tool,
            .ctx-action,
            .ctx-notes-save,
            .confirm-btn,
            .delete-option,
            .delete-cancel {
                cursor: pointer !important;
                pointer-events: auto !important;
            }

            /* ---- 3. Icons inside buttons never steal clicks ---- */
            button svg,
            button i,
            button .icon,
            [role="button"] svg,
            [role="button"] i,
            [role="button"] .icon {
                pointer-events: none !important;
            }

            /* ---- 4. Instant visual press (no transform → no hit-area shift) ---- */
            button:active,
            [role="button"]:active,
            .icon-btn:active,
            .btn-primary:active,
            .btn-secondary:active,
            .chip:active,
            .chip-more:active,
            .rp-tab:active,
            .rp-emoji:active,
            .ip-tab:active,
            .ip-emoji:active,
            .reaction-btn:active,
            .msg-tool:active,
            .ctx-action:active,
            .ctx-notes-save:active,
            .confirm-btn:active,
            .delete-option:active,
            .delete-cancel:active {
                filter: brightness(1.25) !important;
                transition: filter 0s !important;
            }

            /* ---- 5. Disabled buttons ignore pointer ---- */
            button:disabled,
            [aria-disabled="true"] {
                pointer-events: none !important;
                opacity: 0.55 !important;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ---- Keyboard activation flash (Enter/Space on focused button) ----
    document.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        const btn = e.target.closest("button, [role='button']");
        if (!btn) return;
        btn.style.filter = "brightness(1.25)";
        setTimeout(function () { btn.style.filter = ""; }, 120);
    }, true);

    // ---- Force pointer-events on dynamically added buttons ----
    if (window.MutationObserver) {
        new MutationObserver(function (mutations) {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    const btns = node.matches?.("button, [role='button']")
                        ? [node]
                        : Array.from(node.querySelectorAll?.("button, [role='button']") || []);
                    btns.forEach(function (b) {
                        if (b.style.pointerEvents === "none") b.style.pointerEvents = "";
                    });
                }
            }
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    console.log("[BtnFeedback] Fast-mode installed");
})();