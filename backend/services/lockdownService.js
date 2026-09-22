// =========================================================
// CREVIO — LOCKDOWN SERVICE
// File: backend/services/lockdownService.js
// Handles the "This wasn't me" one-click account lockdown.
//
// Flow:
//   1. Email contains a signed token (valid 1 hour, single-use)
//   2. User clicks -> /api/security/report-compromise?token=...
//   3. We verify the token against verification_tokens
//   4. We suspend the account + revoke sessions/devices
//   5. We email a reset link (email + phone OTP + 2FA on the reset page)
//
// No circular deps. Never throws from a public method — returns
// { success: bool, reason?: string, ... } so the caller can decide.
// =========================================================
const crypto = require("crypto");
const securityEmails = require("../emails/templates/securityEmails");
const db = require("../../database/db");
const verificationService = require("./verificationService");
const emailService = require("./emailService");
const notificationService = require("./notificationService");

const TOKEN_TYPE = "compromise_lockdown";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ---------- helpers ----------
function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

function nowIso() {
    return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function logEvent(userId, eventType, meta = {}) {
    try {
        db.prepare(`
            INSERT INTO security_events
                (user_id, event_type, notification_id, ip_address, user_agent, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            eventType,
            meta.notificationId || null,
            meta.ipAddress || null,
            meta.userAgent || null,
            JSON.stringify(meta.extra || {})
        );
    } catch (e) {
        console.error("[lockdownService] logEvent failed:", e.message);
    }
}

// ---------- 1. Create lockdown token (called by accountSecurityService) ----------
function createToken({ userId, notificationId }) {
    try {
        const raw = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)
            .toISOString()
            .replace("T", " ")
            .replace(/\.\d{3}Z$/, "");

        // Reuse existing verification_tokens table
        const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");

        db.prepare(`
            INSERT INTO verification_tokens (user_id, token_hash, token_type, destination, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            userId,
            tokenHash,
            TOKEN_TYPE,
            notificationId ? String(notificationId) : null,
            expiresAt
        );

        return { success: true, token: raw, expiresAt };
    } catch (e) {
        console.error("[lockdownService.createToken] failed:", e.message);
        return { success: false, reason: e.message };
    }
}

// ---------- 2. Verify + consume token ----------
function consumeToken(rawToken) {
    try {
        if (!rawToken) return { success: false, reason: "missing_token" };
        const tokenHash = crypto.createHash("sha256").update(String(rawToken)).digest("hex");

        const row = db.prepare(`
            SELECT * FROM verification_tokens
            WHERE token_hash = ?
              AND token_type = ?
              AND used_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
        `).get(tokenHash, TOKEN_TYPE);

        if (!row) return { success: false, reason: "invalid_or_expired" };

        // Mark used
        db.prepare("UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);

        return {
            success: true,
            userId: row.user_id,
            notificationId: row.destination ? Number(row.destination) : null,
            tokenId: row.id
        };
    } catch (e) {
        console.error("[lockdownService.consumeToken] failed:", e.message);
        return { success: false, reason: e.message };
    }
}

// ---------- 3. Suspend + revoke (the lockdown itself) ----------
async function lockdown({ userId, reason = "reported_compromise", ipAddress = null, userAgent = null, notificationId = null }) {
    try {
        const user = db.prepare("SELECT id, email, username FROM users WHERE id = ?").get(userId);
        if (!user) return { success: false, reason: "user_not_found" };

        // 1. Suspend account
        db.prepare(`
            UPDATE users
            SET suspended = 1,
                suspended_at = CURRENT_TIMESTAMP,
                suspended_reason = ?
            WHERE id = ?
        `).run(reason, userId);

        // 2. Revoke ALL sessions (every device is logged out)
        let sessionsRevoked = 0;
        try {
            const r = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
            sessionsRevoked = r.changes;
        } catch (e) { console.warn("[lockdownService] session delete failed:", e.message); }

        // 3. Revoke ALL trusted devices
        let devicesRevoked = 0;
        try {
            const r = db.prepare("DELETE FROM trusted_devices WHERE user_id = ?").run(userId);
            devicesRevoked = r.changes;
        } catch (e) { console.warn("[lockdownService] device delete failed:", e.message); }

        // 4. Log the lockdown event
        logEvent(userId, "account_lockdown", {
            notificationId,
            ipAddress,
            userAgent,
            extra: { sessionsRevoked, devicesRevoked, reason }
        });

        // 5. Create password-reset token
        const resetResult = verificationService.createVerificationToken({
            userId: userId,
            tokenType: "password_reset_compromise",
            destination: user.email
        });

        const resetLink = resetResult && resetResult.token
            ? appUrl() + "/admin/pages/reset-password.html?token=" + resetResult.token
            : null;

        // 6. Notify the user (in-app + email)
        try {
            notificationService.create({
                userId,
                type: "alert",
                title: "Account secured",
                message:
                    "We received a report that a sign-in wasn't you.\n\n" +
                    "**All devices have been signed out.**\n" +
                    "**Your account has been locked.**\n\n" +
                    "To regain access, check your email for the reset link. You'll need to:\n" +
                    "1. Set a new password\n" +
                    "2. Verify your phone number\n" +
                    "3. Verify your two-factor code (if enabled)"
            });
        } catch (e) { /* silent */ }

        if (user.email && resetLink) {
            try {
                const securityEmails = require("../emails/templates/securityEmails");
                const rendered = securityEmails.renderAccountLocked({
                    firstName: null,
                    sessionsRevoked: sessionsRevoked,
                    devicesRevoked: devicesRevoked
                });
                await emailService.send({
                    userId: userId,
                    to: user.email,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text + "\n\nReset your password: " + resetLink,
                    category: "security_lockdown"
                });
            } catch (e) { console.warn("[lockdownService] reset email failed:", e.message); }
        }

        return {
            success: true,
            userId,
            userEmail: user.email,
            sessionsRevoked,
            devicesRevoked,
            resetLinkSent: !!resetLink
        };
    } catch (e) {
        console.error("[lockdownService.lockdown] failed:", e.message);
        return { success: false, reason: e.message };
    }
}

// ---------- 4. Unlock after successful reset ----------
function unlock({ userId, reason = "reset_complete" }) {
    try {
        db.prepare(`
            UPDATE users
            SET suspended = 0,
                suspended_at = NULL,
                suspended_reason = NULL
            WHERE id = ?
        `).run(userId);

        logEvent(userId, "account_unlocked", { extra: { reason } });
        return { success: true };
    } catch (e) {
        console.error("[lockdownService.unlock] failed:", e.message);
        return { success: false, reason: e.message };
    }
}

// ---------- 5. Check if suspended ----------
function isSuspended(userId) {
    try {
        const row = db.prepare("SELECT suspended FROM users WHERE id = ?").get(userId);
        return !!(row && row.suspended);
    } catch (e) { return false; }
}

module.exports = {
    createToken,
    consumeToken,
    lockdown,
    unlock,
    isSuspended,
    TOKEN_TYPE
};