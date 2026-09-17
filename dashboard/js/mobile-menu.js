// =========================================================
// CREVIO — MOBILE MENU (shared)
// File: dashboard/js/mobile-menu.js
// Auto-installs a hamburger button + slide-in sidebar drawer
// on every page that has a .sidebar element (mobile only).
// =========================================================
(function () {
    if (window.__crevioMobileMenu) return;
    window.__crevioMobileMenu = true;

    const MQ = "(max-width: 768px)";
    const isMobile = () => window.matchMedia(MQ).matches;

    // -------- CSS --------
    function injectCSS() {
        if (document.getElementById("__crevioMobileMenuStyles")) return;
        const style = document.createElement("style");
        style.id = "__crevioMobileMenuStyles";
        style.textContent = `
            .mobile-menu-btn {
                display: none;
                background: transparent;
                border: 1px solid var(--border-color, #334155);
                color: var(--text-primary, #F1F5F9);
                width: 40px; height: 40px;
                border-radius: 8px;
                cursor: pointer;
                align-items: center; justify-content: center;
                padding: 0;
                flex-shrink: 0;
                transition: background 0.12s, border-color 0.12s, color 0.12s;
            }
            .mobile-menu-btn:active,
            .mobile-menu-btn:hover {
                background: var(--accent-dim, rgba(37,99,235,0.15));
                border-color: var(--accent, #2563EB);
                color: var(--accent, #2563EB);
            }
            .mobile-menu-btn svg { width: 20px; height: 20px; }

            .mobile-menu-overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.55);
                backdrop-filter: blur(2px);
                -webkit-backdrop-filter: blur(2px);
                z-index: 950;
                opacity: 0; visibility: hidden;
                transition: opacity 0.18s ease, visibility 0.18s ease;
            }
            .mobile-menu-overlay.open { opacity: 1; visibility: visible; }

            @media ${MQ} {
                .mobile-menu-btn { display: flex; }

                body.mobile-menu-installed .sidebar {
                    display: flex !important;
                    position: fixed !important;
                    top: 0; left: 0;
                    height: 100vh !important;
                    width: 260px !important;
                    max-width: 82vw;
                    z-index: 1000 !important;
                    transform: translateX(-100%);
                    transition: transform 0.22s ease;
                    overflow-y: auto;
                    box-shadow: 8px 0 32px rgba(0,0,0,0.45);
                }
                body.mobile-menu-installed .sidebar.mobile-open {
                    transform: translateX(0);
                }
                body.mobile-menu-open { overflow: hidden; }
            }
        `;
        document.head.appendChild(style);
    }

    // -------- hamburger icon --------
    function hamburgerSVG() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    }

    // -------- install --------
    function install() {
        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return;   // page has no sidebar — nothing to do

        document.body.classList.add("mobile-menu-installed");

        // Already installed?
        if (document.querySelector(".mobile-menu-btn")) return;

        // Find the best slot for the hamburger
        const slotSelectors = [
            ".conv-header",        // messages page — conversation list
            ".chat-header-left",   // bot page + messages chat panel
            ".header",             // settings page
            ".topbar",             // generic
            ".page-header",
            ".main > header",
            ".main > .header"
        ];
        let slot = null;
        for (const sel of slotSelectors) {
            const el = document.querySelector(sel);
            if (el) { slot = el; break; }
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mobile-menu-btn";
        btn.id = "mobileMenuBtn";
        btn.setAttribute("aria-label", "Open menu");
        btn.setAttribute("title", "Menu");
        btn.innerHTML = hamburgerSVG();

        if (slot) {
            slot.insertBefore(btn, slot.firstChild);
        } else {
            // Floating fallback (top-left of the viewport)
            btn.style.position = "fixed";
            btn.style.top = "16px";
            btn.style.left = "16px";
            btn.style.zIndex = "9998";
            document.body.appendChild(btn);
        }

        // Overlay
        const overlay = document.createElement("div");
        overlay.className = "mobile-menu-overlay";
        overlay.id = "mobileMenuOverlay";
        document.body.appendChild(overlay);

        // -------- open / close --------
        function open() {
            sidebar.classList.add("mobile-open");
            overlay.classList.add("open");
            document.body.classList.add("mobile-menu-open");
        }
        function close() {
            sidebar.classList.remove("mobile-open");
            overlay.classList.remove("open");
            document.body.classList.remove("mobile-menu-open");
        }
        function toggle() {
            if (sidebar.classList.contains("mobile-open")) close();
            else open();
        }

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggle();
        });
        overlay.addEventListener("click", close);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
        });

        // Close on nav link tap (so the drawer slides away while the page navigates)
        sidebar.querySelectorAll("a").forEach(a => {
            a.addEventListener("click", () => setTimeout(close, 80));
        });

        // Auto-close if the viewport grows past mobile (e.g. rotation to tablet)
        window.addEventListener("resize", () => {
            if (!isMobile()) close();
        });

        // Touch: prevent scroll bleed
        overlay.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    }

    // -------- run --------
    function start() {
        injectCSS();
        install();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    // Reinstall if the DOM changed (e.g. SPA-like nav)
    if (window.MutationObserver) {
        new MutationObserver(() => {
            clearTimeout(window.__crevioMobMenuT);
            window.__crevioMobMenuT = setTimeout(() => {
                injectCSS();
                if (!document.querySelector(".mobile-menu-btn")) install();
            }, 250);
        }).observe(document.body, { childList: true, subtree: false });
    }
})();