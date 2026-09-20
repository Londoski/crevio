// =========================================================
// CREVIO — THEME TOGGLE
// File: dashboard/js/theme.js
// Global theme switcher — dark / light / system
// =========================================================

(function () {
    "use strict";

    const STORAGE_KEY = "crevio_theme";
    const DEFAULT_THEME = "light";

    // ---------- APPLY THEME ----------
    function applyTheme(theme) {
        const actualTheme = theme === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : theme;

        document.documentElement.setAttribute("data-theme", actualTheme);

        // Update body background immediately (avoids flash)
        if (document.body) {
            document.body.style.background = actualTheme === "dark" ? "#0F172A" : "#F1F5F9";
        }

        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            console.warn("Could not save theme:", e.message);
        }

        updateToggleIcon(theme);
    }

    // ---------- UPDATE TOGGLE ICON ----------
    function updateToggleIcon(theme) {
        const btn = document.getElementById("themeToggleBtn");
        if (!btn) return;

        const icon = btn.querySelector(".icon");
        if (!icon) return;

        const actualTheme = theme === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : theme;

        icon.setAttribute("data-lucide", actualTheme === "dark" ? "moon" : "sun");

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    // ---------- TOGGLE ----------
    function toggleTheme() {
        let current;
        try {
            current = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
        } catch (e) {
            current = DEFAULT_THEME;
        }

        const next = current === "dark"
            ? "light"
            : current === "light"
                ? "system"
                : "dark";

        applyTheme(next);
    }

    // ---------- LISTEN FOR SYSTEM CHANGES ----------
    if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            let saved;
            try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
            if (saved === "system") applyTheme("system");
        };

        if (mq.addEventListener)        mq.addEventListener("change", handler);
        else if (mq.addListener)        mq.addListener(handler);
    }

    // ---------- EXPOSE GLOBALLY ----------
    window.toggleTheme = toggleTheme;
    window.applyTheme  = applyTheme;

    // ---------- INIT ON DOM READY ----------
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    function init() {
        let saved;
        try {
            saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
        } catch (e) {
            saved = DEFAULT_THEME;
        }

        applyTheme(saved);

        // Wire up the button (in addition to inline onclick, if present)
        const btn = document.getElementById("themeToggleBtn");
        if (btn && !btn.dataset.themeWired) {
            btn.dataset.themeWired = "1";
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                toggleTheme();
            });
        }
    }
})();