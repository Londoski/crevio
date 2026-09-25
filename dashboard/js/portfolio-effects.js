// =========================================================
// CREVIO — PORTFOLIO EFFECTS
// File: dashboard/js/portfolio-effects.js
// =========================================================
// Runs on every rendered public portfolio page.
// Effects are enabled server-side (payload) via data attributes
// baked into the HTML. This script only animates whatever the
// server decided to mark.
//
// Progressive enhancement: if JS fails to load, content stays
// fully visible because we only hide [data-fade] when we can
// run the observer (see js-enabled guard in the template CSS).
//
// Behavior: elements fade in every time they enter the viewport.
// When they fully leave, the visible class is removed so the fade
// replays on re-entry. Reduced-motion users get static content.
// =========================================================
(function () {
    if (window.__crevioEffectsInstalled) return;
    window.__crevioEffectsInstalled = true;

    // Signal to CSS that JS is available — reveals the "hidden until
    // animated" state. Without this class, [data-fade] elements are
    // fully visible by default.
    document.documentElement.classList.add("crevio-js-enabled");

    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setupFadeIn() {
        var targets = document.querySelectorAll("[data-fade]");
        if (!targets.length) return;

        // Reduced motion OR no IntersectionObserver support:
        // reveal everything immediately, no animation.
        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach(function (el) {
                el.classList.add("crevio-fade-visible");
            });
            return;
        }

        // Toggle visible class based on intersection.
        //   In viewport  → add class    (fade up)
        //   Out of view  → remove class (reset so it replays next time)
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("crevio-fade-visible");
                } else {
                    entry.target.classList.remove("crevio-fade-visible");
                }
            });
        }, { threshold: 0.05 });

        targets.forEach(function (el) { io.observe(el); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupFadeIn);
    } else {
        setupFadeIn();
    }
})();