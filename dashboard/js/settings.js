// =========================================================
// CREVIO — SETTINGS PAGE
// File: dashboard/js/settings.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const toast    = $("toast");
    const saveBtn  = $("saveBtn");
    const resetBtn = $("resetBtn");

    const STORAGE_KEY = "crevio_settings";

    const DEFAULTS = {
        theme:          "dark",
        language:       "en",
        timezone:       "Africa/Lagos",
        notifEmail:     true,
        notifMessages:  true,
        notifOrders:    true,
        notifMarketing: false
    };

    // =========================================================
    // LOAD
    // =========================================================
    function load() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        } catch (e) { saved = {}; }

        const settings = { ...DEFAULTS, ...saved };

        // Theme — check multiple sources
        const themeFromLocal = localStorage.getItem("crevio_theme");
        const theme = themeFromLocal || settings.theme || "dark";

        applyTheme(theme);
        document.querySelectorAll("[data-theme-choice]").forEach(el => {
            el.classList.toggle("active", el.dataset.themeChoice === theme);
        });

        // Toggles
        if ($("notifEmail"))     $("notifEmail").checked     = !!settings.notifEmail;
        if ($("notifMessages"))  $("notifMessages").checked  = !!settings.notifMessages;
        if ($("notifOrders"))    $("notifOrders").checked    = !!settings.notifOrders;
        if ($("notifMarketing")) $("notifMarketing").checked = !!settings.notifMarketing;

        // Selects
        if ($("language")) $("language").value = settings.language;
        if ($("timezone")) $("timezone").value = settings.timezone;
    }

    // =========================================================
    // APPLY THEME
    // =========================================================
    function applyTheme(theme) {
        const actualTheme = theme === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : theme;

        document.documentElement.setAttribute("data-theme", actualTheme);

        if (document.body) {
            document.body.style.background = actualTheme === "dark" ? "#0F172A" : "#F1F5F9";
        }

        try {
            localStorage.setItem("crevio_theme", theme);
        } catch (e) {}
    }

    // =========================================================
    // SAVE
    // =========================================================
    function save() {
        const currentTheme = (() => {
            const active = document.querySelector("[data-theme-choice].active");
            return active ? active.dataset.themeChoice : (localStorage.getItem("crevio_theme") || "dark");
        })();

        const settings = {
            theme:          currentTheme,
            language:       $("language")?.value || "en",
            timezone:       $("timezone")?.value || "Africa/Lagos",
            notifEmail:     $("notifEmail")?.checked ?? true,
            notifMessages:  $("notifMessages")?.checked ?? true,
            notifOrders:    $("notifOrders")?.checked ?? true,
            notifMarketing: $("notifMarketing")?.checked ?? false
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            localStorage.setItem("crevio_theme", settings.theme);
            showToast("Settings saved");
        } catch (e) {
            showToast("Could not save: " + e.message, true);
        }
    }

    saveBtn?.addEventListener("click", save);

    // =========================================================
    // THEME PICKER
    // =========================================================
    document.querySelectorAll("[data-theme-choice]").forEach(el => {
        el.addEventListener("click", () => {
            const theme = el.dataset.themeChoice;
            document.querySelectorAll("[data-theme-choice]").forEach(t => t.classList.remove("active"));
            el.classList.add("active");

            applyTheme(theme);
            save();
        });
    });

    // =========================================================
    // AUTO-SAVE ON TOGGLE / SELECT CHANGE
    // =========================================================
    ["notifEmail", "notifMessages", "notifOrders", "notifMarketing"].forEach(id => {
        $(id)?.addEventListener("change", save);
    });

    ["language", "timezone"].forEach(id => {
        $(id)?.addEventListener("change", save);
    });

    // =========================================================
    // RESET
    // =========================================================
    resetBtn?.addEventListener("click", () => {
        if (!confirm("Reset all settings to default?")) return;

        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem("crevio_theme");
        } catch (e) {}

        applyTheme(DEFAULTS.theme);

        // Reset toggles
        if ($("notifEmail"))     $("notifEmail").checked     = DEFAULTS.notifEmail;
        if ($("notifMessages"))  $("notifMessages").checked  = DEFAULTS.notifMessages;
        if ($("notifOrders"))    $("notifOrders").checked    = DEFAULTS.notifOrders;
        if ($("notifMarketing")) $("notifMarketing").checked = DEFAULTS.notifMarketing;

        // Reset selects
        if ($("language")) $("language").value = DEFAULTS.language;
        if ($("timezone")) $("timezone").value = DEFAULTS.timezone;

        // Reset theme picker
        document.querySelectorAll("[data-theme-choice]").forEach(el => {
            el.classList.toggle("active", el.dataset.themeChoice === DEFAULTS.theme);
        });

        showToast("Settings reset to defaults");
    });

    // =========================================================
    // LISTEN FOR SYSTEM THEME CHANGES
    // =========================================================
    if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            const active = document.querySelector("[data-theme-choice].active");
            if (active?.dataset.themeChoice === "system") {
                applyTheme("system");
            }
        };
        if (mq.addEventListener) mq.addEventListener("change", handler);
        else if (mq.addListener) mq.addListener(handler);
    }

    // =========================================================
    // HELPERS
    // =========================================================
    let toastTimer;
    function showToast(msg, isError = false) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // =========================================================
    // INIT
    // =========================================================
    // =========================================================
    // ACCOUNT CREDENTIALS — Email & Password
    // =========================================================
    function initCredentialsSection() {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            const label = $("currentEmailLabel");
            if (label && user && user.email) label.textContent = user.email;
            else if (label) label.textContent = "Not available";
        } catch (e) {}

        function openModal(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.add("open");
            const firstInput = el.querySelector("input");
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }

        $("changeEmailBtn")?.addEventListener("click", () => {
            const e1 = $("newEmail"); if (e1) e1.value = "";
            const e2 = $("emailCurrentPassword"); if (e2) e2.value = "";
            document.querySelectorAll("#emailForm .field-error").forEach(e => { e.classList.remove("show"); e.textContent = ""; });
            openModal("emailModal");
        });

        $("changePasswordBtn")?.addEventListener("click", () => {
            ["currentPassword","newPassword","confirmPassword"].forEach(id => { const el = $(id); if (el) el.value = ""; });
            document.querySelectorAll("#passwordForm .field-error").forEach(e => { e.classList.remove("show"); e.textContent = ""; });
            openModal("passwordModal");
        });

        document.querySelectorAll("[data-close-modal]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const modal = e.target.closest(".modal-overlay");
                if (modal) modal.classList.remove("open");
            });
        });

        document.querySelectorAll(".modal-overlay").forEach(overlay => {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) overlay.classList.remove("open");
            });
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open"));
            }
        });

        function setErr(fieldId, message) {
            const el = $(fieldId);
            if (!el) return;
            if (message) { el.textContent = message; el.classList.add("show"); }
            else { el.textContent = ""; el.classList.remove("show"); }
        }
        function clearFormErrors(formId) {
            document.querySelectorAll("#" + formId + " .field-error").forEach(e => { e.classList.remove("show"); e.textContent = ""; });
        }

        // ---- CHANGE EMAIL ----
        $("emailForm")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFormErrors("emailForm");

            const newEmail = $("newEmail").value.trim();
            const currentPassword = $("emailCurrentPassword").value;
            const btn = $("emailSubmitBtn");

            if (!newEmail)        { setErr("newEmailErr", "Email is required"); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setErr("newEmailErr", "Enter a valid email"); return; }
            if (!currentPassword) { setErr("emailCurrentPasswordErr", "Password is required"); return; }

            const original = btn.textContent;
            btn.disabled = true; btn.textContent = "Saving…";
            try {
                const res = await window.apiFetch("/api/auth/email", {
                    method: "PATCH",
                    body: JSON.stringify({ newEmail, currentPassword })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Failed");

                try {
                    const u = JSON.parse(localStorage.getItem("user") || "{}");
                    u.email = data.email || newEmail;
                    localStorage.setItem("user", JSON.stringify(u));
                } catch (e) {}

                showToast("Email updated — signing you out…");
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/admin/pages/login.html";
                }, 1500);
            } catch (err) {
                const msg = err.message || "Failed";
                if (/current password/i.test(msg))   setErr("emailCurrentPasswordErr", msg);
                else if (/in use|exists/i.test(msg)) setErr("newEmailErr", msg);
                else                                  showToast(msg, true);
                btn.disabled = false; btn.textContent = original;
            }
        });

        // ---- CHANGE PASSWORD ----
        $("passwordForm")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFormErrors("passwordForm");

            const currentPassword = $("currentPassword").value;
            const newPassword     = $("newPassword").value;
            const confirmPassword = $("confirmPassword").value;
            const btn = $("passwordSubmitBtn");

            if (!currentPassword) { setErr("currentPasswordErr", "Current password required"); return; }
            if (!newPassword)     { setErr("newPasswordErr", "New password required"); return; }
            if (newPassword.length < 8) { setErr("newPasswordErr", "At least 8 characters"); return; }
            if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { setErr("newPasswordErr", "Must contain letters and numbers"); return; }
            if (newPassword !== confirmPassword) { setErr("confirmPasswordErr", "Passwords do not match"); return; }
            if (newPassword === currentPassword) { setErr("newPasswordErr", "New password must be different"); return; }

            const original = btn.textContent;
            btn.disabled = true; btn.textContent = "Saving…";
            try {
                const res = await window.apiFetch("/api/auth/password", {
                    method: "PATCH",
                    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || "Failed");

                showToast("Password updated — signing you out…");
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/admin/pages/login.html";
                }, 1500);
            } catch (err) {
                const msg = err.message || "Failed";
                if (/current password/i.test(msg))           setErr("currentPasswordErr", msg);
                else if (/letters|numbers|8 char/i.test(msg)) setErr("newPasswordErr", msg);
                else                                          showToast(msg, true);
                btn.disabled = false; btn.textContent = original;
            }
        });
    }
    load();
    initCredentialsSection();
});