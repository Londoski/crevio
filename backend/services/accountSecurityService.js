// =========================================================
// CREVIO — ACCOUNT SECURITY SERVICE
// File: backend/services/accountSecurityService.js
// Called from authController + twoFactorController after
// successful security-sensitive changes. Emits notification
// + queues email. Never blocks the primary action.
// =========================================================
const notificationService = require("./notificationService");
const emailService = require("./emailService");
const deviceService = require("./deviceService");
const geoService = require("./geoService");

function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

function nowIso() {
    return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function formatDateTime(iso) {
    try {
        const d = new Date(iso.replace(" ", "T") + "Z");
        return d.toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit", timeZoneName: "short"
        });
    } catch (e) { return iso; }
}

async function resolveContext({ ipAddress, userAgent }) {
    let locationText = "Unknown location";
    try {
        const loc = await geoService.lookup(ipAddress);
        locationText = geoService.friendly(loc);
    } catch (e) {}
    const parsed = deviceService.parse(userAgent || "");
    return { locationText, deviceFriendly: parsed.friendly };
}

// ---------- 1. Password changed ----------
async function notifyPasswordChanged({ userId, userEmail, ipAddress, userAgent }) {
    try {
        const ctx = await resolveContext({ ipAddress, userAgent });
        const timestamp = formatDateTime(nowIso());

        notificationService.create({
            userId,
            type: "alert",
            title: "Your password was changed",
            message:
                "The password on your Crevio account was successfully changed.\n\n" +
                "**Device:** " + ctx.deviceFriendly + "\n" +
                "**Location:** " + ctx.locationText + "\n" +
                "**IP address:** " + (ipAddress || "unknown") + "\n" +
                "**Time:** " + timestamp + "\n\n" +
                "If this wasn't you, reset your password immediately."
        });

        if (userEmail) {
            emailService.send({
                userId,
                to: userEmail,
                subject: "Your Crevio password was updated",
                text:
                    "Hi,\n\n" +
                    "The password on your Crevio account was just changed.\n\n" +
                    "Time:      " + timestamp + "\n" +
                    "Device:    " + ctx.deviceFriendly + "\n" +
                    "Location:  " + ctx.locationText + "\n" +
                    "IP:        " + (ipAddress || "unknown") + "\n\n" +
                    "If you made this change, no action is needed.\n\n" +
                    "If you did NOT make this change, secure your account immediately:\n" +
                    appUrl() + "/admin/pages/login.html\n\n" +
                    "If this wasn't you, please contact our security team:\n\n    security@crevio.indevs.in\n\nOr simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\nThe Crevio Team",
                category: "security_password_changed"
            }).catch(function () {});
        }
    } catch (e) { console.error("[accountSecurity] password notify failed:", e.message); }
}

// ---------- 2. Email changed ----------
async function notifyEmailChanged({ userId, oldEmail, newEmail, ipAddress, userAgent }) {
    try {
        const ctx = await resolveContext({ ipAddress, userAgent });
        const timestamp = formatDateTime(nowIso());

        notificationService.create({
            userId,
            type: "alert",
            title: "Your email address was changed",
            message:
                "The email address on your Crevio account was updated.\n\n" +
                "**Old email:** " + (oldEmail || "—") + "\n" +
                "**New email:** " + (newEmail || "—") + "\n\n" +
                "**Device:** " + ctx.deviceFriendly + "\n" +
                "**Location:** " + ctx.locationText + "\n" +
                "**Time:** " + timestamp + "\n\n" +
                "If this wasn't you, contact support immediately."
        });

        // Send to BOTH emails so both addresses are alerted
        const targets = [oldEmail, newEmail].filter(Boolean);
        for (const to of targets) {
            emailService.send({
                userId,
                to,
                subject: "Your Crevio email address was updated",
                text:
                    "Hi,\n\n" +
                    "The email address on a Crevio account " +
                    (oldEmail && newEmail ? ("was changed from " + oldEmail + " to " + newEmail) : "was updated") +
                    ".\n\n" +
                    "Time:      " + timestamp + "\n" +
                    "Device:    " + ctx.deviceFriendly + "\n" +
                    "Location:  " + ctx.locationText + "\n" +
                    "IP:        " + (ipAddress || "unknown") + "\n\n" +
                    "If this wasn't you, contact support immediately.\n\n" +
                    "If this wasn't you, please contact our security team:\n\n    security@crevio.indevs.in\n\nOr simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\nThe Crevio Team",
                category: "security_email_changed"
            }).catch(function () {});
        }
    } catch (e) { console.error("[accountSecurity] email notify failed:", e.message); }
}

// ---------- 3. 2FA enabled ----------
async function notify2FAEnabled({ userId, userEmail, ipAddress, userAgent }) {
    try {
        const ctx = await resolveContext({ ipAddress, userAgent });
        const timestamp = formatDateTime(nowIso());

        notificationService.create({
            userId,
            type: "system",
            title: "Two-factor authentication enabled",
            message:
                "Two-factor authentication is now protecting your Crevio account.\n\n" +
                "**Device:** " + ctx.deviceFriendly + "\n" +
                "**Time:** " + timestamp + "\n\n" +
                "From now on, you'll be asked for a verification code when signing in from a new device."
        });

        if (userEmail) {
            emailService.send({
                userId,
                to: userEmail,
                subject: "Two-factor authentication is now protecting your Crevio account",
                text:
                    "Hi,\n\n" +
                    "Two-factor authentication (2FA) was just enabled on your Crevio account.\n\n" +
                    "Time:      " + timestamp + "\n" +
                    "Device:    " + ctx.deviceFriendly + "\n" +
                    "Location:  " + ctx.locationText + "\n\n" +
                    "If you made this change, no action is needed.\n\n" +
                    "If you did NOT enable 2FA, secure your account immediately:\n" +
                    appUrl() + "/admin/pages/login.html\n\n" +
                    "If this wasn't you, please contact our security team:\n\n    security@crevio.indevs.in\n\nOr simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\nThe Crevio Team",
                category: "security_2fa_enabled"
            }).catch(function () {});
        }
    } catch (e) { console.error("[accountSecurity] 2fa enable notify failed:", e.message); }
}

// ---------- 4. 2FA disabled ----------
async function notify2FADisabled({ userId, userEmail, ipAddress, userAgent }) {
    try {
        const ctx = await resolveContext({ ipAddress, userAgent });
        const timestamp = formatDateTime(nowIso());

        notificationService.create({
            userId,
            type: "alert",
            title: "Two-factor authentication disabled",
            message:
                "Two-factor authentication was turned off on your Crevio account.\n\n" +
                "**Device:** " + ctx.deviceFriendly + "\n" +
                "**Location:** " + ctx.locationText + "\n" +
                "**Time:** " + timestamp + "\n\n" +
                "Your account is now less secure. If this wasn't you, re-enable 2FA and change your password immediately."
        });

        if (userEmail) {
            emailService.send({
                userId,
                to: userEmail,
                subject: "Two-factor authentication was turned off on your Crevio account",
                text:
                    "Hi,\n\n" +
                    "Two-factor authentication (2FA) was just DISABLED on your Crevio account.\n\n" +
                    "Time:      " + timestamp + "\n" +
                    "Device:    " + ctx.deviceFriendly + "\n" +
                    "Location:  " + ctx.locationText + "\n" +
                    "IP:        " + (ipAddress || "unknown") + "\n\n" +
                    "If you made this change, no action is needed.\n\n" +
                    "If you did NOT disable 2FA, secure your account immediately:\n" +
                    appUrl() + "/admin/pages/login.html\n\n" +
                    "If this wasn't you, please contact our security team:\n\n    security@crevio.indevs.in\n\nOr simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\nThe Crevio Team",
                category: "security_2fa_disabled"
            }).catch(function () {});
        }
    } catch (e) { console.error("[accountSecurity] 2fa disable notify failed:", e.message); }
}

module.exports = {
    notifyPasswordChanged,
    notifyEmailChanged,
    notify2FAEnabled,
    notify2FADisabled
};