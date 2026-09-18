// ============================================================
// CREVIO — LOADER HELPER
// File: dashboard/js/loader.js
// Provides CrevioLoader.html(), .inline(), .show(), .replace()
// ============================================================
(function () {
    if (window.CrevioLoader) return;

    // ---- HTML builder ----
    function html(size) {
        const sizeCls = size === "sm" ? " sm" : size === "lg" ? " lg" : (size === "xl" ? " xl" : (size === "xxl" ? " xxl" : ""));
        const svg =
            '<svg class="crevio-i-svg" viewBox="0 0 16 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
                '<circle class="crevio-dot-ring" cx="8" cy="11" r="6"/>' +
                '<circle class="crevio-dot"      cx="8" cy="11" r="6"/>' +
                '<path class="crevio-i-bar" d="M 16 24 L 5 24 Q 0 24 0 32 L 0 84 L 16 84 Z"/>' +
            '</svg>';

        return '<span class="crevio-loader' + sizeCls + '" role="status" aria-label="Loading">' +
               '<span class="crevio-loader-word">' +
               '<span>C</span>' +
               '<span>r</span>' +
               '<span>e</span>' +
               '<span>v</span>' +
               '<span class="crevio-i-wrap">' + svg + '</span>' +
               '<span>o</span>' +
               '</span>' +
               '</span>';
    }

    // ---- Inline (button) ----
    function inline() {
        return '<span class="crevio-inline-loader" aria-hidden="true"></span>';
    }

    // ---- Wrap in centered block ----
    function wrap(content, opts) {
        opts = opts || {};
        const cls = "crevio-loader-wrap" + (opts.fullscreen ? " fullscreen" : "");
        const style = opts.minHeight ? ` style="min-height:${opts.minHeight}"` : "";
        return '<div class="' + cls + '"' + style + '>' + (content || html(opts.size)) + '</div>';
    }

    // ---- Set into element ----
    function show(el, opts) {
        if (!el) return;
        if (typeof el === "string") el = document.querySelector(el);
        if (!el) return;
        el.innerHTML = wrap(html((opts && opts.size) || "md"), opts);
    }

    // ---- Hide (remove contents) ----
    function hide(el) {
        if (!el) return;
        if (typeof el === "string") el = document.querySelector(el);
        if (!el) return;
        el.innerHTML = "";
    }

    // ---- Skeleton lines ----
    function skeletonLines(count) {
        count = Math.max(1, count || 3);
        let out = '<div class="crevio-skeleton-stack">';
        for (let i = 0; i < count; i++) {
            const w = i === count - 1 ? "medium" : "long";
            out += '<div class="crevio-skeleton line ' + w + '"></div>';
        }
        out += '</div>';
        return out;
    }

    // ---- Public API ----
    window.CrevioLoader = {
        html: html,
        inline: inline,
        wrap: wrap,
        show: show,
        hide: hide,
        skeletonLines: skeletonLines,

        // Convenience: replace any element with a loader for X ms (demo/debug)
        demo: function (el, ms) {
            const target = typeof el === "string" ? document.querySelector(el) : el;
            if (!target) return;
            const original = target.innerHTML;
            show(target);
            setTimeout(() => { target.innerHTML = original; }, ms || 2000);
        }
    };

    // ---- Auto-scan: any element with [data-loader] becomes a loader on init ----
    function autoScan() {
        document.querySelectorAll("[data-loader]").forEach(function (el) {
            const size = el.getAttribute("data-loader") || "md";
            show(el, { size: size });
        });

        // Any element with [data-skeleton] gets N skeleton lines
        document.querySelectorAll("[data-skeleton]").forEach(function (el) {
            const n = parseInt(el.getAttribute("data-skeleton"), 10) || 3;
            el.innerHTML = skeletonLines(n);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoScan);
    } else {
        autoScan();
    }

    // Also scan after dynamic insertions
    if (window.MutationObserver) {
        let t;
        new MutationObserver(function () {
            clearTimeout(t);
            t = setTimeout(autoScan, 200);
        }).observe(document.documentElement, { childList: true, subtree: true });
    }
})();