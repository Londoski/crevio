// ============================================================
// CREVIO — BOT TOOLBAR
// File: dashboard/js/bot-toolbar.js
// User msgs: Copy · Share prompt · Edit
// Bot msgs:  Copy · Rate (2-step: 👍/👎 → optional text) · Share to conversation
// Every rating + feedback is retained for the future
// Crevio Management System (analytics on product quality).
// ============================================================
(function () {
    if (window.__crevioBotToolbarInstalled) return;
    window.__crevioBotToolbarInstalled = true;

    const $ = (id) => document.getElementById(id);

    const CHECK_SVG_15 = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    const CHECK_SVG_20 = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    function toast(msg, isErr) {
        const t = document.getElementById("toast");
        if (!t) return;
        t.textContent = msg;
        t.classList.toggle("error", !!isErr);
        t.classList.add("show");
        clearTimeout(t.__tm);
        t.__tm = setTimeout(function () { t.classList.remove("show"); }, 2600);
    }
    function refreshIcons() {
        if (typeof lucide !== "undefined") { try { lucide.createIcons(); } catch (e) {} }
    }
    function stripBubble(bubble) {
        const clone = bubble.cloneNode(true);
        clone.querySelectorAll(".msg-time, .msg-toolbar, .msg-check, .msg-expand-btn").forEach(el => el.remove());
        return (clone.innerText || clone.textContent || "").trim();
    }
    function getBubbleText(bubble) { return stripBubble(bubble); }
    function getMessageId(bubble) {
        const m = bubble.closest(".message");
        if (m) {
            const v = m.dataset.messageId || m.dataset.id || m.getAttribute("data-msg-id");
            if (v) return v;
        }
        return bubble.getAttribute("data-message-id") || bubble.dataset.messageId || null;
    }
    function hashString(s) {
        let h = 0;
        for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
        return "h" + Math.abs(h).toString(36);
    }
    function getPromptForBubble(bubble) {
        const messageEl = bubble.closest(".message");
        if (!messageEl) return "";
        let prev = messageEl.previousElementSibling;
        while (prev) {
            if (prev.classList && prev.classList.contains("message")) {
                const ub = prev.querySelector(".msg-bubble.user");
                if (ub) return stripBubble(ub);
            }
            prev = prev.previousElementSibling;
        }
        return "";
    }
    function getConversationId(bubble) {
        const m = bubble.closest(".message");
        return (m && m.dataset.conversationId) || null;
    }
    function getUserPlan() {
        try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            return u.plan || "free";
        } catch (e) { return "free"; }
    }
    function authHeaders() {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": token ? "Bearer " + token : ""
        };
    }

    // =========================================================
    // CSS
    // =========================================================
    if (!document.getElementById("__botToolbarStyles")) {
        const style = document.createElement("style");
        style.id = "__botToolbarStyles";
        style.textContent = `
            .msg-toolbar { display:flex; gap:2px; margin-top:4px; align-items:center; }
            .msg-tool {
                background:transparent; border:none; color:var(--text-muted);
                width:30px; height:30px; border-radius:8px; cursor:pointer;
                display:flex; align-items:center; justify-content:center;
                transition:background 0.12s, color 0.12s;
                position:relative; padding:0; touch-action:manipulation;
            }
            .msg-tool:hover { background:var(--accent-dim); color:var(--accent); }
            .msg-tool .icon { width:15px; height:15px; pointer-events:none; }
            .msg-tool .tip {
                position:absolute; bottom:calc(100% + 6px); left:50%;
                transform:translateX(-50%) translateY(4px);
                background:var(--bg-card); color:var(--text-primary);
                border:1px solid var(--border-color); padding:5px 10px;
                border-radius:6px; font-size:12px; white-space:nowrap;
                opacity:0; visibility:hidden; pointer-events:none;
                transition:opacity 0.12s, transform 0.12s, visibility 0.12s;
                z-index:30; box-shadow:0 6px 18px rgba(0,0,0,0.35);
            }
            .msg-tool:hover .tip { opacity:1; visibility:visible; transform:translateX(-50%) translateY(0); }
            @media (hover:none) { .msg-tool .tip { display:none; } }

            .msg-tool.copied { color:var(--accent) !important; background:var(--accent-dim) !important; }
            .msg-tool.copied .tip {
                opacity:1 !important; visibility:visible !important;
                transform:translateX(-50%) translateY(0) !important;
                border-color:var(--accent); color:var(--accent);
            }

            /* ---- Share panel ---- */
            .share-overlay {
                position:fixed; inset:0; background:rgba(0,0,0,0.6);
                backdrop-filter:blur(3px);
                display:flex; align-items:center; justify-content:center;
                padding:20px; z-index:3000;
                opacity:0; visibility:hidden;
                transition:opacity 0.15s, visibility 0.15s;
            }
            .share-overlay.open { opacity:1; visibility:visible; }
            .share-panel {
                background:var(--bg-card); border:1px solid var(--border-color);
                border-radius:16px; width:100%;
                max-width:min(420px, 94vw); max-height:90vh;
                padding:20px; box-shadow:0 24px 60px rgba(0,0,0,0.6);
                display:flex; flex-direction:column; gap:16px;
            }
            .share-panel h2 {
                font-size:18px; font-weight:700; color:var(--text-primary);
                margin:0; display:flex; align-items:center; justify-content:space-between;
            }
            .share-close {
                background:transparent; border:none; cursor:pointer;
                color:var(--text-muted); width:30px; height:30px;
                border-radius:8px; display:flex; align-items:center; justify-content:center;
            }
            .share-close:hover { background:var(--bg-input); color:var(--danger); }
            .share-close .icon { width:16px; height:16px; }

            .share-preview {
                background:linear-gradient(135deg, #1a4d2e 0%, #2d7a4f 100%);
                border-radius:12px; padding:16px;
                min-height:140px; max-height:200px; overflow-y:auto;
                font-size:13px; color:#fff; line-height:1.5; position:relative;
            }
            .share-preview-text { white-space:pre-wrap; word-break:break-word; }
            .share-preview-brand {
                position:absolute; bottom:8px; right:12px;
                font-size:12px; font-weight:700;
                color:rgba(255,255,255,0.85); letter-spacing:-0.02em;
            }
            .share-actions { display:flex; justify-content:space-around; gap:8px; flex-wrap:wrap; }
            .share-action {
                background:transparent; border:none; cursor:pointer;
                display:flex; flex-direction:column; align-items:center;
                gap:6px; color:var(--text-secondary); font-size:11px;
                font-family:inherit; padding:6px; border-radius:8px;
                transition:color 0.12s; touch-action:manipulation;
            }
            .share-action:hover { color:var(--text-primary); }
            .share-action-icon {
                width:46px; height:46px; border-radius:50%;
                background:var(--accent); color:#fff;
                display:flex; align-items:center; justify-content:center;
                transition:transform 0.12s, background 0.12s;
            }
            .share-action:hover .share-action-icon { transform:scale(1.08); background:var(--accent-hover); }
            .share-action-icon .icon { width:20px; height:20px; }
            .share-action.copied .share-action-icon { background:var(--accent-hover); transform:scale(1.08); }
            .share-action.copied .share-label { color:var(--accent); font-weight:600; }
            .share-footer { font-size:11px; color:var(--text-muted); text-align:center; line-height:1.5; }
            .share-footer a { color:var(--accent); text-decoration:none; }

            /* ---- Rate popover (2-step) ---- */
            .rate-popover {
                position:fixed;
                background:var(--bg-card);
                border:1px solid var(--border-color);
                border-radius:12px;
                box-shadow:0 16px 40px rgba(0,0,0,0.5);
                z-index:3100;
                opacity:0; visibility:hidden;
                transform:translateY(4px);
                transition:opacity 0.15s, transform 0.15s, visibility 0.15s;
                padding:4px;
                display:flex; gap:2px;
                min-width:200px;
            }
            .rate-popover.open { opacity:1; visibility:visible; transform:translateY(0); }
            .rate-popover.step-2 {
                flex-direction:column; gap:8px; padding:12px;
                min-width:260px; max-width:300px;
            }
            .rate-popover .rate-buttons { display:flex; gap:2px; }
            .rate-popover.step-2 .rate-buttons { justify-content:center; }
            .rate-popover button.rate-btn {
                background:transparent; border:none;
                color:var(--text-secondary);
                width:34px; height:34px; border-radius:8px; cursor:pointer;
                display:flex; align-items:center; justify-content:center;
                transition:background 0.12s, color 0.12s;
            }
            .rate-popover button.rate-btn:hover { background:var(--accent-dim); color:var(--accent); }
            .rate-popover button.rate-btn.selected { background:var(--accent-dim); color:var(--accent); }
            .rate-popover button.rate-btn.selected.bad { background:rgba(239,68,68,0.12); color:var(--danger); }
            .rate-popover .icon { width:16px; height:16px; }

            .rate-popover .fb-title {
                font-size:13px; font-weight:600;
                color:var(--text-primary); text-align:center;
                line-height:1.3;
            }
            .rate-popover .fb-sub {
                font-size:11px; color:var(--text-muted);
                text-align:center; margin-top:0;
                line-height:1.35;
            }
            .rate-popover textarea {
                background:var(--bg-input);
                border:1px solid var(--border-color);
                color:var(--text-primary);
                padding:8px 10px; border-radius:8px;
                font-size:13px; font-family:inherit;
                resize:none; min-height:52px; max-height:96px;
                width:100%;
            }
            .rate-popover textarea:focus {
                outline:none; border-color:var(--accent);
                box-shadow:0 0 0 3px var(--accent-dim);
            }
            .rate-popover .fb-actions {
                display:flex; gap:6px; justify-content:flex-end;
            }
            .rate-popover .fb-btn {
                font-size:12px; font-weight:600; font-family:inherit;
                padding:7px 14px; border-radius:8px;
                cursor:pointer; border:none;
                transition:background 0.12s, opacity 0.12s, color 0.12s;
            }
            .rate-popover .fb-btn.skip {
                background:transparent; color:var(--text-secondary);
            }
            .rate-popover .fb-btn.skip:hover { background:var(--bg-input); color:var(--text-primary); }
            .rate-popover .fb-btn.submit {
                background:var(--accent); color:#fff;
            }
            .rate-popover .fb-btn.submit:hover:not(:disabled) { background:var(--accent-hover); }
            .rate-popover .fb-btn.submit:disabled { opacity:0.5; cursor:not-allowed; }

            /* ---- Conversation picker ---- */
            .conv-picker-overlay {
                position:fixed; inset:0;
                background:rgba(0,0,0,0.6);
                backdrop-filter:blur(3px);
                display:flex; align-items:center; justify-content:center;
                padding:20px; z-index:3050;
                opacity:0; visibility:hidden;
                transition:opacity 0.15s, visibility 0.15s;
            }
            .conv-picker-overlay.open { opacity:1; visibility:visible; }
            .conv-picker {
                background:var(--bg-card);
                border:1px solid var(--border-color);
                border-radius:16px;
                width:100%; max-width:min(440px, 94vw); max-height:80vh;
                padding:20px; display:flex; flex-direction:column; gap:12px;
                box-shadow:0 24px 60px rgba(0,0,0,0.6);
            }
            .conv-picker h2 {
                font-size:17px; font-weight:700;
                color:var(--text-primary); margin:0;
                display:flex; align-items:center; justify-content:space-between;
            }
            .conv-picker-close {
                background:transparent; border:none; cursor:pointer;
                color:var(--text-muted);
                width:30px; height:30px; border-radius:8px;
                display:flex; align-items:center; justify-content:center;
            }
            .conv-picker-close:hover { background:var(--bg-input); color:var(--danger); }
            .conv-picker-close .icon { width:16px; height:16px; }
            .conv-picker-search {
                background:var(--bg-input);
                border:1px solid var(--border-color);
                color:var(--text-primary);
                padding:10px 14px; border-radius:10px;
                font-size:14px; font-family:inherit;
            }
            .conv-picker-search:focus {
                outline:none; border-color:var(--accent);
                box-shadow:0 0 0 3px var(--accent-dim);
            }
            .conv-picker-list {
                flex:1; overflow-y:auto;
                display:flex; flex-direction:column; gap:4px;
                min-height:120px; max-height:400px;
            }
            .conv-picker-item {
                display:flex; align-items:center; gap:12px;
                padding:10px 12px; border-radius:10px;
                border:none; background:transparent;
                color:var(--text-primary); font-family:inherit;
                cursor:pointer; text-align:left;
                transition:background 0.12s; width:100%;
            }
            .conv-picker-item:hover { background:var(--accent-dim); }
            .conv-picker-avatar {
                width:36px; height:36px; border-radius:50%;
                background:var(--accent); color:#fff;
                display:flex; align-items:center; justify-content:center;
                font-weight:600; font-size:14px; flex-shrink:0;
            }
            .conv-picker-text { display:flex; flex-direction:column; min-width:0; flex:1; }
            .conv-picker-name { font-size:14px; font-weight:600; }
            .conv-picker-preview {
                font-size:12px; color:var(--text-muted);
                overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
            }

            @media (max-width:480px) {
                .share-panel { padding:16px; }
                .share-action-icon { width:40px; height:40px; }
                .share-action { font-size:10px; }
                .rate-popover.step-2 { min-width:240px; max-width:calc(100vw - 32px); }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================
    // TOOLBAR
    // =========================================================
    function buildToolbar(role) {
        const wrap = document.createElement("div");
        wrap.className = "msg-toolbar";
        if (role === "user") {
            wrap.innerHTML = `
                <button class="msg-tool" data-act="copy-user" type="button" aria-label="Copy message">
                    <i data-lucide="copy" class="icon"></i><span class="tip">Copy message</span>
                </button>
                <button class="msg-tool" data-act="share-prompt" type="button" aria-label="Share prompt">
                    <i data-lucide="share" class="icon"></i><span class="tip">Share prompt</span>
                </button>
                <button class="msg-tool" data-act="edit-message" type="button" aria-label="Edit message">
                    <i data-lucide="pencil" class="icon"></i><span class="tip">Edit message</span>
                </button>`;
        } else {
            wrap.innerHTML = `
                <button class="msg-tool" data-act="copy-bot" type="button" aria-label="Copy response">
                    <i data-lucide="copy" class="icon"></i><span class="tip">Copy response</span>
                </button>
                <button class="msg-tool" data-act="rate" type="button" aria-label="Rate response">
                    <i data-lucide="thumbs-up" class="icon"></i><span class="tip">Rate response</span>
                </button>
                <button class="msg-tool" data-act="share-conv" type="button" aria-label="Share to conversation">
                    <i data-lucide="share-2" class="icon"></i><span class="tip">Share to conversation</span>
                </button>`;
        }
        return wrap;
    }

    // =========================================================
    // CLIPBOARD + TICK
    // =========================================================
    async function copyToClipboard(text) {
        try { await navigator.clipboard.writeText(text); return true; }
        catch (e) {
            const ta = document.createElement("textarea");
            ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
            document.body.appendChild(ta); ta.select();
            let ok = false;
            try { ok = document.execCommand("copy"); } catch {}
            document.body.removeChild(ta);
            return ok;
        }
    }
    function showTick(btn) {
        const icon = btn.querySelector(".icon");
        if (!icon) return;
        if (!btn.__origIconHTML) btn.__origIconHTML = icon.outerHTML;
        const tip = btn.querySelector(".tip");
        if (tip && !btn.__origTip) btn.__origTip = tip.textContent;
        clearTimeout(btn.__tickTimer);
        icon.outerHTML = CHECK_SVG_15;
        if (tip) tip.textContent = "Copied";
        btn.classList.add("copied");
        btn.__tickTimer = setTimeout(function () {
            const current = btn.querySelector(".icon");
            if (current) current.outerHTML = btn.__origIconHTML;
            const t2 = btn.querySelector(".tip");
            if (t2 && btn.__origTip) t2.textContent = btn.__origTip;
            btn.classList.remove("copied");
        }, 1500);
    }
    async function copyText(text, btn) {
        const ok = await copyToClipboard(text);
        if (ok) { showTick(btn); toast("Copied to clipboard"); }
        else { toast("Copy failed", true); }
    }

    // =========================================================
    // EDIT
    // =========================================================
    function editUserMessage(bubble) {
        const text = getBubbleText(bubble);
        const input = $("msgInput");
        if (!input) { toast("Input not found", true); return; }
        const messageEl = bubble.closest(".message");
        if (!messageEl) return;
        let nextEl = messageEl.nextElementSibling;
        while (nextEl && !nextEl.classList.contains("message")) nextEl = nextEl.nextElementSibling;
        const deleteBot = nextEl && nextEl.querySelector(".msg-bubble.bot");
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
        messageEl.remove();
        if (deleteBot) nextEl.remove();
        toast("Editing message — press Enter to resend");
    }

    // =========================================================
    // SHARE PANEL
    // =========================================================
    function ensureSharePanel() {
        let overlay = document.getElementById("shareOverlay");
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = "shareOverlay";
        overlay.className = "share-overlay";
        overlay.innerHTML = `
            <div class="share-panel" role="dialog" aria-label="Share prompt">
                <h2>Share prompt
                    <button class="share-close" data-close-share type="button" aria-label="Close">
                        <i data-lucide="x" class="icon"></i>
                    </button>
                </h2>
                <div class="share-preview">
                    <div class="share-preview-text" data-preview-text></div>
                    <div class="share-preview-brand">Crevio</div>
                </div>
                <div class="share-actions">
                    <button class="share-action" data-share="copy-link" type="button">
                        <span class="share-action-icon"><i data-lucide="link" class="icon"></i></span>
                        <span class="share-label">Copy link</span>
                    </button>
                    <button class="share-action" data-share="x" type="button">
                        <span class="share-action-icon"><i data-lucide="twitter" class="icon"></i></span>
                        <span class="share-label">X</span>
                    </button>
                    <button class="share-action" data-share="linkedin" type="button">
                        <span class="share-action-icon"><i data-lucide="linkedin" class="icon"></i></span>
                        <span class="share-label">LinkedIn</span>
                    </button>
                    <button class="share-action" data-share="reddit" type="button">
                        <span class="share-action-icon"><i data-lucide="message-circle" class="icon"></i></span>
                        <span class="share-label">Reddit</span>
                    </button>
                </div>
                <div class="share-footer">
                    Memory sources won't be shared with viewers. <a href="/dashboard/pages/settings.html">Learn more</a>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.remove("open"); });
        overlay.querySelector("[data-close-share]").addEventListener("click", () => overlay.classList.remove("open"));
        document.addEventListener("keydown", e => { if (e.key === "Escape") overlay.classList.remove("open"); });
        refreshIcons();
        return overlay;
    }
    function showShareTick(btn) {
        const iconWrap = btn.querySelector(".share-action-icon");
        const icon = iconWrap ? iconWrap.querySelector(".icon") : null;
        const label = btn.querySelector(".share-label");
        if (!icon) return;
        if (!btn.__origIconHTML) btn.__origIconHTML = icon.outerHTML;
        if (label && !btn.__origLabel) btn.__origLabel = label.textContent;
        clearTimeout(btn.__tickTimer);
        icon.outerHTML = CHECK_SVG_20;
        if (label) label.textContent = "Copied";
        btn.classList.add("copied");
        btn.__tickTimer = setTimeout(function () {
            const current = btn.querySelector(".share-action-icon .icon");
            if (current) current.outerHTML = btn.__origIconHTML;
            if (label && btn.__origLabel) label.textContent = btn.__origLabel;
            btn.classList.remove("copied");
        }, 1600);
    }
    function openSharePanel(text) {
        const overlay = ensureSharePanel();
        overlay.querySelector("[data-preview-text]").textContent = text;
        overlay.classList.add("open");
        overlay.querySelectorAll("[data-share]").forEach(function (btn) {
            const fresh = btn.cloneNode(true);
            btn.parentNode.replaceChild(fresh, btn);
            fresh.addEventListener("click", async function () {
                const action = fresh.dataset.share;
                const shareText = text.slice(0, 280);
                const pageUrl = window.location.href;
                if (action === "copy-link") {
                    const ok = await copyToClipboard(pageUrl);
                    if (ok) {
                        showShareTick(fresh);
                        toast("Link copied");
                        setTimeout(() => overlay.classList.remove("open"), 1000);
                    } else toast("Copy failed", true);
                } else if (action === "x") {
                    window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText), "_blank");
                } else if (action === "linkedin") {
                    window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(pageUrl), "_blank");
                } else if (action === "reddit") {
                    window.open("https://www.reddit.com/submit?url=" + encodeURIComponent(pageUrl) + "&title=" + encodeURIComponent(shareText), "_blank");
                }
            });
        });
        refreshIcons();
    }

    // =========================================================
    // RATE POPOVER — 2-STEP with optional text feedback
    // Everything retained for the future Crevio Management System.
    // =========================================================
    function ensureRatePopover() {
        let pop = document.getElementById("ratePopover");
        if (pop) return pop;
        pop = document.createElement("div");
        pop.id = "ratePopover";
        pop.className = "rate-popover";
        pop.innerHTML = `
            <div class="rate-buttons">
                <button class="rate-btn" data-rate="good" type="button" title="Good response">
                    <i data-lucide="thumbs-up" class="icon"></i>
                </button>
                <button class="rate-btn" data-rate="bad" type="button" title="Bad response">
                    <i data-lucide="thumbs-down" class="icon"></i>
                </button>
            </div>
            <div class="rate-feedback" style="display:none;">
                <div class="fb-title">Thanks for the feedback</div>
                <div class="fb-sub">Want to tell us more? (optional)</div>
                <textarea class="fb-text" maxlength="2000"
                    placeholder="What went well or what could be better..."></textarea>
                <div class="fb-actions">
                    <button class="fb-btn skip" type="button">Skip</button>
                    <button class="fb-btn submit" type="button" disabled>Submit</button>
                </div>
            </div>
        `;
        document.body.appendChild(pop);
        refreshIcons();
        return pop;
    }

    let _rateContext = null;

    function closeRatePopoverOnce(e) {
        const pop = document.getElementById("ratePopover");
        if (!pop || !pop.classList.contains("open")) return;
        if (pop.contains(e.target)) return;
        resetRatePopover();
        document.removeEventListener("click", closeRatePopoverOnce);
    }

    function resetRatePopover() {
        const pop = document.getElementById("ratePopover");
        if (!pop) return;
        pop.classList.remove("open", "step-2");
        const fb = pop.querySelector(".rate-feedback");
        if (fb) fb.style.display = "none";
        const ta = pop.querySelector(".fb-text");
        if (ta) ta.value = "";
        const sub = pop.querySelector(".fb-btn.submit");
        if (sub) { sub.disabled = true; sub.textContent = "Submit"; }
        pop.querySelectorAll(".rate-btn").forEach(b => b.classList.remove("selected", "bad"));
        _rateContext = null;
    }

    async function saveRating(rating, feedbackText) {
        if (!_rateContext) return { success: false };
        const body = {
            rating: rating,
            message: _rateContext.text,
            message_id: _rateContext.msgId,
            prompt: _rateContext.prompt || "",
            conversation_id: _rateContext.convId || null,
            user_plan: _rateContext.plan || "free"
        };
        if (feedbackText != null && feedbackText !== "") body.feedback_text = feedbackText;
        try {
            const res = await fetch("/api/bot/rate", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) { return { success: false }; }
    }

    function positionRatePopover(pop, btn) {
        const rect = btn.getBoundingClientRect();
        const width = 300;
        let left = rect.left;
        if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
        if (left < 12) left = 12;
        pop.style.left = left + "px";

        pop.classList.add("open");

        const popRect = pop.getBoundingClientRect();
        const popHeight = popRect.height || 260;

        const spaceBelow = window.innerHeight - rect.bottom - 12;
        const spaceAbove = rect.top - 12;

        let top;
        if (spaceBelow >= popHeight + 8 || spaceBelow >= spaceAbove) {
            top = rect.bottom + 8;
        } else {
            top = rect.top - popHeight - 8;
            if (top < 12) top = 12;
        }
        pop.style.top = top + "px";
    }

    function showRatePopover(bubble, btn) {
        const pop = ensureRatePopover();
        resetRatePopover();
        positionRatePopover(pop, btn);

        const text = getBubbleText(bubble);
        const msgId = getMessageId(bubble) || hashString(text);
        const prompt = getPromptForBubble(bubble);
        const convId = getConversationId(bubble);
        const plan = getUserPlan();

        _rateContext = { bubble, btn, text, msgId, prompt, convId, plan, rating: null };

        // Step-1: 👍 / 👎
        pop.querySelectorAll(".rate-btn").forEach(function (b) {
            const fresh = b.cloneNode(true);
            b.parentNode.replaceChild(fresh, b);
            fresh.addEventListener("click", async function (e) {
                e.stopPropagation();
                const rating = fresh.dataset.rate;
                _rateContext.rating = rating;

                pop.querySelectorAll(".rate-btn").forEach(x => x.classList.remove("selected", "bad"));
                fresh.classList.add("selected");
                if (rating === "bad") fresh.classList.add("bad");

                btn.style.color = rating === "good" ? "var(--accent)" : "var(--danger)";

                const result = await saveRating(rating, "");
                if (result.success) {
                    toast(rating === "good" ? "Thanks for the feedback" : "Noted — we'll improve");
                } else {
                    toast(result.message || "Failed to save rating", true);
                }

                // Expand to step-2
                pop.classList.add("step-2");
                const fb = pop.querySelector(".rate-feedback");
                if (fb) fb.style.display = "block";
                const ta = pop.querySelector(".fb-text");
                if (ta) {
                    ta.placeholder = rating === "good"
                        ? "What did the bot do well?"
                        : "What could be improved?";
                    setTimeout(() => ta.focus(), 50);
                }

                // Re-measure and reposition after expansion
                setTimeout(() => positionRatePopover(pop, btn), 0);
            });
        });

        // Wire textarea input → toggle Submit enabled
        // IMPORTANT: wire AFTER cloning submit so we touch the live element.
        // Clone submit + skip first.
        let liveSubmit = pop.querySelector(".fb-btn.submit");
        let liveSkip = pop.querySelector(".fb-btn.skip");
        const cloneSub = liveSubmit.cloneNode(true);
        liveSubmit.parentNode.replaceChild(cloneSub, liveSubmit);
        liveSubmit = cloneSub;

        const cloneSkip = liveSkip.cloneNode(true);
        liveSkip.parentNode.replaceChild(cloneSkip, liveSkip);
        liveSkip = cloneSkip;

        const ta = pop.querySelector(".fb-text");

        // Now wire the input listener to the LIVE submit button
        if (ta && liveSubmit) {
            ta.addEventListener("input", function () {
                liveSubmit.disabled = ta.value.trim().length === 0;
            });
        }

        // Submit feedback
        liveSubmit.addEventListener("click", async function (e) {
            e.stopPropagation();
            const fbText = (ta && ta.value || "").trim();
            if (!fbText || !_rateContext) return;
            liveSubmit.disabled = true;
            liveSubmit.textContent = "Sending…";
            const result = await saveRating(_rateContext.rating, fbText);
            if (result.success) toast("Feedback received — thank you");
            else toast("Couldn't save feedback", true);
            resetRatePopover();
        });

        // Skip
        liveSkip.addEventListener("click", function (e) {
            e.stopPropagation();
            resetRatePopover();
        });

        setTimeout(() => {
            document.addEventListener("click", closeRatePopoverOnce);
        }, 0);
    }

    function rateBubble(bubble, btn) { showRatePopover(bubble, btn); }

    // =========================================================
    // CONVERSATION PICKER
    // =========================================================
    function ensureConvPicker() {
        let ov = document.getElementById("convPickerOverlay");
        if (ov) return ov;
        ov = document.createElement("div");
        ov.id = "convPickerOverlay";
        ov.className = "conv-picker-overlay";
        ov.innerHTML = `
            <div class="conv-picker">
                <h2>Share to conversation
                    <button class="conv-picker-close" type="button" aria-label="Close">
                        <i data-lucide="x" class="icon"></i>
                    </button>
                </h2>
                <input type="text" class="conv-picker-search" placeholder="Search conversations...">
                <div class="conv-picker-list">
                    <div class="loading">Loading conversations…</div>
                </div>
            </div>`;
        document.body.appendChild(ov);
        ov.addEventListener("click", e => { if (e.target === ov) ov.classList.remove("open"); });
        ov.querySelector(".conv-picker-close").addEventListener("click", () => ov.classList.remove("open"));
        document.addEventListener("keydown", e => { if (e.key === "Escape") ov.classList.remove("open"); });
        refreshIcons();
        return ov;
    }

    async function openConvPicker(text) {
        const ov = ensureConvPicker();
        const listEl = ov.querySelector(".conv-picker-list");
        const searchEl = ov.querySelector(".conv-picker-search");
        ov.classList.add("open");
        searchEl.value = "";

        async function loadList(query) {
            listEl.innerHTML = '<div class="loading">Loading conversations…</div>';
            try {
                const url = "/api/messages/conversations?filter=all&search=" + encodeURIComponent(query || "");
                const res = await fetch(url, { headers: authHeaders() });
                const data = await res.json();
                const convs = (data.conversations || []).slice(0, 40);
                if (!convs.length) {
                    listEl.innerHTML = '<div class="empty-state"><p>No conversations found.</p></div>';
                    return;
                }
                listEl.innerHTML = convs.map(function (c) {
                    const name = (c.client_name || "Client");
                    const initial = name.charAt(0).toUpperCase();
                    const preview = (c.last_message || "No messages yet").slice(0, 50);
                    return '<button class="conv-picker-item" data-id="' + c.id + '" type="button">' +
                        '<span class="conv-picker-avatar">' + initial + '</span>' +
                        '<span class="conv-picker-text">' +
                            '<span class="conv-picker-name">' + name + '</span>' +
                            '<span class="conv-picker-preview">' + preview + '</span>' +
                        '</span>' +
                    '</button>';
                }).join("");

                listEl.querySelectorAll(".conv-picker-item").forEach(function (item) {
                    item.addEventListener("click", async function () {
                        const cid = item.dataset.id;
                        try {
                            const r = await fetch("/api/bot/share", {
                                method: "POST",
                                headers: authHeaders(),
                                body: JSON.stringify({ conversation_id: cid, content: text })
                            });
                            const rdata = await r.json();
                            if (rdata.success) {
                                toast("Shared to conversation");
                                ov.classList.remove("open");
                            } else {
                                toast(rdata.message || "Failed to share", true);
                            }
                        } catch (e) { toast("Failed to share", true); }
                    });
                });
            } catch (e) {
                listEl.innerHTML = '<div class="empty-state"><p>Could not load conversations.</p></div>';
            }
        }

        loadList("");
        searchEl.oninput = function () {
            clearTimeout(searchEl.__t);
            const q = searchEl.value;
            searchEl.__t = setTimeout(() => loadList(q), 250);
        };
    }

    // =========================================================
    // INJECT
    // =========================================================
    function injectInto(bubble) {
        if (bubble.dataset.toolbarInjected === "1") return;
        const isBot = bubble.classList.contains("bot");
        const isUser = bubble.classList.contains("user") || !isBot;
        if (!isBot && !isUser) return;
        const messageEl = bubble.closest(".message");
        if (!messageEl) return;
        bubble.dataset.toolbarInjected = "1";
        const toolbar = buildToolbar(isBot ? "bot" : "user");
        messageEl.appendChild(toolbar);
        refreshIcons();
        toolbar.querySelectorAll(".msg-tool").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                const act = btn.dataset.act;
                const text = getBubbleText(bubble);
                if (act === "copy-user" || act === "copy-bot") copyText(text, btn);
                else if (act === "share-prompt") openSharePanel(text);
                else if (act === "share-conv") openConvPicker(text);
                else if (act === "edit-message") editUserMessage(bubble);
                else if (act === "rate") rateBubble(bubble, btn);
            });
        });
    }

    function scan() {
        document.querySelectorAll(".msg-bubble.bot, .msg-bubble.user").forEach(injectInto);
        document.querySelectorAll(".msg-bubble").forEach(function (b) {
            if (!b.classList.contains("bot") && !b.dataset.toolbarInjected) injectInto(b);
        });
    }

    const container = document.getElementById("messages") || document.body;
    if (window.MutationObserver) {
        let t;
        new MutationObserver(function () {
            clearTimeout(t);
            t = setTimeout(scan, 220);
        }).observe(container, { childList: true, subtree: true, characterData: true });
    }
    window.addEventListener("load", () => setTimeout(scan, 400));
    if (document.readyState === "complete") setTimeout(scan, 200);
    else document.addEventListener("DOMContentLoaded", () => setTimeout(scan, 200));

    console.log("[BotToolbar] installed");
})();