// ============================================================
// CREVIO — BOT TOOLBAR
// File: dashboard/js/bot-toolbar.js
// Copy briefly shows a green tick, then returns to copy icon.
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
    function getBubbleText(bubble) {
        const clone = bubble.cloneNode(true);
        clone.querySelectorAll(".msg-time, .msg-toolbar, .msg-check, .msg-expand-btn").forEach(function (el) { el.remove(); });
        return (clone.innerText || clone.textContent || "").trim();
    }

    if (!document.getElementById("__botToolbarStyles")) {
        const style = document.createElement("style");
        style.id = "__botToolbarStyles";
        style.textContent = `
            .msg-toolbar { display: flex; gap: 2px; margin-top: 4px; align-items: center; }
            .msg-tool {
                background: transparent; border: none; color: var(--text-muted);
                width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background 0.12s, color 0.12s;
                position: relative; padding: 0; touch-action: manipulation;
            }
            .msg-tool:hover { background: var(--accent-dim); color: var(--accent); }
            .msg-tool .icon { width: 15px; height: 15px; pointer-events: none; }
            .msg-tool .tip {
                position: absolute; bottom: calc(100% + 6px); left: 50%;
                transform: translateX(-50%) translateY(4px);
                background: var(--bg-card); color: var(--text-primary);
                border: 1px solid var(--border-color); padding: 5px 10px;
                border-radius: 6px; font-size: 12px; white-space: nowrap;
                opacity: 0; visibility: hidden; pointer-events: none;
                transition: opacity 0.12s, transform 0.12s, visibility 0.12s;
                z-index: 30; box-shadow: 0 6px 18px rgba(0,0,0,0.35);
            }
            .msg-tool:hover .tip { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
            @media (hover: none) { .msg-tool .tip { display: none; } }

            .msg-tool.copied { color: var(--accent) !important; background: var(--accent-dim) !important; }
            .msg-tool.copied .tip {
                opacity: 1 !important; visibility: visible !important;
                transform: translateX(-50%) translateY(0) !important;
                border-color: var(--accent); color: var(--accent);
            }

            .share-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                backdrop-filter: blur(3px);
                display: flex; align-items: center; justify-content: center;
                padding: 20px; z-index: 3000;
                opacity: 0; visibility: hidden;
                transition: opacity 0.15s, visibility 0.15s;
            }
            .share-overlay.open { opacity: 1; visibility: visible; }
            .share-panel {
                background: var(--bg-card); border: 1px solid var(--border-color);
                border-radius: 16px; width: 100%;
                max-width: min(420px, 94vw); max-height: 90vh;
                padding: 20px; box-shadow: 0 24px 60px rgba(0,0,0,0.6);
                display: flex; flex-direction: column; gap: 16px;
            }
            .share-panel h2 {
                font-size: 18px; font-weight: 700; color: var(--text-primary);
                margin: 0; display: flex; align-items: center; justify-content: space-between;
            }
            .share-close {
                background: transparent; border: none; cursor: pointer;
                color: var(--text-muted); width: 30px; height: 30px;
                border-radius: 8px; display: flex; align-items: center; justify-content: center;
            }
            .share-close:hover { background: var(--bg-input); color: var(--danger); }
            .share-close .icon { width: 16px; height: 16px; }

            .share-preview {
                background: linear-gradient(135deg, #1a4d2e 0%, #2d7a4f 100%);
                border-radius: 12px; padding: 16px;
                min-height: 140px; max-height: 200px; overflow-y: auto;
                font-size: 13px; color: #fff; line-height: 1.5; position: relative;
            }
            .share-preview-text { white-space: pre-wrap; word-break: break-word; }
            .share-preview-brand {
                position: absolute; bottom: 8px; right: 12px;
                font-size: 12px; font-weight: 700;
                color: rgba(255,255,255,0.85); letter-spacing: -0.02em;
            }
            .share-actions { display: flex; justify-content: space-around; gap: 8px; flex-wrap: wrap; }
            .share-action {
                background: transparent; border: none; cursor: pointer;
                display: flex; flex-direction: column; align-items: center;
                gap: 6px; color: var(--text-secondary); font-size: 11px;
                font-family: inherit; padding: 6px; border-radius: 8px;
                transition: color 0.12s; touch-action: manipulation;
            }
            .share-action:hover { color: var(--text-primary); }
            .share-action-icon {
                width: 46px; height: 46px; border-radius: 50%;
                background: var(--accent); color: #fff;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.12s, background 0.12s;
            }
            .share-action:hover .share-action-icon { transform: scale(1.08); background: var(--accent-hover); }
            .share-action-icon .icon { width: 20px; height: 20px; }
            .share-action.copied .share-action-icon { background: var(--accent-hover); transform: scale(1.08); }
            .share-action.copied .share-label { color: var(--accent); font-weight: 600; }

            .share-footer { font-size: 11px; color: var(--text-muted); text-align: center; line-height: 1.5; }
            .share-footer a { color: var(--accent); text-decoration: none; }
            .share-footer a:hover { text-decoration: underline; }

            @media (max-width: 480px) {
                .share-panel { padding: 16px; }
                .share-action-icon { width: 40px; height: 40px; }
                .share-action { font-size: 10px; }
            }
        `;
        document.head.appendChild(style);
    }

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
        overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.classList.remove("open"); });
        overlay.querySelector("[data-close-share]").addEventListener("click", function () { overlay.classList.remove("open"); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape") overlay.classList.remove("open"); });
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
                        setTimeout(function () { overlay.classList.remove("open"); }, 1000);
                    } else { toast("Copy failed", true); }
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

    function rateBubble(bubble, btn) {
        const next = bubble.dataset.rated === "good" ? "bad" : "good";
        bubble.dataset.rated = next;
        if (next === "good") { btn.style.color = "var(--success)"; toast("Thanks for the feedback"); }
        else { btn.style.color = "var(--danger)"; toast("Noted — we'll improve"); }
        setTimeout(function () { btn.style.color = ""; }, 800);
    }

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
                else if (act === "share-prompt" || act === "share-conv") openSharePanel(text);
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
    window.addEventListener("load", function () { setTimeout(scan, 400); });
    if (document.readyState === "complete") setTimeout(scan, 200);
    else document.addEventListener("DOMContentLoaded", function () { setTimeout(scan, 200); });
    console.log("[BotToolbar] installed");
})();