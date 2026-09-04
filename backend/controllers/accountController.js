// =========================================================
// CREVIO — ACCOUNT MANAGEMENT CONTROLLER
// =========================================================

const userModel = require("../models/userModel");
const sessionModel = require("../models/sessionModel");
const trustedDeviceModel = require("../models/trustedDeviceModel");

// ---- GET ACCOUNT INFO ----
const getAccountInfo = (req, res) => {
    try {
        const user = userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({
            success: true,
            account: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                phone: user.phone,
                location: user.location,
                country: user.country || null,
                region: user.region || null,
                email_verified: Boolean(user.email_verified),
                phone_verified: Boolean(user.phone_verified),
                two_factor_enabled: Boolean(user.two_factor_enabled),
                account_status: user.account_status || 'active',
                created_at: user.created_at,
                deactivated_at: user.deactivated_at || null,
                deletion_requested_at: user.deletion_requested_at || null,
                deletion_scheduled_for: user.deletion_scheduled_for || null
            }
        });
    } catch (error) {
        console.error("Get account info error:", error);
        res.status(500).json({ success: false, message: "Unable to load account information." });
    }
};

// ---- DEACTIVATE ----
const deactivateAccount = (req, res) => {
    try {
        const userId = req.user.id;
        const user = userModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (user.account_status === 'deactivated') {
            return res.status(400).json({ success: false, message: "Account is already deactivated." });
        }
        // Revoke all sessions
        sessionModel.revokeAllForUser(userId);
        trustedDeviceModel.revokeAllForUser(userId);
        userModel.deactivate(userId);
        res.clearCookie("crevio_device_token", { path: "/" });
        res.json({
            success: true,
            message: "Account deactivated successfully.",
            redirect: "/admin/pages/login.html"
        });
    } catch (error) {
        console.error("Deactivate error:", error);
        res.status(500).json({ success: false, message: "Unable to deactivate account." });
    }
};

// ---- REACTIVATE (called during login) ----
const reactivateAccount = (req, res) => {
    try {
        const { email, password } = req.body;
        const user = userModel.findByEmail(email);
        if (!user) return res.status(404).json({ success: false, message: "Account not found." });
        if (user.account_status !== 'deactivated') {
            return res.status(400).json({ success: false, message: "Account is not deactivated." });
        }
        const bcrypt = require("bcrypt");
        const match = bcrypt.compareSync(password, user.password_hash);
        if (!match) return res.status(401).json({ success: false, message: "Invalid credentials." });
        userModel.reactivate(user.id);
        res.json({ success: true, message: "Account reactivated successfully. Please log in.", redirect: "/admin/pages/login.html" });
    } catch (error) {
        console.error("Reactivate error:", error);
        res.status(500).json({ success: false, message: "Unable to reactivate account." });
    }
};

// ---- REQUEST DELETION ----
const requestDeletion = (req, res) => {
    try {
        const userId = req.user.id;
        const { reason } = req.body;
        const user = userModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (user.account_status === 'pending_deletion') {
            return res.status(400).json({ success: false, message: "Deletion already requested." });
        }
        if (user.account_status === 'deactivated') {
            return res.status(400).json({ success: false, message: "Cannot delete a deactivated account." });
        }
        sessionModel.revokeAllForUser(userId);
        trustedDeviceModel.revokeAllForUser(userId);
        userModel.requestDeletion(userId, reason);
        res.clearCookie("crevio_device_token", { path: "/" });
        res.json({
            success: true,
            message: "Deletion requested. You have 30 days to cancel.",
            deletion_scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            redirect: "/admin/pages/login.html"
        });
    } catch (error) {
        console.error("Request deletion error:", error);
        res.status(500).json({ success: false, message: "Unable to request deletion." });
    }
};

// ---- CANCEL DELETION ----
const cancelDeletion = (req, res) => {
    try {
        const userId = req.user.id;
        const user = userModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (user.account_status !== 'pending_deletion') {
            return res.status(400).json({ success: false, message: "No deletion request found." });
        }
        userModel.cancelDeletion(userId);
        res.json({ success: true, message: "Deletion cancelled.", redirect: "/dashboard/" });
    } catch (error) {
        console.error("Cancel deletion error:", error);
        res.status(500).json({ success: false, message: "Unable to cancel deletion." });
    }
};

module.exports = {
    getAccountInfo,
    deactivateAccount,
    reactivateAccount,
    requestDeletion,
    cancelDeletion
};