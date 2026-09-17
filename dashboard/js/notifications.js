// =========================================================
// CREVIO — NOTIFICATIONS PAGE
// File: dashboard/js/notifications.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container     = $("notificationsContainer");
    const markAllBtn    = $("markAllBtn");
    const unreadCountEl = $("unreadCount");
    const totalLabel    = $("totalLabel");
    const toast         = $("toast");

    let notifications = [];
    let filter        = "all";

    // =========================================================
    // LOAD
    // =========================================================
    async function loadNotifications() {
        container.innerHTML = `<div class="loading">Loading notifications...</div>`;
        try {
            const res  = await window.apiFetch("/api/notifications");
            const data = await res.json();
            notifications = data.notifications || [];
            render();
        } catch (err) {
            console.error("Load notifications error:", err);
            container.innerHTML = `<div class="empty-state"><p>Could not load notifications.</p></div>`;
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function render() {
        // Update counts
        const unreadCount = notifications.filter(n => !n.is_read).length;
        unreadCountEl.textContent = unreadCount;
        totalLabel.textContent = `${notifications.length} notification${notifications.length === 1 ? "" : "s"}`;

        // Filter
        let filtered = notifications;
        if (filter === "unread") {
            filtered = notifications.filter(n => !n.is_read);
        } else if (filter !== "all") {
            filtered = notifications.filter(n => (n.type || "system").toLowerCase() === filter);
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="${filter === "all" ? "bell-off" : "inbox"}" class="icon"></i>
                    <h3>${filter === "all" ? "No notifications yet" : "Nothing here"}</h3>
                    <p>${filter === "all"
                        ? "You'll see activity updates here."
                        : "Try a different filter."}</p>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            return;
        }

        container.innerHTML = `<div class="notif-list">${filtered.map(renderItem).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        // Mark read on click
        container.querySelectorAll("[data-mark-read]").forEach(el => {
            el.addEventListener("click", () => markRead(el.dataset.markRead));
        });

        // Delete
        container.querySelectorAll("[data-delete]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.delete;
                if (!confirm("Delete this notification?")) return;
                try {
                    const res  = await window.apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        notifications = notifications.filter(n => String(n.id) !== String(id));
                        render();
                        showToast("Deleted");
                    }
                } catch (err) { showToast("Failed: " + err.message, true); }
            });
        });
    }

    function renderItem(n) {
        const type   = (n.type || "system").toLowerCase();
        const unread = !n.is_read;
        const time   = formatRelativeTime(n.created_at);

        return `
            <div class="notif-item ${unread ? 'unread' : ''}" data-mark-read="${n.id}">
                <div class="notif-icon ${type}">
                    <i data-lucide="${iconForType(type)}" class="icon"></i>
                </div>
                <div class="notif-body">
                    <div class="notif-title">${escapeHtml(n.title || "Notification")}</div>
                    <div class="notif-message">${escapeHtml(n.message || "")}</div>
                    <div class="notif-time">${time}</div>
                </div>
                <div class="notif-actions">
                    <button class="icon-btn danger" data-delete="${n.id}" title="Delete">
                        <i data-lucide="trash-2" class="icon"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function iconForType(t) {
        return {
            message: "message-square",
            payment: "credit-card",
            alert:   "alert-triangle",
            error:   "alert-circle",
            system:  "info"
        }[t] || "bell";
    }

    // =========================================================
    // ACTIONS
    // =========================================================
    async function markRead(id) {
        const n = notifications.find(x => String(x.id) === String(id));
        if (!n || n.is_read) return;
        try {
            await window.apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
            n.is_read = 1;
            render();
        } catch (err) {
            console.error("Mark read error:", err);
        }
    }

    markAllBtn?.addEventListener("click", async () => {
        markAllBtn.disabled = true;
        try {
            const res = await window.apiFetch("/api/notifications/read-all", { method: "PATCH" });
            const data = await res.json();
            if (data.success) {
                notifications.forEach(n => n.is_read = 1);
                render();
                showToast("All marked as read");
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            markAllBtn.disabled = false;
        }
    });

    // =========================================================
    // FILTERS
    // =========================================================
    document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            filter = chip.dataset.filter;
            render();
        });
    });

    // =========================================================
    // HELPERS
    // =========================================================
    function formatRelativeTime(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            const diff = Date.now() - d.getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1)  return "just now";
            if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
            const hrs = Math.floor(mins / 60);
            if (hrs < 24)  return hrs + " hour" + (hrs === 1 ? "" : "s") + " ago";
            const days = Math.floor(hrs / 24);
            if (days < 7)  return days + " day" + (days === 1 ? "" : "s") + " ago";
            return d.toLocaleDateString();
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
    loadNotifications();
});