// ============================================================
// CREVIO — MESSAGES REACTIONS
// File: dashboard/js/messages-reactions.js
// Adds emoji reactions to messages on the Messages page.
// Uses HTML entities (not raw UTF-8) so encoding can't corrupt them.
// Isolated from messages.js — safe to remove without breaking the page.
// ============================================================
(function () {
    if (window.__crevioReactionsInstalled) return;
    window.__crevioReactionsInstalled = true;

    // HTML entities — matches the messages.js convention
    const REACTIONS = [
        "&#x1F44D;",           // 👍
        "&#x2764;&#xFE0F;",    // ❤️
        "&#x1F602;",           // 😂
        "&#x1F62E;",           // 😮
        "&#x1F622;",           // 😢
        "&#x1F64F;"            // 🙏
    ];

    function authHeaders() {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": token ? "Bearer " + token : ""
        };
    }
    function decodeEntities(s) {
        const el = document.createElement("textarea");
        el.innerHTML = s;
        return el.value;
    }
    function toast(msg, isErr) {
        const t = document.getElementById("toast");
        if (!t) return;
        t.textContent = msg;
        t.classList.toggle("error", !!isErr);
        t.classList.add("show");
        clearTimeout(t.__tm);
        t.__tm = setTimeout(() => t.classList.remove("show"), 2400);
    }
    function getMyUserId() {
        try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            return u.id || null;
        } catch (e) { return null; }
    }

    // ---------- CSS ----------
    if (!document.getElementById("__msgReactionsStyles")) {
        const style = document.createElement("style");
        style.id = "__msgReactionsStyles";
        style.textContent = `
            .msg-reactions { display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; }
            .msg.incoming .msg-reactions { justify-content:flex-start; }
            .msg.outgoing .msg-reactions { justify-content:flex-end; }

            .reaction-pill {
                display:inline-flex; align-items:center; gap:4px;
                background:var(--bg-card);
                border:1px solid var(--border-color);
                padding:2px 8px; border-radius:999px;
                font-size:13px; line-height:1.2;
                cursor:pointer;
                transition:background 0.12s, border-color 0.12s;
                user-select:none;
            }
            .reaction-pill:hover { border-color:var(--accent); }
            .reaction-pill.mine {
                background:var(--accent-dim);
                border-color:var(--accent);
            }
            .reaction-pill .count {
                font-size:11px; font-weight:600;
                color:var(--text-secondary);
            }
            .reaction-pill.mine .count { color:var(--accent); }

            .react-trigger {
                position:absolute;
                top:-8px;
                opacity:0;
                pointer-events:none;
                width:26px; height:26px;
                border-radius:50%;
                background:var(--bg-card);
                border:1px solid var(--border-color);
                color:var(--text-secondary);
                display:flex; align-items:center; justify-content:center;
                cursor:pointer;
                transition:opacity 0.12s, background 0.12s, color 0.12s;
                z-index:5;
                padding:0;
                touch-action:manipulation;
            }
            .msg:hover .react-trigger,
            .msg:focus-within .react-trigger { opacity:1; pointer-events:auto; }
            .react-trigger:hover { background:var(--accent-dim); color:var(--accent); border-color:var(--accent); }
            .react-trigger .icon { width:14px; height:14px; }

            .msg.incoming .react-trigger { right:-10px; }
            .msg.outgoing .react-trigger { left:-10px; }

            .react-popover {
                position:fixed;
                background:var(--bg-card);
                border:1px solid var(--border-color);
                border-radius:999px;
                padding:4px 6px;
                display:flex; gap:2px;
                box-shadow:0 8px 24px rgba(0,0,0,0.4);
                z-index:3200;
                opacity:0; visibility:hidden;
                transform:translateY(4px);
                transition:opacity 0.12s, transform 0.12s, visibility 0.12s;
            }
            .react-popover.open { opacity:1; visibility:visible; transform:translateY(0); }
            .react-popover button {
                background:transparent; border:none; cursor:pointer;
                width:32px; height:32px; border-radius:50%;
                font-size:18px; line-height:1;
                display:flex; align-items:center; justify-content:center;
                transition:background 0.12s, transform 0.12s;
                touch-action:manipulation;
            }
            .react-popover button:hover { background:var(--accent-dim); transform:scale(1.15); }

            @media (hover:none) {
                .react-trigger { opacity:1; pointer-events:auto; top:-12px; }
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- Parse reactions from a message ----------
    // Backend may return:
    //   - null
    //   - JSON string:  '{"👍":[1,2],"❤️":[3]}'
    //   - object:       { "👍": [1,2], "❤️": [3] }
    //   - array:        [{emoji,users}]
    function normalizeReactions(raw) {
        if (!raw) return {};
        if (typeof raw === "string") {
            try { raw = JSON.parse(raw); } catch (e) { return {}; }
        }
        if (Array.isArray(raw)) {
            const out = {};
            raw.forEach(r => {
                if (r && r.emoji) out[r.emoji] = Array.isArray(r.users) ? r.users : [];
            });
            return out;
        }
        if (typeof raw === "object") return raw;
        return {};
    }

    // ---------- Render reaction pills into a message ----------
    function renderReactions(msgEl, reactions) {
        let wrap = msgEl.querySelector(".msg-reactions");
        if (wrap) wrap.remove();
        if (!reactions || Object.keys(reactions).length === 0) return;

        const myId = getMyUserId();
        const parts = [];
        Object.keys(reactions).forEach(emoji => {
            const users = reactions[emoji] || [];
            if (!users.length) return;
            const mine = myId != null && users.indexOf(myId) !== -1;
            const emojiDecoded = decodeEntities(emoji);
            parts.push(
                '<button class="reaction-pill' + (mine ? " mine" : "") + '"' +
                ' data-emoji="' + emoji.replace(/"/g, "&quot;") + '"' +
                ' data-mine="' + (mine ? "1" : "0") + '"' +
                ' type="button">' +
                    '<span class="emoji">' + emojiDecoded + '</span>' +
                    (users.length > 1 ? '<span class="count">' + users.length + '</span>' : '') +
                '</button>'
            );
        });

        if (!parts.length) return;
        wrap = document.createElement("div");
        wrap.className = "msg-reactions";
        wrap.innerHTML = parts.join("");

        // Wire pills
        wrap.querySelectorAll(".reaction-pill").forEach(pill => {
            pill.addEventListener("click", async (e) => {
                e.stopPropagation();
                const emoji = pill.dataset.emoji;
                await toggleReaction(msgEl, emoji);
            });
        });

        msgEl.appendChild(wrap);
    }

    // ---------- API calls ----------
    async function fetchReactions(messageId) {
        try {
            const res = await fetch("/api/messages/" + messageId + "/reactions", {
                headers: authHeaders()
            });
            const data = await res.json();
            if (data.success) return normalizeReactions(data.reactions);
        } catch (e) {}
        return {};
    }

    async function toggleReaction(msgEl, emoji) {
        const id = msgEl.dataset.messageId || msgEl.dataset.id;
        if (!id) return;
        try {
            const res = await fetch("/api/messages/" + id + "/react", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ emoji: emoji })
            });
            const data = await res.json();
            if (data.success) {
                const updated = normalizeReactions(data.reactions);
                renderReactions(msgEl, updated);
            } else {
                toast(data.message || "Couldn't react", true);
            }
        } catch (e) {
            toast("Couldn't react", true);
        }
    }

    // ---------- Popover ----------
    function ensurePopover() {
        let pop = document.getElementById("reactPopover");
        if (pop) return pop;
        pop = document.createElement("div");
        pop.id = "reactPopover";
        pop.className = "react-popover";
        pop.innerHTML = REACTIONS.map(r =>
            '<button type="button" data-emoji="' + r.replace(/"/g, "&quot;") + '">' + r + '</button>'
        ).join("");
        document.body.appendChild(pop);
        return pop;
    }

    let _currentMsgEl = null;

    function closePopoverOnce(e) {
        const pop = document.getElementById("reactPopover");
        if (!pop || !pop.classList.contains("open")) return;
        if (pop.contains(e.target)) return;
        pop.classList.remove("open");
        _currentMsgEl = null;
        document.removeEventListener("click", closePopoverOnce);
    }

    function openPopover(msgEl, anchor) {
        const pop = ensurePopover();
        const rect = anchor.getBoundingClientRect();
        const pw = 240;
        let left = rect.left - pw / 2 + rect.width / 2;
        if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
        if (left < 12) left = 12;
        pop.style.left = left + "px";
        pop.style.top  = (rect.top - 44) + "px";

        pop.classList.add("open");
        _currentMsgEl = msgEl;

        pop.querySelectorAll("button[data-emoji]").forEach(btn => {
            const fresh = btn.cloneNode(true);
            btn.parentNode.replaceChild(fresh, btn);
            fresh.addEventListener("click", async (e) => {
                e.stopPropagation();
                const emoji = fresh.dataset.emoji;
                pop.classList.remove("open");
                if (_currentMsgEl) await toggleReaction(_currentMsgEl, emoji);
                _currentMsgEl = null;
            });
        });

        setTimeout(() => {
            document.addEventListener("click", closePopoverOnce);
        }, 0);
    }

    // ---------- Inject a react trigger into a message ----------
    function injectReactionsInto(msgEl) {
        if (msgEl.dataset.reactionsInjected === "1") return;
        msgEl.dataset.reactionsInjected = "1";

        // Ensure the message element has position relative for absolute trigger
        const computed = getComputedStyle(msgEl);
        if (computed.position === "static") {
            msgEl.style.position = "relative";
        }

        // Inject the react trigger
        const trigger = document.createElement("button");
        trigger.className = "react-trigger";
        trigger.type = "button";
        trigger.setAttribute("aria-label", "Add reaction");
        trigger.innerHTML = '<i data-lucide="smile-plus" class="icon"></i>';
        msgEl.appendChild(trigger);

        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }

        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            openPopover(msgEl, trigger);
        });

        // Load existing reactions if the message already has a reactions payload attached
        // (messages.js may put it in dataset or the caller may have fetched it)
        const raw = msgEl.dataset.reactions;
        if (raw) {
            try {
                const parsed = normalizeReactions(decodeURIComponent(raw));
                if (Object.keys(parsed).length) renderReactions(msgEl, parsed);
            } catch (e) {}
        }
    }

    // ---------- Scan for new messages ----------
    function scan() {
        // Messages container on Messages page
        const container = document.getElementById("chatMessages");
        if (!container) return;
        const msgs = container.querySelectorAll(".msg");
        msgs.forEach(injectReactionsInto);

        // If messages.js exposes reactions via dataset, wire them
        msgs.forEach(msgEl => {
            const raw = msgEl.dataset.reactions;
            if (raw && !msgEl.querySelector(".msg-reactions")) {
                try {
                    const parsed = normalizeReactions(decodeURIComponent(raw));
                    if (Object.keys(parsed).length) renderReactions(msgEl, parsed);
                } catch (e) {}
            }
        });
    }

    // ---------- Observe DOM ----------
    const container = document.getElementById("chatMessages") || document.body;
    if (window.MutationObserver) {
        let t;
        new MutationObserver(() => {
            clearTimeout(t);
            t = setTimeout(scan, 180);
        }).observe(container, { childList: true, subtree: true });
    }

    window.addEventListener("load", () => setTimeout(scan, 400));
    if (document.readyState === "complete") setTimeout(scan, 200);
    else document.addEventListener("DOMContentLoaded", () => setTimeout(scan, 200));

    // Public API in case messages.js wants to notify us
    window.__crevioRenderReactions = renderReactions;

    console.log("[MessagesReactions] installed");
})();