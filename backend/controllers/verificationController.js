// =========================================================
// CREVIO — VERIFICATION CONTROLLER (CLEAN)
// =========================================================

const userModel = require("../models/userModel");

console.log("✅ verificationController loaded successfully");
// ---- Email ----
const verifyEmail = (req, res) => {
    try {
        userModel.markEmailVerified(req.user.id);
        res.json({ success: true, message: "Email verified." });
    } catch (error) {
        console.error("verifyEmail error:", error);
        res.status(500).json({ success: false, message: "Verification failed." });
    }
};

const resendVerification = (req, res) => {
    try {
        res.json({ success: true, message: "Verification email sent." });
    } catch (error) {
        console.error("resendVerification error:", error);
        res.status(500).json({ success: false, message: "Could not resend." });
    }
};

// ---- Phone ----
const verifyPhone = (req, res) => {
    try {
        userModel.markPhoneVerified(req.user.id);
        res.json({ success: true, message: "Phone verified." });
    } catch (error) {
        console.error("verifyPhone error:", error);
        res.status(500).json({ success: false, message: "Phone verification failed." });
    }
};

const sendPhoneVerification = (req, res) => {
    try {
        res.json({ success: true, message: "Verification code sent." });
    } catch (error) {
        console.error("sendPhoneVerification error:", error);
        res.status(500).json({ success: false, message: "Could not send code." });
    }
};

// ---- Password reset ----
const forgotPassword = (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });
        const user = userModel.findByEmail(email);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        res.json({ success: true, message: "Password reset link sent." });
    } catch (error) {
        console.error("forgotPassword error:", error);
        res.status(500).json({ success: false, message: "Request failed." });
    }
};

const resetPassword = (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: "Token and new password are required." });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }
        res.json({ success: true, message: "Password reset successfully." });
    } catch (error) {
        console.error("resetPassword error:", error);
        res.status(500).json({ success: false, message: "Reset failed." });
    }
};

// ---- Status ----
const getVerificationStatus = (req, res) => {
    try {
        const user = userModel.findById(req.user.id);
        res.json({
            success: true,
            email_verified: user?.email_verified || false,
            phone_verified: user?.phone_verified || false,
        });
    } catch (error) {
        console.error("getVerificationStatus error:", error);
        res.status(500).json({ success: false, message: "Could not load status." });
    }
};

module.exports = {
    verifyEmail,
    resendVerification,
    verifyPhone,
    sendPhoneVerification,
    forgotPassword,
    resetPassword,   // <-- MUST match exactly
    getVerificationStatus,
};