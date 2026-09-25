// =========================================================
// CREVIO — PORTFOLIO EFFECTS
// File: dashboard/js/portfolio-effects.js
// =========================================================
// Runs on every rendered public portfolio page.
// Effects are enabled server-side (payload) via data attributes
// baked into the HTML. This script only *animates* whatever the
// server decided to mark.
//
// Progressive enhancement: if JS fails to load, content stays
// fully visible because we only hide [data-fade] when we can
// run the observer (see js-enabled guard in CSS).
// =========================================================
(function () {
    if (window.__crevioEffectsInstalled) return;
    window.__crevioEffectsInstalled = true;

    // Signal to CSS that JS is available — reveals the "hidden until
    // animated" state. Without this class, [data-fade] elements are
    // fully visible by default.
    document.documentElement.classList.add("crevio-js-enabled");

    // Respect users who've set prefers-reduced-motion
    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- Fade-in on scroll ----------
    function setupFadeIn() {
        var targets = document.querySelectorAll("[data-fade]");
        if (!targets.length) return;

        // Reduced motion OR no IntersectionObserver: reveal immediately
        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach(function (el) { el.classList.add("crevio-fade-visible"); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("crevio-fade-visible");
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -60px 0px", threshold: 0.05 });

        targets.forEach(function (el) { io.observe(el); });

        // Safety net: reveal anything still hidden after 3 seconds.
        // Guards against a misbehaving observer, a parent with
        // `display:none`, or an element that never scrolls into view
        // (e.g. very short pages).
        setTimeout(function () {
            document.querySelectorAll("[data-fade]:not(.crevio-fade-visible)").forEach(function (el) {
                var rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight) {
                    el.classList.add("crevio-fade-visible");
                }
            });
        }, 3000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupFadeIn);
    } else {
        setupFadeIn();
    }
})();