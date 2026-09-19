// =========================================================
// CREVIO — MOBILE MENU (shared)
// File: dashboard/js/mobile-menu.js
// Floating hamburger hides when drawer opens (uses ID
// specificity to beat mobile.css). No close X — tap outside
// or a nav link closes. Body scroll locked while open.
// =========================================================
(function () {
    if (window.__crevioMobileMenu) return;
    window.__crevioMobileMenu = true;

    const MQ = "(max-width: 768px)";
    const isMobile = () => window.matchMedia(MQ).matches;

    function injectCSS() {
        if (document.getElementById("__crevioMobileMenuStyles")) return;
        const style = document.createElement("style");
        style.id = "__crevioMobileMenuStyles";
        style.textContent = `
            .mobile-menu-btn {
                display: none;
                background: var(--bg-card, #1E293B);
                border: 1px solid var(--border-color, #334155);
                color: var(--text-primary, #F1F5F9);
                width: 40px; height: 40px;
                border-radius: 10px;
                cursor: pointer;
                align-items: center; justify-content: center;
                padding: 0;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                transition: background 0.12s, border-color 0.12s, color 0.12s;
            }
            @media (hover: hover) {
                .mobile-menu-btn:hover {
                    background: var(--bg-input, #0F172A);
                    border-color: var(--accent, #2563EB);
                    color: var(--accent, #2563EB);
                }
            }
            .mobile-menu-btn:active {
                background: var(--bg-input, #0F172A);
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
                touch-action: none;
            }
            .mobile-menu-overlay.open { opacity: 1; visibility: visible; }

            @media ${MQ} {
                .mobile-menu-btn { display: flex; }

                body.mobile-menu-installed .sidebar {
                    display: flex !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                    width: 260px !important;
                    max-width: 82vw;
                    z-index: 1000 !important;
                    transform: translateX(-100%);
                    transition: transform 0.22s ease;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    -webkit-overflow-scrolling: touch;
                    touch-action: pan-y;
                    box-shadow: 8px 0 32px rgba(0,0,0,0.45);
                }
                body.mobile-menu-installed .sidebar.mobile-open {
                    transform: translateX(0);
                }

                /* Body lock while drawer is open */
                body.mobile-menu-open {
                    overflow: hidden !important;
                    position: fixed !important;
                    width: 100% !important;
                    touch-action: none;
                }

                /* HIDE THE HAMBURGER — high specificity to beat mobile.css */
                body.mobile-menu-open #mobileMenuBtn.mobile-menu-btn {
                    display: none !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function hamburgerSVG() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    }

    function install() {
        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return;

        document.body.classList.add("mobile-menu-installed");

        if (document.querySelector(".mobile-menu-btn")) return;

        const slotSelectors = [
            ".conv-header",
            ".chat-header-left",
            ".header",
            ".topbar",
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
            btn.style.position = "fixed";
            btn.style.top = "16px";
            btn.style.left = "16px";
            btn.style.zIndex = "9998";
            document.body.appendChild(btn);
        }

        const overlay = document.createElement("div");
        overlay.className = "mobile-menu-overlay";
        overlay.id = "mobileMenuOverlay";
        document.body.appendChild(overlay);

        let __savedScrollY = 0;

        function open() {
            __savedScrollY = window.scrollY || window.pageYOffset || 0;
            document.body.style.top = -__savedScrollY + "px";
            sidebar.classList.add("mobile-open");
            overlay.classList.add("open");
            document.body.classList.add("mobile-menu-open");
        }
        function close() {
            sidebar.classList.remove("mobile-open");
            overlay.classList.remove("open");
            document.body.classList.remove("mobile-menu-open");
            document.body.style.top = "";
            window.scrollTo(0, __savedScrollY);
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

        sidebar.querySelectorAll("a").forEach(a => {
            a.addEventListener("click", () => setTimeout(close, 80));
        });

        window.addEventListener("resize", () => {
            if (!isMobile()) close();
        });

        overlay.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    }

    function start() {
        injectCSS();
        install();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

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