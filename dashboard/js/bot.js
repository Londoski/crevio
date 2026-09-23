// =========================================================
// CREVIO BOT � frontend
// File: dashboard/js/bot.js
// Sidebar (New Chat + Recent + Claim Offer) + real backend persistence
// =========================================================
console.log("[Bot] loaded");

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const messagesEl = $("messages");
    const inputEl    = $("msgInput");
    const sendBtn    = $("sendBtn");
    const convListEl = $("botConvList");
    const newChatBtn = $("newChatBtn");
    const clearBtn   = $("clearBtn");
    const offerBtn   = $("botOfferBtn");
    const planNameEl = $("botPlanName");
    const toggleBtn  = $("botSidebarToggle");
    const sidebarEl  = $("botSidebar");

    let conversations = [];
    let activeConvId  = null;
    let activeMessages = [];
    let sending = false;
    let currentPlan = "free";

    // ---------- helpers ----------
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        }[c]));
    }
    function refreshIcons() {
        if (typeof lucide !== "undefined") { try { lucide.createIcons(); } catch (e) {} }
    }
    function toast(msg, isErr) {
        const t = $("toast");
        if (!t) return;
        t.textContent = msg;
        t.classList.toggle("error", !!isErr);
        t.classList.add("show");
        clearTimeout(t.__tm);
        t.__tm = setTimeout(() => t.classList.remove("show"), 2600);
    }
    function formatRel(str) {
        if (!str) return "";
        const iso = String(str).includes("T") ? str : String(str).replace(" ", "T");
        const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
        if (isNaN(d.getTime())) return "";
        const diff = Date.now() - d.getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return "now";
        if (m < 60) return m + "m";
        const h = Math.floor(m / 60);
        if (h < 24) return h + "h";
        const dd = Math.floor(h / 24);
        if (dd < 7) return dd + "d";
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    function formatTime(str) {
        if (!str) return "";
        const iso = String(str).includes("T") ? str : String(str).replace(" ", "T");
        const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    }
    async function api(path, opts) {
        return window.apiFetch(path, opts);
    }

    // ---------- sidebar ----------
    async function loadConversations() {
        try {
            const res = await api("/api/bot/conversations");
            const d = await res.json();
            conversations = (d.success && d.conversations) || [];
            renderConversationList();
        } catch (e) {
            convListEl.innerHTML = '<div class="bot-conv-empty">Could not load.</div>';
        }
    }

    function renderConversationList() {
        if (!conversations.length) {
            convListEl.innerHTML = '<div class="bot-conv-empty">No conversations yet</div>';
            return;
        }
        convListEl.innerHTML = conversations.map(c => `
            <button class="bot-conv-item ${c.id === activeConvId ? "active" : ""}" data-id="${c.id}" type="button">
                <span class="bot-conv-title">${esc(c.title || "Untitled")}</span>
                <span class="bot-conv-time">${formatRel(c.updated_at)}</span>
                <span class="bot-conv-del" data-del="${c.id}" title="Delete" role="button" tabindex="0">
                    <i data-lucide="trash-2" class="icon"></i>
                </span>
            </button>
        `).join("");
        refreshIcons();

        convListEl.querySelectorAll(".bot-conv-item").forEach(el => {
            el.addEventListener("click", (e) => {
                if (e.target.closest("[data-del]")) return;
                const id = parseInt(el.dataset.id, 10);
                if (!isNaN(id)) openConversation(id);
            });
        });
        convListEl.querySelectorAll("[data-del]").forEach(del => {
            del.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = parseInt(del.dataset.del, 10);
                if (isNaN(id)) return;
                if (!(await window.crevioConfirm("Delete this conversation?", { title: "Delete", confirmText: "Delete" }))) return;
                try {
                    await api("/api/bot/conversations/" + id, { method: "DELETE" });
                    conversations = conversations.filter(c => c.id !== id);
                    if (activeConvId === id) {
                        activeConvId = null;
                        activeMessages = [];
                        showEmptyState();
                    }
                    renderConversationList();
                    toast("Conversation deleted");
                } catch (err) { toast("Could not delete", true); }
            });
        });
    }

    async function createConversation() {
        try {
            const res = await api("/api/bot/conversations", {
                method: "POST",
                body: JSON.stringify({ title: "New chat" })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.message || "Failed");
            return d.conversation;
        } catch (e) {
            toast("Could not create conversation", true);
            return null;
        }
    }

    async function openConversation(id) {
        activeConvId = id;
        window.__activeConvId = id;
        renderConversationList();
        closeSidebarMobile();
        try {
            const res = await api("/api/bot/conversations/" + id);
            const d = await res.json();
            if (!d.success) throw new Error(d.message || "Failed");
            activeMessages = d.messages || [];
            renderMessages();
        } catch (e) {
            messagesEl.innerHTML = `<div class="empty-chat">Could not load conversation.</div>`;
        }
    }

    // ---------- chat area ----------
    function showEmptyState() {
        messagesEl.innerHTML = `
            <div class="bot-empty-state">
                <div class="bot-avatar" style="width:64px;height:64px;border-radius:16px;margin-bottom:18px;">
                    <i data-lucide="bot" class="icon" style="width:30px;height:30px;"></i>
                </div>
                <h2>What are you working on?</h2>
                <p>Ask Crevio Bot to help improve your portfolio, projects, services, or professional content.</p>
                <div class="bot-empty-suggestions">
                    <button class="suggestion-chip" data-prompt="Help me improve my portfolio">Improve my portfolio</button>
                    <button class="suggestion-chip" data-prompt="Rewrite a project description for me">Rewrite a project description</button>
                    <button class="suggestion-chip" data-prompt="Help me improve one of my services">Improve my service</button>
                    <button class="suggestion-chip" data-prompt="Give me content ideas for my portfolio">Content ideas</button>
                </div>
            </div>`;
        refreshIcons();
        messagesEl.querySelectorAll(".suggestion-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                inputEl.value = chip.dataset.prompt;
                sendMessage();
            });
        });
    }

    function renderMessages() {
        if (!activeMessages.length) {
            showEmptyState();
            return;
        }
        messagesEl.innerHTML = activeMessages.map(m => renderBubble(m)).join("");
        refreshIcons();
        applyBubbleClamp();
        scrollToBottom();
    }

    function renderBubble(m) {
        const isUser = m.role === "user";
        const time = formatTime(m.created_at);
        const body = esc(m.content || "");
        const avatarInner = isUser
            ? '<span style="font-weight:700;color:var(--accent);">U</span>'
            : '<i data-lucide="bot" class="icon"></i>';

        // NOTE: no expand button rendered here — applyBubbleClamp adds it only if needed
        return `
            <div class="${isUser ? "message user" : "message"}">
                <div class="msg-avatar ${isUser ? "user" : "bot"}">${avatarInner}</div>
                <div class="msg-bubble ${isUser ? "user" : "bot"}" data-md-rendered="${isUser ? "1" : "0"}">
                    <div class="msg-body">${body}</div>
                    <div class="msg-time">${time}</div>
                </div>
            </div>`;
    }

    function showTyping() {
        const el = document.createElement("div");
        el.className = "message";
        el.id = "typingBubble";
        el.innerHTML = `
            <div class="msg-avatar bot"><i data-lucide="bot" class="icon"></i></div>
            <div class="msg-bubble bot">
                <div class="typing"><span></span><span></span><span></span></div>
            </div>`;
        messagesEl.appendChild(el);
        refreshIcons();
        scrollToBottom();
    }
    function hideTyping() {
        $("typingBubble")?.remove();
    }

    // =========================================================
    // CLAMP / EXPAND LONG MESSAGES
    // =========================================================
    const CLAMP_PX = 260;

    function applyBubbleClamp(scope) {
        const root = scope || messagesEl;
        if (!root) return;

        // Clean slate for every bubble
        root.querySelectorAll(".msg-bubble").forEach(b => {
            // Remove any existing expand buttons
            b.querySelectorAll(".msg-expand-btn").forEach(btn => btn.remove());
            b.classList.remove("clamped");
            b.removeAttribute("data-has-more");
        });

        // Only USER bubbles can clamp
        root.querySelectorAll(".msg-bubble.user").forEach(bubble => {
            const body = bubble.querySelector(".msg-body");
            if (!body) return;

            const text = (body.textContent || "").trim();
            if (text.length < 200) return;                 // short → never clamp

            const natural = body.scrollHeight;
            if (natural <= CLAMP_PX + 20) return;           // fits → never clamp

            // CLAMP THIS BUBBLE
            bubble.classList.add("clamped");
            bubble.setAttribute("data-has-more", "1");

            // Create and insert the button just before .msg-time
            const btn = document.createElement("button");
            btn.className = "msg-expand-btn";
            btn.type = "button";
            btn.innerHTML =
                '<span data-expand-label>Show more</span>' +
                '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

            const timeEl = bubble.querySelector(".msg-time");
            if (timeEl) bubble.insertBefore(btn, timeEl);
            else bubble.appendChild(btn);

            btn.addEventListener("click", () => {
                const isClamped = bubble.classList.contains("clamped");
                bubble.classList.toggle("clamped", !isClamped);
                btn.querySelector("[data-expand-label]").textContent = isClamped ? "Show less" : "Show more";
                const polyline = btn.querySelector("polyline");
                if (polyline) polyline.setAttribute("points", isClamped ? "18 15 12 9 6 15" : "6 9 12 15 18 9");
            });
        });
    }


    function updateDisclaimer() {
        const el = document.getElementById("botDisclaimer");
        if (!el) return;
        // Show only when the conversation has messages (not on empty state)
        const hasMessages = activeMessages && activeMessages.length > 0;
        el.classList.toggle("visible", hasMessages);
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ---------- send ----------
    async function sendMessage() {
        const text = (inputEl.value || "").trim();
        if (!text || sending) return;
        sending = true;
        sendBtn.disabled = true;
        inputEl.value = "";
        inputEl.style.height = "36px";

        try {
            // If no conversation yet, create one
            if (!activeConvId) {
                const c = await createConversation();
                if (!c) { sending = false; sendBtn.disabled = false; return; }
                activeConvId = c.id;
                conversations.unshift(c);
                renderConversationList();
            }

            // Optimistic user bubble
            activeMessages.push({ id: -1, role: "user", content: text, created_at: new Date().toISOString() });
            if (activeMessages.length === 1) {
                messagesEl.innerHTML = "";
            }
            messagesEl.insertAdjacentHTML("beforeend", renderBubble({ role: "user", content: text, created_at: new Date().toISOString() }));
            refreshIcons();
            updateDisclaimer();
            scrollToBottom();

            // Live assistant bubble
            const bubbleId = "liveAssistant";
            const wrapper = document.createElement("div");
            wrapper.className = "message";
            wrapper.setAttribute("data-role", "assistant");
            wrapper.setAttribute("data-live-id", "live-" + Date.now());
            wrapper.id = bubbleId;
            wrapper.innerHTML = `
                <div class="msg-avatar bot"><i data-lucide="bot" class="icon"></i></div>
                <div class="msg-bubble bot" data-md-rendered="0" data-live="1">
                    <span class="live-text"></span><span class="live-cursor">?</span>
                    <div class="msg-time"></div>
                </div>`;
            messagesEl.appendChild(wrapper);
            refreshIcons();
            scrollToBottom();

            const liveBubble = wrapper.querySelector(".msg-bubble");
            const liveText   = wrapper.querySelector(".live-text");
            const liveTime   = wrapper.querySelector(".msg-time");
            let fullText = "";

            // Use fetch with streaming body
            const token = localStorage.getItem("token");
            const res = await fetch("/api/bot/chat-stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token ? "Bearer " + token : ""
                },
                body: JSON.stringify({ conversation_id: activeConvId, message: text })
            });

            if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "");
                throw new Error("Server " + res.status + ": " + errText.slice(0, 120));
            }

            const reader  = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let idx;
                while ((idx = buffer.indexOf("\n\n")) >= 0) {
                    const raw = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);

                    const line = raw.split("\n").find(l => l.startsWith("data:"));
                    if (!line) continue;
                    let payload;
                    try { payload = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }

                    if (payload.type === "chunk" && payload.text) {
                        fullText += payload.text;
                        liveText.textContent = fullText;
                        liveBubble.scrollIntoView({ block: "end", behavior: "auto" });
                        messagesEl.scrollTop = messagesEl.scrollHeight;
                    } else if (payload.type === "replace") {
                        fullText = payload.text || "";
                        liveText.textContent = fullText;
                        messagesEl.scrollTop = messagesEl.scrollHeight;
                    } else if (payload.type === "meta") {
                        if (payload.title) {
                            const c = conversations.find(x => x.id === activeConvId);
                            if (c && (!c.title || c.title === "New chat")) {
                                c.title = payload.title;
                                renderConversationList();
                            }
                        }
                    } else if (payload.type === "done") {
                        if (payload.message_id && wrapper) wrapper.setAttribute("data-message-id", String(payload.message_id));
                        if (payload.title) {
                            const c = conversations.find(x => x.id === activeConvId);
                            if (c) c.title = payload.title;
                            renderConversationList();
                        }
                    } else if (payload.type === "error") {
                        throw new Error(payload.message || "Stream error");
                    }
                }
            }

            // Finalize: turn live bubble into a normal bubble with markdown
            const nowIso = new Date().toISOString();
            wrapper.removeAttribute("id");
            liveBubble.removeAttribute("data-live");
            wrapper.querySelector(".live-cursor")?.remove();
            const finalMsg = { id: -2, role: "assistant", content: fullText, created_at: nowIso };
            activeMessages.push(finalMsg);
                       liveBubble.dataset.mdRendered = "0";
            liveBubble.innerHTML = '<div class="msg-body">' + esc(fullText) + '</div>'
                + '<div class="msg-time">' + formatTime(nowIso) + '</div>';
            if (typeof window.__ensureToolbars === "function") window.__ensureToolbars();
            refreshIcons();
            scrollToBottom();
        } catch (e) {
            // Remove live bubble on failure
            document.getElementById("liveAssistant")?.remove();
            toast("Failed: " + e.message, true);
        } finally {
            sending = false;
            sendBtn.disabled = false;
            inputEl.focus();
        }
    }

    // ---------- composer ----------
    inputEl.addEventListener("input", function () {
        this.style.height = "32px";
        this.style.height = Math.min(this.scrollHeight, 160) + "px";
    });
    inputEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    sendBtn.addEventListener("click", sendMessage);

    // Suggestions on the initial page (outside empty state)
    document.querySelectorAll(".suggestion-chip[data-prompt]").forEach(chip => {
        chip.addEventListener("click", () => {
            inputEl.value = chip.dataset.prompt;
            sendMessage();
        });
    });

    // ---------- new chat ----------
    newChatBtn.addEventListener("click", async () => {
        activeConvId = null;
        activeMessages = [];
        showEmptyState();
        renderConversationList();
        inputEl.focus();
        closeSidebarMobile();
    });

    // ---------- clear button: delete active conversation ----------
    clearBtn.addEventListener("click", async () => {
        if (!activeConvId) { toast("No active conversation"); return; }
        if (!(await window.crevioConfirm("Delete this conversation?", { title: "Delete", confirmText: "Delete" }))) return;
        try {
            await api("/api/bot/conversations/" + activeConvId, { method: "DELETE" });
            conversations = conversations.filter(c => c.id !== activeConvId);
            activeConvId = null;
            activeMessages = [];
            showEmptyState();
            renderConversationList();
            toast("Conversation deleted");
        } catch (e) { toast("Could not delete", true); }
    });

    // ---------- plan + offer ----------
    async function loadPlanAndOffer() {
        try {
            const res = await api("/api/bot/offer-status");
            const d = await res.json();
            currentPlan = (d.plan || "free").toLowerCase();
            if (planNameEl) planNameEl.textContent = currentPlan;
            if (offerBtn) offerBtn.hidden = !d.available;

            // Business-only: workspace check button
            const wsBtn = document.getElementById("wsBtn");
            if (wsBtn) wsBtn.style.display = (currentPlan === "business") ? "" : "none";

            // If the workspace panel is open but user isn't business → hide it
            if (currentPlan !== "business") {
                const panel = document.getElementById("wsPanel");
                if (panel) panel.style.display = "none";
            }
        } catch (e) {
            if (planNameEl) planNameEl.textContent = "—";
            if (offerBtn) offerBtn.hidden = true;
            const wsBtn = document.getElementById("wsBtn");
            if (wsBtn) wsBtn.style.display = "none";
        }
    }
    offerBtn.addEventListener("click", () => {
        toast("Offer is not available yet");
    });

    // ---------- mobile sidebar toggle ----------
    function openSidebarMobile() { sidebarEl.classList.add("open"); }
    function closeSidebarMobile() { sidebarEl.classList.remove("open"); }
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => sidebarEl.classList.toggle("open"));
    }
    document.addEventListener("click", (e) => {
        if (window.innerWidth > 900) return;
        if (!sidebarEl.classList.contains("open")) return;
        if (sidebarEl.contains(e.target)) return;
        if (toggleBtn && toggleBtn.contains(e.target)) return;
        closeSidebarMobile();
    });


    // =========================================================
    // TRAINING MODAL
    // =========================================================
    const TONES = [
        { key: "professional", label: "Professional" },
        { key: "casual",       label: "Casual" },
        { key: "direct",       label: "Direct" },
        { key: "warm",         label: "Warm" }
    ];
    const LENS = [
        { key: "brief",    label: "Brief" },
        { key: "balanced", label: "Balanced" },
        { key: "detailed", label: "Detailed" }
    ];

    let trainState = null;

    async function openTrainModal() {
        const overlay = $("trainOverlay");
        if (!overlay) return;

        // Load current values
        try {
            const res = await api("/api/bot/training");
            const d = await res.json();
            if (d.success) trainState = d.training || {};
        } catch (e) {
            toast("Could not load training", true);
            return;
        }

        // Fill inputs
        $("trainBotName").value   = trainState.bot_name || "CrevioBot";
        $("trainUserName").value  = trainState.user_name || "";
        $("trainProfession").value= trainState.profession || "";
        $("trainAbout").value     = trainState.about_user || "";
        $("trainCustom").value    = trainState.custom_instructions || "";

        // Tone chips
        const tonesEl = $("trainTones");
        tonesEl.innerHTML = TONES.map(t =>
            '<button class="train-chip ' + ((trainState.tone || "professional") === t.key ? "active" : "") + '" data-tone="' + t.key + '" type="button">' + t.label + '</button>'
        ).join("");
        tonesEl.querySelectorAll("[data-tone]").forEach(btn => {
            btn.addEventListener("click", () => {
                tonesEl.querySelectorAll("[data-tone]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                trainState.tone = btn.dataset.tone;
            });
        });

        // Length chips
        const lensEl = $("trainLens");
        lensEl.innerHTML = LENS.map(l =>
            '<button class="train-chip ' + ((trainState.response_length || "balanced") === l.key ? "active" : "") + '" data-len="' + l.key + '" type="button">' + l.label + '</button>'
        ).join("");
        lensEl.querySelectorAll("[data-len]").forEach(btn => {
            btn.addEventListener("click", () => {
                lensEl.querySelectorAll("[data-len]").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                trainState.response_length = btn.dataset.len;
            });
        });

        // Toggles
        document.querySelectorAll(".train-toggle").forEach(btn => {
            const key = btn.dataset.toggle;
            btn.classList.toggle("active", !!trainState[key]);
            btn.onclick = () => {
                btn.classList.toggle("active");
                trainState[key] = btn.classList.contains("active") ? 1 : 0;
            };
        });

        overlay.classList.add("open");
        refreshIcons();
    }

    function closeTrainModal() {
        $("trainOverlay")?.classList.remove("open");
    }

    async function saveTraining() {
        const payload = {
            bot_name:            $("trainBotName").value.trim() || "CrevioBot",
            user_name:           $("trainUserName").value.trim(),
            profession:          $("trainProfession").value.trim(),
            about_user:          $("trainAbout").value.trim(),
            custom_instructions: $("trainCustom").value.trim(),
            tone:                trainState.tone || "professional",
            response_length:     trainState.response_length || "balanced",
            include_portfolio:   trainState.include_portfolio ? 1 : 0,
            include_projects:    trainState.include_projects ? 1 : 0,
            include_services:    trainState.include_services ? 1 : 0,
            include_skills:      trainState.include_skills ? 1 : 0
        };
        try {
            const res = await api("/api/bot/training", { method: "POST", body: JSON.stringify(payload) });
            const d = await res.json();
            if (!d.success) throw new Error(d.message || "Save failed");
            toast("Training saved");
            closeTrainModal();
        } catch (e) { toast("Could not save: " + e.message, true); }
    }

    async function resetTraining() {
        if (!(await window.crevioConfirm("Reset your bot's training to defaults? This cannot be undone.", { title: "Delete", confirmText: "Delete" }))) return;
        try {
            await api("/api/bot/training", { method: "DELETE" });
            toast("Training reset");
            closeTrainModal();
        } catch (e) { toast("Could not reset", true); }
    }

    // Wire modal buttons
    if ($("trainBtn"))   
    if ($("trainClose")) $("trainClose").addEventListener("click", closeTrainModal);
    if ($("trainCancel"))$("trainCancel").addEventListener("click", closeTrainModal);
    if ($("trainSave"))  $("trainSave").addEventListener("click", saveTraining);
    if ($("trainReset")) $("trainReset").addEventListener("click", resetTraining);
    const trainOverlayEl = $("trainOverlay");
    if (trainOverlayEl) {
        trainOverlayEl.addEventListener("click", (e) => { if (e.target === trainOverlayEl) closeTrainModal(); });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape" && trainOverlayEl.classList.contains("open")) closeTrainModal(); });
    }


    // =========================================================
    // WORKSPACE CHECK
    // =========================================================
    async function openWorkspacePanel() {
        if (currentPlan !== "business") {
            toast("Workspace intelligence is available on Business plan", true);
            return;
        }
        const panel = $("wsPanel");
        const summaryEl = $("wsSummary");
        const issuesEl = $("wsIssues");
        if (!panel) return;

        // Clear any previous hidden state
        panel.style.removeProperty("display");
        panel.style.removeProperty("visibility");
        panel.style.removeProperty("height");
        panel.style.removeProperty("min-height");
        panel.style.removeProperty("max-height");
        panel.style.removeProperty("margin");
        panel.style.removeProperty("padding");
        panel.style.removeProperty("border");
        panel.style.removeProperty("overflow");
        panel.removeAttribute("data-ws-hidden");
        // Also clear any parent hidden state
        let p = panel.parentElement;
        let depth = 0;
        while (p && p !== document.body && depth < 3) {
            p.style.removeProperty("display");
            p = p.parentElement;
            depth++;
        }
        panel.style.display = "block";
        summaryEl.innerHTML = '<div class="ws-stat"><div class="ws-stat-label">Status</div><div class="ws-stat-value">Loading…</div></div>';
        issuesEl.innerHTML = "";
        try {
            const res = await api("/api/bot/workspace");
            const d = await res.json();
            if (!d.success) {
                if (d.code === "business_only") {
                    issuesEl.innerHTML =
                        '<div class="ws-clean">' +
                            '<i data-lucide="lock" class="icon"></i>' +
                            '<h4>Business plan required</h4>' +
                            '<p>Workspace intelligence is available on the Business plan. Upgrade to unlock full audits, issue detection, and guided fixes.</p>' +
                        '</div>';
                    refreshIcons();
                    return;
                }
                throw new Error(d.message || "Failed");
            }
            renderWorkspace(d.snapshot, d.issues);
        } catch (e) {
            issuesEl.innerHTML = '<div class="ws-clean"><p>Could not load workspace: ' + esc(e.message) + '</p></div>';
        }
    }

    function renderWorkspace(s, issues) {
        const summaryEl = $("wsSummary");
        const issuesEl = $("wsIssues");

        const p = s.profile || {};
        const sv = s.services || {};
        const pj = s.projects || {};
        const po = s.portfolio || {};
        const ms = s.messages || {};

        const cell = (label, value, cls) => '<div class="ws-stat"><div class="ws-stat-label">' + label + '</div><div class="ws-stat-value ' + (cls || "") + '">' + value + '</div></div>';

        summaryEl.innerHTML =
            cell("Bio", p.has_bio ? "Set" : "Empty", p.has_bio ? "good" : "bad") +
            cell("Photo", p.has_photo ? "Set" : "Empty", p.has_photo ? "good" : "warn") +
            cell("Skills", (s.skills && s.skills.attached) || 0, ((s.skills && s.skills.attached) || 0) < 5 ? "warn" : "good") +
            cell("Services", sv.total || 0, (sv.total || 0) === 0 ? "bad" : "good") +
            cell("Projects", pj.total || 0, (pj.total || 0) === 0 ? "bad" : "good") +
            cell("Portfolio", po.published ? "Live" : "Draft", po.published ? "good" : "bad") +
            cell("Inbox", (ms.unanswered || 0) > 0 ? (ms.unanswered + " unread") : "Clear", (ms.unanswered || 0) > 0 ? "warn" : "good");

        if (!issues.length) {
            issuesEl.innerHTML = '<div class="ws-clean"><i data-lucide="check-circle" class="icon"></i><h4>Everything looks good</h4><p>No issues found in your workspace. Nice work.</p></div>';
            refreshIcons();
            return;
        }

        issuesEl.innerHTML = issues.map(function (i) {
            return '<div class="ws-issue" data-path="' + esc(i.path || "") + '">' +
                '<span class="ws-issue-sev ' + esc(i.severity) + '"></span>' +
                '<div class="ws-issue-body">' +
                    '<div class="ws-issue-title">' + esc(i.title) + '</div>' +
                    '<div class="ws-issue-detail">' + esc(i.detail) + '</div>' +
                    '<div class="ws-issue-action">→ ' + esc(i.action) + '</div>' +
                '</div>' +
            '</div>';
        }).join("");

        issuesEl.querySelectorAll(".ws-issue").forEach(function (el) {
            el.addEventListener("click", function () {
                const path = el.dataset.path;
                if (path) window.open(path, "_blank");
            });
        });
        refreshIcons();
    }

    function closeWorkspacePanel() {
        const panel = $("wsPanel");
        if (!panel) return;

        // Nuclear hide — inline styles with highest priority
        panel.style.setProperty("display", "none", "important");
        panel.style.setProperty("visibility", "hidden", "important");
        panel.style.setProperty("height", "0", "important");
        panel.style.setProperty("min-height", "0", "important");
        panel.style.setProperty("max-height", "0", "important");
        panel.style.setProperty("margin", "0", "important");
        panel.style.setProperty("padding", "0", "important");
        panel.style.setProperty("border", "0", "important");
        panel.style.setProperty("overflow", "hidden", "important");
        panel.setAttribute("data-ws-hidden", "1");

        // Hide any parent wrapper that only contains this panel
        let p = panel.parentElement;
        let depth = 0;
        while (p && p !== document.body && depth < 3) {
            const visibleSiblings = Array.from(p.children).filter(function (c) {
                return c !== panel && (c.textContent || "").trim().length > 0;
            });
            if (visibleSiblings.length === 0) {
                p.style.setProperty("display", "none", "important");
            }
            p = p.parentElement;
            depth++;
        }

        console.log("[WS] Panel hidden");
    }

    // Wire
    if ($("wsBtn"))   $("wsBtn").addEventListener("click", openWorkspacePanel);
    if ($("wsClose")) $("wsClose").addEventListener("click", closeWorkspacePanel);

    // =========================================================
    // CLAIM OFFER
    // =========================================================
    let offerState = { options: [], selected: null, duration_days: 2 };

    async function openOfferModal() {
        const overlay = $("offerOverlay");
        const bodyEl  = $("offerBody");
        const footEl  = $("offerFoot");
        if (!overlay || !bodyEl || !footEl) return;

        // Reset
        offerState = { options: [], selected: null, duration_days: 2 };
        bodyEl.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Loading…</p>';
        footEl.innerHTML = "";
        overlay.classList.add("open");

        try {
            const res = await api("/api/bot/offer-status");
            const d = await res.json();

            if (!d.success) throw new Error(d.message || "Failed");

            if (!d.available) {
                renderOfferUnavailable(d);
                return;
            }

            offerState.options = d.options || [];
            offerState.duration_days = d.duration_days || 2;

            $("offerTitle").textContent = "Your Crevio offer";
            $("offerSubtitle").textContent = "Try a higher plan free for " + offerState.duration_days + " days.";

            const descMap = {
                pro:      "Advanced capabilities — longer messages, editing, more pins.",
                business: "Full workspace intelligence, longest pins, unlimited messages."
            };

            bodyEl.innerHTML = offerState.options.map(function (p) {
                return '<div class="offer-option" data-plan="' + p + '">' +
                    '<div class="offer-option-radio"></div>' +
                    '<div class="offer-option-body">' +
                        '<div class="offer-option-name">' + p + '</div>' +
                        '<div class="offer-option-desc">' + (descMap[p] || "Unlock more of Crevio") + '</div>' +
                    '</div>' +
                '</div>';
            }).join("");

            // Default select first
            const first = bodyEl.querySelector(".offer-option");
            if (first) {
                first.classList.add("selected");
                offerState.selected = first.dataset.plan;
            }

            bodyEl.querySelectorAll(".offer-option").forEach(function (opt) {
                opt.addEventListener("click", function () {
                    bodyEl.querySelectorAll(".offer-option").forEach(function (o) { o.classList.remove("selected"); });
                    opt.classList.add("selected");
                    offerState.selected = opt.dataset.plan;
                });
            });

            footEl.innerHTML =
                '<button class="offer-btn ghost" id="offerCancel" type="button">Cancel</button>' +
                '<div class="spacer"></div>' +
                '<button class="offer-btn primary" id="offerClaim" type="button">Start free trial</button>';

            $("offerCancel").addEventListener("click", closeOfferModal);
            $("offerClaim").addEventListener("click", claimOffer);

            refreshIcons();
        } catch (e) {
            bodyEl.innerHTML = '<p style="color:var(--danger);font-size:13px;">Could not load offer: ' + esc(e.message) + '</p>';
        }
    }

    function renderOfferUnavailable(d) {
        const bodyEl = $("offerBody");
        const footEl = $("offerFoot");
        $("offerTitle").textContent = "No offer available";

        let msg = "";
        if (d.reason === "no_higher_plan") {
            $("offerSubtitle").textContent = "You're already on our highest plan.";
            msg = "There's nothing above Business. Enjoy everything Crevio offers.";
        } else if (d.reason === "trial_active") {
            $("offerSubtitle").textContent = "Your free trial is active.";
            msg = "You are currently trialing " + (d.trial_plan || "a higher plan") + ". It ends " + formatRel(d.trial_ends_at) + ".";
        } else if (d.reason === "already_used") {
            $("offerSubtitle").textContent = "You've already used your free trial.";
            msg = "Each account can claim one free trial. To upgrade, visit Subscription.";
        } else {
            $("offerSubtitle").textContent = "No offer is available right now.";
            msg = "Check back later or explore the plans page.";
        }

        bodyEl.innerHTML = '<div class="offer-unavailable">' +
            '<i data-lucide="info" class="icon"></i>' +
            '<h3>Heads up</h3>' +
            '<p>' + esc(msg) + '</p>' +
        '</div>';

        footEl.innerHTML = '<button class="offer-btn primary" id="offerCloseOnly" type="button">Got it</button>';
        $("offerCloseOnly").addEventListener("click", closeOfferModal);
        refreshIcons();
    }

    async function claimOffer() {
        if (!offerState.selected) return;
        const btn = $("offerClaim");
        if (btn) btn.disabled = true;
        try {
            const res = await api("/api/bot/claim-offer", {
                method: "POST",
                body: JSON.stringify({ plan: offerState.selected })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.message || "Could not activate trial");
            toast(d.message || "Trial started");
            closeOfferModal();
            // Refresh the plan badge + workspace button
            await loadPlanAndOffer();
            await loadConversations();
        } catch (e) {
            toast(e.message || "Could not activate trial", true);
            if (btn) btn.disabled = false;
        }
    }

    function closeOfferModal() {
        $("offerOverlay")?.classList.remove("open");
    }

    // Wire the sidebar Claim Offer button
    if (offerBtn) {
        // Remove old "not available" handler
        offerBtn.replaceWith(offerBtn.cloneNode(true));
    }
    const freshOfferBtn = $("botOfferBtn");
    if (freshOfferBtn) freshOfferBtn.addEventListener("click", openOfferModal);

    // ---------- TRAIN BUTTON (event delegation) ----------
    document.addEventListener("click", function (e) {
        const btn = e.target.closest("#trainBtn");
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof openTrainModal === "function") {
                openTrainModal();
            } else {
                console.error("[Bot] openTrainModal is not defined");
                if (typeof toast === "function") toast("Training not available", true);
            }
        }
    });

    // =========================================================
    // RESET ALL DATA (with confirmation)
    // =========================================================
    function openResetConfirm() {
        const ov = $("resetConfirmOverlay");
        if (!ov) return;
        ov.classList.add("open");
    }
    function closeResetConfirm() {
        $("resetConfirmOverlay")?.classList.remove("open");
    }
    async function executeResetAll() {
        const okBtn = $("resetConfirmOk");
        if (okBtn) okBtn.disabled = true;
        try {
            const res = await api("/api/bot/reset-all", {
                method: "POST",
                body: JSON.stringify({ confirm: true, scope: "all" })
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.message || "Failed");
            toast("All Crevio Bot data deleted");
            closeResetConfirm();
            closeTrainModal();
            activeConvId = null;
            activeMessages = [];
            await loadConversations();
            await loadPlanAndOffer();
            showEmptyState();
        } catch (e) {
            toast("Could not delete: " + e.message, true);
            if (okBtn) okBtn.disabled = false;
        }
    }
    if ($("resetDataBtn")) $("resetDataBtn").addEventListener("click", openResetConfirm);
    if ($("resetConfirmCancel")) $("resetConfirmCancel").addEventListener("click", closeResetConfirm);
    if ($("resetConfirmOk")) $("resetConfirmOk").addEventListener("click", executeResetAll);
    const resetOv = $("resetConfirmOverlay");
    if (resetOv) {
        resetOv.addEventListener("click", function (e) { if (e.target === resetOv) closeResetConfirm(); });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && resetOv.classList.contains("open")) closeResetConfirm();
        });
    }


    // Expose resend for the toolbar Regenerate button
    window.__botResend = function (text) {
        if (!text) return;
        inputEl.value = text;
        sendMessage();
    };
    // ---------- init ----------
    (async function () {
        await loadPlanAndOffer();
        await loadConversations();
        if (conversations.length) {
            openConversation(conversations[0].id);
        } else {
            showEmptyState();
        }
        refreshIcons();
    })();
});
