const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Login failed."
            );
        }

        // Store authentication token
        localStorage.setItem("crevio_token", data.token);

        // Store basic user information if available
        if (data.user) {
            localStorage.setItem(
                "crevio_user",
                JSON.stringify(data.user)
            );
        }

        loginMessage.textContent = "Login successful.";

        // Dashboard will be created next
        window.location.href = "/admin/pages/dashboard.html";

    } catch (error) {
        console.error("Login error:", error);

        loginMessage.textContent =
            error.message || "Unable to login.";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});