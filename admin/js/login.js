document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const remember = document.getElementById("rememberDevice") ? document.getElementById("rememberDevice").checked : true;

        if (!email || !password) return crevioAlert("Please enter email and password.", { kind: "warning" });

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, rememberDevice: remember })
            });

            const data = await response.json();
            console.log("Login response:", data);

            if (data.success && data.requires_2fa && data.ticket) {
                // __2fa_routing_patched
                if (typeof window.__show2FAStep === "function") {
                    window.__show2FAStep(data.ticket, remember, data.method);
                } else {
                    crevioAlert("2FA step not available. Please reload.", { kind: "error" });
                }
            } else if (data.success && data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                console.log("Token saved, redirecting...");
                window.location.href = "/dashboard/";
            } else {
                crevioAlert(data.message || "Login failed.", { kind: "error" });
            }
        } catch (err) {
            console.error("Login error:", err);
            crevioAlert("Server error. Please try again.", { kind: "error" });
        }
    });
});

    // =========================================================
    // Device trust check — hide "Remember this device" when
    // the current browser is already trusted for this email.
    // =========================================================
    (function () {
        if (window.__trustCheckWired) return;
        window.__trustCheckWired = true;

        const emailInput  = document.getElementById("email");
        const rememberGroup = document.getElementById("__rememberGroup");
        const trustNote   = document.getElementById("__trustNote");
        const trustText   = document.getElementById("__trustNoteText");
        if (!emailInput || !rememberGroup || !trustNote) return;

        let lastChecked = "";
        let checkTimer = null;

        async function checkTrust() {
            const email = (emailInput.value || "").trim().toLowerCase();
            if (!email || email === lastChecked) return;
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
            lastChecked = email;

            try {
                const res = await fetch("/api/auth/device-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email })
                });
                const data = await res.json();
                if (data && data.trusted) {
                    rememberGroup.style.display = "none";
                    trustNote.style.display = "flex";
                    if (trustText) trustText.textContent = "This device is trusted as " + (data.deviceName || "your device") + ".";
                } else {
                    rememberGroup.style.display = "";
                    trustNote.style.display = "none";
                }
            } catch (e) { /* silent */ }
        }

        emailInput.addEventListener("blur", checkTrust);
        emailInput.addEventListener("input", function () {
            clearTimeout(checkTimer);
            checkTimer = setTimeout(checkTrust, 500);
        });
    })();

// =========================================================
// TWO-FACTOR LOGIN STEP
// =========================================================
(function () {
    if (window.__login2FAWired) return;
    window.__login2FAWired = true;

    let pendingTicket = null;
    let pendingRemember = true;

    const section = document.getElementById("login2FASection");
    const codeInput = document.getElementById("login2FACode");
    const form = document.getElementById("login2FAForm");
    const submitBtn = document.getElementById("login2FASubmit");
    const errorBox = document.getElementById("login2FAError");
    const backLink = document.getElementById("login2FABack");
    if (!section || !codeInput || !form) return;

    // Called by the outer login handler when it detects requires_2fa
    window.__show2FAStep = function (ticket, remember, method) {
        // __methodAware
        var hintEl = document.querySelector("#login2FASection .twofa-hint");
        if (hintEl) {
            if (method === "email") {
                hintEl.textContent = "We just emailed a 6-digit code to your inbox. Enter it below to finish signing in.";
            } else {
                hintEl.textContent = "Open Google Authenticator (or your TOTP app) and enter the current 6-digit code for your Crevio account.";
            }
        }
        pendingTicket = ticket;
        pendingRemember = remember;
        errorBox.classList.remove("show");
        codeInput.value = "";
        document.getElementById("loginForm").style.display = "none";
        section.style.display = "block";
        setTimeout(function () { codeInput.focus(); }, 100);
    };

    backLink.addEventListener("click", function (e) {
        e.preventDefault();
        pendingTicket = null;
        section.style.display = "none";
        document.getElementById("loginForm").style.display = "";
    });

    codeInput.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "").slice(0, 6);
    });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const code = codeInput.value.trim();
        if (code.length !== 6) return;
        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying…";
        errorBox.classList.remove("show");

        try {
            const res = await fetch("/api/auth/verify-2fa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticket: pendingTicket,
                    code: code,
                    rememberDevice: pendingRemember
                })
            });
            const data = await res.json();
            if (data.success && data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "/dashboard/";
            } else {
                errorBox.textContent = data.message || "Incorrect code.";
                errorBox.classList.add("show");
                submitBtn.disabled = false;
                submitBtn.textContent = "Verify and sign in";
                codeInput.focus();
                codeInput.select();
            }
        } catch (err) {
            errorBox.textContent = "Network error. Please try again.";
            errorBox.classList.add("show");
            submitBtn.disabled = false;
            submitBtn.textContent = "Verify and sign in";
        }
    });
})();
