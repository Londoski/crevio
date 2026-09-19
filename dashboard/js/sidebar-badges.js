// =========================================================
// CREVIO — SIDEBAR UNREAD BADGES
// File: dashboard/js/sidebar-badges.js
// Rule: dot shows whenever unread count > 0 — on EVERY page,
// including the notifications/messages page itself. Only hides
// when the count actually drops to 0 (user read everything).
// =========================================================
(function () {
    if (window.__crevioSidebarBadgesInstalled) return;
    window.__crevioSidebarBadgesInstalled = true;

    const POLL_MS = 30000;

    // ---------- CSS ----------
    if (!document.getElementById("__navBadgeStyles")) {
        const st = document.createElement("style");
        st.id = "__navBadgeStyles";
        st.textContent = `
            .nav-item.nav-has-badge { position: relative !important; }
            .nav-badge {
                position: absolute !important;
                top: 50% !important;
                right: 14px !important;
                transform: translateY(-50%) !important;
                width: 9px !important;
                height: 9px !important;
                border-radius: 50% !important;
                background: #EF4444 !important;
                box-shadow: 0 0 0 2px var(--bg-secondary, #1E293B) !important;
                display: none !important;
                pointer-events: none !important;
                z-index: 10 !important;
                animation: navBadgePulse 2s ease-in-out infinite !important;
            }
            .nav-badge.visible { display: block !important; }
            @keyframes navBadgePulse {
                0%, 100% { opacity: 1;   }
                50%      { opacity: 0.55; }
            }
        `;
        document.head.appendChild(st);
    }

    // ---------- Token ----------
    function getToken() {
        try { return localStorage.getItem("token"); } catch (e) { return null; }
    }

    // ---------- Find or create badge on a nav item ----------
    function ensureBadgeFor(hrefFragment) {
        const links = document.querySelectorAll(
            "aside.sidebar .nav-item, .sidebar .nav-item, aside .nav-item, .mobile-sidebar .nav-item, .mobile-menu .nav-item, nav .nav-item"
        );
        for (const link of links) {
            const href = link.getAttribute("href") || "";
            if (href.indexOf(hrefFragment) !== -1) {
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
        dot.classList.toggle("visible", !!visible);
    }

    // ---------- Raw fetch ----------
    async function fetchJson(url) {
        const token = getToken();
        const headers = { "Accept": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;
        const res = await fetch(url, { headers, cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
    }

    async function getUnreadNotifications() {
        try {
            const d = await fetchJson("/api/notifications/unread-count");
            return d && d.success ? Number(d.count || 0) : 0;
        } catch (e) {
            console.warn("[SidebarBadges] notifications fetch failed:", e.message);
            return 0;
        }
    }

    async function getUnreadMessages() {
        try {
            const d = await fetchJson("/api/messages/stats");
            return d && d.success && d.stats ? Number(d.stats.unread || 0) : 0;
        } catch (e) {
            console.warn("[SidebarBadges] messages fetch failed:", e.message);
            return 0;
        }
    }

    // ---------- Refresh ----------
    async function refresh() {
        const notifDot = ensureBadgeFor("notifications.html");
        const msgDot   = ensureBadgeFor("messages.html");

        if (!notifDot && !msgDot) {
            console.warn("[SidebarBadges] no matching nav items found");
            return;
        }

        if (notifDot) {
            const n = await getUnreadNotifications();
            setDot(notifDot, n > 0);
            console.log("[SidebarBadges] notifications unread =", n, "→ dot", n > 0 ? "ON" : "OFF");
        }
        if (msgDot) {
            const m = await getUnreadMessages();
            setDot(msgDot, m > 0);
            console.log("[SidebarBadges] messages unread =", m, "→ dot", m > 0 ? "ON" : "OFF");
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

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 200); });
    } else {
        setTimeout(start, 200);
    }
    window.addEventListener("load", function () { setTimeout(refresh, 400); });

    window.__crevioRefreshBadges = refresh;
    console.log("[SidebarBadges] installed");
})();