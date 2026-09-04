// =========================================================
// CREVIO ADMIN — LOGIN (with 2FA and device trust)
// =========================================================

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const rememberDevice = document.getElementById("rememberDevice");

const twoFactorSection = document.getElementById("twoFactorSection");
const twoFactorInput = document.getElementById("twoFactorCode");
const verifyButton = document.getElementById("verifyButton");
const cancel2faButton = document.getElementById("cancel2faButton");
const rememberDevice2fa = document.getElementById("rememberDevice2fa");

let tempToken = null;
let userId = null;

function setMessage(text, type = "error") {
    loginMessage.textContent = text;
    loginMessage.className = `login-message show ${type}`;
}

function clearMessage() {
    loginMessage.textContent = "";
    loginMessage.className = "login-message";
}

// ---- Step 1: Email + Password ----
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const remember = rememberDevice ? rememberDevice.checked : false;

    clearMessage();
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password,
                remember_device: remember,
                device_name: navigator.userAgent || "Unknown Device"
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Login failed.");
        }

        if (data.requires_2fa) {
            tempToken = data.temp_token;
            userId = data.user_id;
            document.getElementById("loginStep1").style.display = "none";
            twoFactorSection.style.display = "block";
            twoFactorInput.focus();
            setMessage("Enter the 6-digit code from your authenticator app.", "success");
            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
            return;
        }

        if (data.requires_verification) {
            // For now, we'll handle 2FA only; email/phone OTP will come later
            // TODO: implement email/phone verification for new devices
            setMessage("Please check your email and phone for verification codes.", "success");
            // For testing, we can bypass: treat it like 2FA for now
            tempToken = data.temp_token;
            userId = data.user_id;
            document.getElementById("loginStep1").style.display = "none";
            twoFactorSection.style.display = "block";
            twoFactorInput.focus();
            setMessage("Enter the 6-digit code sent to your email/phone.", "success");
            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
            return;
        }

        if (!data.token) {
            throw new Error("No session token received.");
        }

        localStorage.setItem("crevio_token", data.token);
        if (data.user) {
            localStorage.setItem("crevio_user", JSON.stringify(data.user));
        }

        window.location.href = "/dashboard";

    } catch (error) {
        console.error("Login error:", error);
        setMessage(error.message || "Unable to login.");
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});

// ---- Step 2: Verify TOTP ----
verifyButton.addEventListener("click", async () => {
    const code = twoFactorInput.value.replace(/\s/g, "");
    const remember = rememberDevice2fa ? rememberDevice2fa.checked : false;

    if (!/^\d{6}$/.test(code)) {
        setMessage("Please enter a valid 6-digit code.", "error");
        return;
    }

    clearMessage();
    verifyButton.disabled = true;
    verifyButton.textContent = "Verifying...";

    try {
        const response = await fetch("/api/auth/2fa/verify-challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                temp_token: tempToken,
                token: code,
                remember_device: remember,
                device_name: navigator.userAgent || "Unknown Device"
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "2FA verification failed.");
        }

        if (!data.token) {
            throw new Error("No session token received.");
        }

        localStorage.setItem("crevio_token", data.token);
        if (data.user) {
            localStorage.setItem("crevio_user", JSON.stringify(data.user));
        }

        window.location.href = "/dashboard";

    } catch (error) {
        console.error("2FA verification error:", error);
        setMessage(error.message || "Invalid code. Please try again.", "error");
        twoFactorInput.value = "";
        twoFactorInput.focus();
        verifyButton.disabled = false;
        verifyButton.textContent = "Verify";
    }
});

// ---- Cancel 2FA ----
if (cancel2faButton) {
    cancel2faButton.addEventListener("click", () => {
        twoFactorSection.style.display = "none";
        document.getElementById("loginStep1").style.display = "block";
        twoFactorInput.value = "";
        tempToken = null;
        userId = null;
        clearMessage();
    });
}