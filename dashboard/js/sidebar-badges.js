// =========================================================
// CREVIO — SIDEBAR UNREAD BADGES
// File: dashboard/js/sidebar-badges.js
// Adds a red dot next to "Messages" and "Notifications"
// nav items when there are unread items. Works on every
// page that has the sidebar. Idempotent.
// =========================================================
(function () {
    if (window.__crevioSidebarBadgesInstalled) return;
    window.__crevioSidebarBadgesInstalled = true;

    const POLL_MS = 60000; // refresh every 60s when visible

    // ---------- CSS ----------
    if (!document.getElementById("__navBadgeStyles")) {
        const st = document.createElement("style");
        st.id = "__navBadgeStyles";
        st.textContent = `
            .nav-item.nav-has-badge { position: relative; }
            .nav-badge {
                position: absolute;
                top: 6px;
                right: 10px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #EF4444;
                box-shadow: 0 0 0 2px var(--bg-secondary, #1E293B);
                display: none;
                pointer-events: none;
                animation: navBadgePulse 2s ease-in-out infinite;
            }
            .nav-badge.visible { display: block; }
            @keyframes navBadgePulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50%      { transform: scale(1.15); opacity: 0.85; }
            }
        `;
        document.head.appendChild(st);
    }

    // ---------- Find or inject badge into a nav item ----------
    function ensureBadgeFor(hrefFragment) {
        const links = document.querySelectorAll(".sidebar .nav-item, aside .nav-item, .mobile-sidebar .nav-item");
        for (const link of links) {
            if (link.getAttribute("href") && link.getAttribute("href").indexOf(hrefFragment) !== -1) {
                link.classList.add("nav-has-badge");
                let dot = link.querySelector(".nav-badge");
                if (!dot) {
                    dot = document.createElement("span");
                    dot.className = "nav-badge";
                    link.appendChild(dot);
                }
                return dot;
            }
        }
        return null;
    }

    function setDot(dot, visible) {
        if (!dot) return;
        if (visible) dot.classList.add("visible");
        else dot.classList.remove("visible");
    }

    // ---------- Fetch counts ----------
    async function fetchNotificationCount() {
        try {
            const res = await window.apiFetch("/api/notifications/unread-count");
            const data = await res.json();
            return data && data.success ? Number(data.count || 0) : 0;
        } catch (e) { return 0; }
    }

    async function fetchMessageCount() {
        try {
            const res = await window.apiFetch("/api/messages/stats");
            const data = await res.json();
            return data && data.success && data.stats ? Number(data.stats.unread || 0) : 0;
        } catch (e) { return 0; }
    }

    // ---------- Refresh ----------
    let currentPath = window.location.pathname;
    let isNotifPage  = /notifications\.html$/.test(currentPath);
    let isMsgPage    = /messages\.html$/.test(currentPath);

    async function refresh() {
        const notifDot = ensureBadgeFor("notifications.html");
        const msgDot   = ensureBadgeFor("messages.html");

        // Only fetch if the sidebar is present
        if (!notifDot && !msgDot) return;

        // Skip fetching for the count of the page we're on (avoids spurious dots while reading)
        if (!isNotifPage) {
            const nc = await fetchNotificationCount();
            setDot(notifDot, nc > 0);
        } else {
            setDot(notifDot, false);
        }

        if (!isMsgPage) {
            const mc = await fetchMessageCount();
            setDot(msgDot, mc > 0);
        } else {
            setDot(msgDot, false);
        }
    }

    // ---------- Boot ----------
    function start() {
        refresh();
        setInterval(function () {
            if (document.visibilityState === "visible") refresh();
        }, POLL_MS);
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") refresh();
        });
    }

    window.addEventListener("load", function () { setTimeout(start, 300); });
    if (document.readyState === "complete") setTimeout(start, 200);
    else document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 200); });

    console.log("[SidebarBadges] installed");
})();