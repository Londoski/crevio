// =========================================================
// CREVIO CONFIRM DIALOG
// File: dashboard/js/crevio-confirm.js
// Global: window.crevioConfirm(message, opts) -> Promise<boolean>
// =========================================================
(function () {
    if (window.__crevioConfirmInstalled) return;
    window.__crevioConfirmInstalled = true;
    console.log("[Crevio Confirm] installed");

    function refreshIcons() {
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    window.crevioConfirm = function (message, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            var overlay = document.getElementById("crevioConfirmOverlay");
            var iconEl  = document.getElementById("crevioConfirmIcon");
            var titleEl = document.getElementById("crevioConfirmTitle");
            var msgEl   = document.getElementById("crevioConfirmMessage");
            var okBtn   = document.getElementById("crevioConfirmOk");
            var cancel  = document.getElementById("crevioConfirmCancel");

            if (!overlay || !okBtn || !cancel) {
                resolve(window.confirm(message));
                return;
            }

            titleEl.textContent = opts.title || "Are you sure?";
            msgEl.textContent   = message || "";
            okBtn.textContent   = opts.confirmText || "Confirm";
            cancel.textContent  = opts.cancelText  || "Cancel";

            iconEl.classList.remove("info");
            var iconSvg = iconEl.querySelector("i, svg");
            if (opts.info) {
                iconEl.classList.add("info");
                if (iconSvg) iconSvg.outerHTML = '<i data-lucide="info" class="icon"></i>';
            } else {
                if (iconSvg) iconSvg.outerHTML = '<i data-lucide="alert-triangle" class="icon"></i>';
            }

            okBtn.className = "crevio-confirm-btn " + (opts.danger === false ? "confirm" : "danger");
            refreshIcons();
            overlay.classList.add("open");

            function close(result) {
                overlay.classList.remove("open");
                okBtn.removeEventListener("click", onOk);
                cancel.removeEventListener("click", onCancel);
                overlay.removeEventListener("click", onOverlay);
                document.removeEventListener("keydown", onKey);
                resolve(result);
            }
            function onOk()       { close(true); }
            function onCancel()   { close(false); }
            function onOverlay(e) { if (e.target === overlay) close(false); }
            function onKey(e)     {
                if (e.key === "Escape") close(false);
                if (e.key === "Enter")  close(true);
            }

            okBtn.addEventListener("click", onOk);
            cancel.addEventListener("click", onCancel);
            overlay.addEventListener("click", onOverlay);
            document.addEventListener("keydown", onKey);
        });
    };
})();