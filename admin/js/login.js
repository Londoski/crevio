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

            if (data.success && data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                console.log("✅ Token saved, redirecting...");
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
