// =========================================================
// CREVIO — MESSAGES (client inquiry inbox)
// File: dashboard/js/messages.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const convItemsEl = $("convItems");
    const chatPanelEl = $("chatPanel");
    const searchInput = $("searchInput");
    const toast       = $("toast");

    let conversations = [];
    let activeConvId  = null;
    let activeConv    = null;
    let filter        = "all";
    let searchQuery   = "";

    // =========================================================
    // LOAD CONVERSATIONS
    // =========================================================
    async function loadConversations() {
        convItemsEl.innerHTML = `<div class="loading">Loading conversations...</div>`;
        try {
            const res  = await window.apiFetch("/api/messages/conversations");
            const data = await res.json();
            conversations = data.conversations || [];
            renderConversations();
        } catch (err) {
            console.error("Load conversations error:", err);
            convItemsEl.innerHTML = `<div class="empty-state"><p>Could not load conversations.</p></div>`;
        }
    }

    // =========================================================
    // RENDER CONVERSATIONS
    // =========================================================
    function renderConversations() {
        let filtered = [...conversations];

        // Filter
        if (filter === "unread") {
            filtered = filtered.filter(c => c.unread_count > 0);
        } else if (filter === "starred") {
            filtered = filtered.filter(c => c.starred === 1);
        } else if (filter === "new") {
            filtered = filtered.filter(c => (c.status || "").toLowerCase() === "new");
        } else if (filter === "archived") {
            filtered = filtered.filter(c => c.archived === 1);
        } else {
            // "all" excludes archived by default
            filtered = filtered.filter(c => c.archived !== 1);
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                (c.client_name || "").toLowerCase().includes(q) ||
                (c.client_email || "").toLowerCase().includes(q) ||
                (c.last_message || "").toLowerCase().includes(q) ||
                (c.notes || "").toLowerCase().includes(q)
            );
        }

        if (!filtered.length) {
            convItemsEl.innerHTML = `
                <div class="empty-state">
                    <p>${conversations.length ? "No matches." : "No inquiries yet."}</p>
                </div>`;
            return;
        }

        convItemsEl.innerHTML = filtered.map(renderConvItem).join("");
        if (typeof lucide !== "undefined") lucide.createIcons();

        convItemsEl.querySelectorAll(".conv-item").forEach(el => {
            el.addEventListener("click", () => openConversation(parseInt(el.dataset.id, 10)));
        });
    }

    function renderConvItem(c) {
        const name    = c.client_name || "Client";
        const initial = name.charAt(0).toUpperCase();
        const preview = (c.last_message || c.notes || "No messages yet").slice(0, 60);
        const time    = formatRelativeTime(c.last_message_at || c.created_at);
        const unread  = c.unread_count > 0;
        const active  = c.id === activeConvId ? "active" : "";
        const starred = c.starred === 1 ? `<span class="conv-badge starred">★ Starred</span>` : "";
        const status  = c.status && c.status !== "new"
            ? `<span class="conv-badge">${escapeHtml(c.status)}</span>`
            : c.status === "new" ? `<span class="conv-badge new">New</span>` : "";

        return `
            <div class="conv-item ${active} ${unread ? "unread" : ""}" data-id="${c.id}">
                <div class="conv-top">
                    <div class="conv-name">${escapeHtml(name)}</div>
                    <div class="conv-time">${time}</div>
                </div>
                <div class="conv-preview">${escapeHtml(preview) || "No messages yet"}</div>
                <div class="conv-meta">
                    ${status}
                    ${starred}
                    ${c.unread_count > 0 ? `<span class="conv-badge new">${c.unread_count} new</span>` : ""}
                </div>
            </div>
        `;
    }

    // =========================================================
    // OPEN CONVERSATION
    // =========================================================
    async function openConversation(id) {
        activeConvId = id;
        activeConv   = conversations.find(c => c.id === id) || null;

        // Highlight
        convItemsEl.querySelectorAll(".conv-item").forEach(el => {
            el.classList.toggle("active", parseInt(el.dataset.id, 10) === id);
        });

        chatPanelEl.innerHTML = `<div class="loading" style="margin:auto;">Loading messages...</div>`;

        try {
            const res  = await window.apiFetch(`/api/messages/conversations/${id}`);
            const data = await res.json();

            if (!data.success) {
                chatPanelEl.innerHTML = `<div class="empty-chat"><p>Could not load conversation.</p></div>`;
                return;
            }

            const conv = data.conversation || {};
            const msgs = data.messages || [];

            // Reset unread count locally
            const c = conversations.find(x => x.id === id);
            if (c) c.unread_count = 0;
            renderConversations();

            const name    = conv.client_name || "Client";
            const initial = name.charAt(0).toUpperCase();
            const email   = conv.client_email || "";
            const status  = conv.status || "new";
            const starred = conv.starred === 1;

            chatPanelEl.innerHTML = `
                <div class="chat-header">
                    <div class="chat-header-info">
                        <div class="chat-avatar">${initial}</div>
                        <div class="chat-header-text">
                            <h3>${escapeHtml(name)}</h3>
                            <p>${escapeHtml(email)} · Status: ${escapeHtml(status)}</p>
                        </div>
                    </div>
                    <div class="chat-actions">
                        <button class="icon-btn ${starred ? "active" : ""}" id="starBtn" title="Star this inquiry">
                            <i data-lucide="star" class="icon"></i>
                        </button>
                        <button class="icon-btn" id="archiveBtn" title="Archive">
                            <i data-lucide="archive" class="icon"></i>
                        </button>
                        <button class="icon-btn danger" id="deleteBtn" title="Delete conversation">
                            <i data-lucide="trash-2" class="icon"></i>
                        </button>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessages">
                    ${msgs.length
                        ? msgs.map(renderMessage).join("")
                        : `<div class="empty-chat" style="padding:20px;"><p>No messages yet. Say hi!</p></div>`}
                </div>
                <div class="chat-input-bar">
                    <textarea id="msgInput" placeholder="Type your reply..." rows="1"></textarea>
                    <button class="send-btn" id="sendBtn" title="Send">
                        <i data-lucide="send" class="icon"></i>
                    </button>
                </div>
            `;

            if (typeof lucide !== "undefined") lucide.createIcons();
            scrollToBottom();
            setupHandlers(id);
        } catch (err) {
            console.error("Open conversation error:", err);
            chatPanelEl.innerHTML = `<div class="empty-chat"><p>Could not load conversation.</p></div>`;
        }
    }

    function renderMessage(m) {
        const isMine = !!m.is_mine;
        const time   = formatTime(m.created_at);
        return `
            <div class="msg ${isMine ? "outgoing" : "incoming"}">
                ${escapeHtml(m.body || m.content || "")}
                <div class="msg-time">${time}</div>
            </div>
        `;
    }

    // =========================================================
    // SETUP HANDLERS (send, star, archive, delete)
    // =========================================================
    function setupHandlers(convId) {
        const input   = $("msgInput");
        const sendBtn = $("sendBtn");

        // Auto-grow
        input.addEventListener("input", function () {
            this.style.height = "44px";
            this.style.height = Math.min(this.scrollHeight, 140) + "px";
        });

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener("click", sendMessage);

        async function sendMessage() {
            const text = input.value.trim();
            if (!text) return;

            sendBtn.disabled = true;
            input.disabled = true;

            try {
                const res  = await window.apiFetch(`/api/messages/conversations/${convId}`, {
                    method: "POST",
                    body: JSON.stringify({ body: text })
                });
                const data = await res.json();

                if (data.success && data.message) {
                    const container = $("chatMessages");
                    container.insertAdjacentHTML("beforeend", renderMessage({
                        ...data.message,
                        is_mine: true
                    }));
                    input.value = "";
                    input.style.height = "44px";
                    scrollToBottom();
                    if (typeof lucide !== "undefined") lucide.createIcons();
                } else {
                    showToast(data.message || "Failed to send", true);
                }
            } catch (err) {
                showToast("Failed: " + err.message, true);
            } finally {
                sendBtn.disabled = false;
                input.disabled = false;
                input.focus();
            }
        }

        // Star
        $("starBtn")?.addEventListener("click", async () => {
            const c = conversations.find(x => x.id === convId);
            const newVal = c && c.starred === 1 ? 0 : 1;
            try {
                const res = await window.apiFetch(`/api/messages/conversations/${convId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ starred: newVal })
                });
                const data = await res.json();
                if (data.success) {
                    if (c) c.starred = newVal;
                    $("starBtn").classList.toggle("active", newVal === 1);
                    renderConversations();
                    showToast(newVal ? "Starred" : "Unstarred");
                }
            } catch (err) { showToast("Failed: " + err.message, true); }
        });

        // Archive
        $("archiveBtn")?.addEventListener("click", async () => {
            if (!confirm("Archive this conversation? It will move to the Archived filter.")) return;
            try {
                const res = await window.apiFetch(`/api/messages/conversations/${convId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ archived: 1, status: "closed" })
                });
                const data = await res.json();
                if (data.success) {
                    const c = conversations.find(x => x.id === convId);
                    if (c) { c.archived = 1; c.status = "closed"; }
                    renderConversations();
                    chatPanelEl.innerHTML = `
                        <div class="empty-chat">
                            <i data-lucide="archive" class="icon"></i>
                            <h3>Archived</h3>
                            <p>This conversation is now archived.</p>
                        </div>`;
                    if (typeof lucide !== "undefined") lucide.createIcons();
                    activeConvId = null;
                }
            } catch (err) { showToast("Failed: " + err.message, true); }
        });

        // Delete
        $("deleteBtn")?.addEventListener("click", async () => {
            if (!confirm("Permanently delete this conversation?")) return;
            try {
                const res = await window.apiFetch(`/api/messages/conversations/${convId}`, { method: "DELETE" });
                const data = await res.json();
                if (data.success) {
                    conversations = conversations.filter(c => c.id !== convId);
                    renderConversations();
                    chatPanelEl.innerHTML = `
                        <div class="empty-chat">
                            <i data-lucide="message-square" class="icon"></i>
                            <h3>Conversation deleted</h3>
                            <p>Select another to continue.</p>
                        </div>`;
                    if (typeof lucide !== "undefined") lucide.createIcons();
                    activeConvId = null;
                }
            } catch (err) { showToast("Failed: " + err.message, true); }
        });
    }

    // =========================================================
    // SEARCH & FILTERS
    // =========================================================
    searchInput?.addEventListener("input", function () {
        searchQuery = this.value.trim();
        renderConversations();
    });

    document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            filter = chip.dataset.filter;
            renderConversations();
        });
    });

    // =========================================================
    // HELPERS
    // =========================================================
    function scrollToBottom() {
        const el = $("chatMessages");
        if (el) el.scrollTop = el.scrollHeight;
    }

    function formatTime(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch { return str; }
    }

    function formatRelativeTime(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            const diff = Date.now() - d.getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1)  return "now";
            if (mins < 60) return mins + "m";
            const hrs = Math.floor(mins / 60);
            if (hrs < 24)  return hrs + "h";
            const days = Math.floor(hrs / 24);
            if (days < 7)  return days + "d";
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        } catch { return str; }
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    let toastTimer;
    function showToast(msg, isError = false) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadConversations();
});