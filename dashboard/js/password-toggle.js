// =========================================================
// CREVIO — PASSWORD VISIBILITY TOGGLE (shared)
// File: dashboard/js/password-toggle.js
// Auto-adds an eye icon to every <input type="password">.
// Include this script on any page with password inputs.
// =========================================================
(function () {
    if (window.__crevioPwdToggleInstalled) return;
    window.__crevioPwdToggleInstalled = true;

    function makeIcon(name) {
        if (typeof lucide !== "undefined") {
            const el = document.createElement("i");
            el.setAttribute("data-lucide", name);
            el.style.width = "16px";
            el.style.height = "16px";
            el.style.display = "inline-block";
            return el;
        }
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.style.width = "16px";
        svg.style.height = "16px";
        if (name === "eye") {
            svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        } else {
            svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
        }
        return svg;
    }

    function refreshIcons() {
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    function wrap(input) {
        if (!input || input.dataset.pwdWrapped === "1") return;
        if (input.type !== "password") return;

        // Already wrapped?
        if (input.parentElement && input.parentElement.classList.contains("pwd-toggle-wrap")) {
            input.dataset.pwdWrapped = "1";
            return;
        }

        // Skip if this is inside our modal-hidden wrappers etc — safety
        input.dataset.pwdWrapped = "1";

        const wrapEl = document.createElement("div");
        wrapEl.className = "pwd-toggle-wrap";

        // Insert wrapper in place of input
        input.parentNode.insertBefore(wrapEl, input);
        wrapEl.appendChild(input);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pwd-toggle-btn";
        btn.setAttribute("aria-label", "Show password");
        btn.setAttribute("title", "Show password");
        btn.appendChild(makeIcon("eye"));
        wrapEl.appendChild(btn);

        // inline fallback styles so page doesn't need CSS
        wrapEl.style.position = "relative";
        wrapEl.style.display = "block";
        wrapEl.style.width = "100%";
        input.style.paddingRight = "44px";
        btn.style.position = "absolute";
        btn.style.right = "10px";
        btn.style.top = "50%";
        btn.style.transform = "translateY(-50%)";
        btn.style.background = "transparent";
        btn.style.border = "none";
        btn.style.color = "var(--text-muted, #64748B)";
        btn.style.width = "32px";
        btn.style.height = "32px";
        btn.style.borderRadius = "6px";
        btn.style.cursor = "pointer";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.padding = "0";
        btn.style.zIndex = "5";
        btn.style.transition = "background 0.12s, color 0.12s";

        btn.addEventListener("mouseenter", () => {
            btn.style.background = "rgba(148,163,184,0.15)";
            btn.style.color = "var(--text-primary, #F1F5F9)";
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.background = "transparent";
            btn.style.color = "var(--text-muted, #64748B)";
        });

        refreshIcons();

        let visible = false;
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            visible = !visible;
            input.type = visible ? "text" : "password";
            btn.innerHTML = "";
            btn.appendChild(makeIcon(visible ? "eye-off" : "eye"));
            btn.setAttribute("aria-label", visible ? "Hide password" : "Show password");
            btn.setAttribute("title", visible ? "Hide password" : "Show password");
            refreshIcons();
            input.focus();
            try { input.setSelectionRange(input.value.length, input.value.length); } catch (err) {}
        });
    }

    function scan() {
        document.querySelectorAll('input[type="password"]').forEach(wrap);
    }

    // Run on DOM ready and after any DOM change (modals, dynamic forms)
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => setTimeout(scan, 100));
    } else {
        setTimeout(scan, 100);
    }

    if (window.MutationObserver) {
        new MutationObserver(() => {
            clearTimeout(window.__pwdScanT);
            window.__pwdScanT = setTimeout(scan, 200);
        }).observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("load", () => setTimeout(scan, 300));
})();