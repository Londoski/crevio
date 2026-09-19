document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) return crevioAlert("Please enter email and password.", { kind: "warning" });

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
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