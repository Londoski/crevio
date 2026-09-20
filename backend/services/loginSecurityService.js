// =========================================================
// CREVIO — LOGIN SECURITY SERVICE
// File: backend/services/loginSecurityService.js
// Called once per successful login. Never blocks.
//
// When a new device is detected (and it isn't the user's very
// first login), we:
//   1. Create a signed lockdown token
//   2. Send the notification + email
//   3. Email includes a "This wasn't me" button pointing at
//      /api/security/report-compromise?token=...
// =========================================================
const crypto = require("crypto");
const db = require("../../database/db");
const deviceService = require("./deviceService");
const geoService = require("./geoService");
const notificationService = require("./notificationService");
const emailService = require("./emailService");
const lockdownService = require("./lockdownService");

const DEVICE_TTL_MS  = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS =  7 * 24 * 60 * 60 * 1000;

function sha256(s) {
    return crypto.createHash("sha256").update(String(s)).digest("hex");
}
function futureIso(ms) {
    return new Date(Date.now() + ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}
function nowIso() {
    return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}
function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
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

async function recordLogin({ userId, userEmail, token, userAgent, ipAddress, acceptLanguage, rememberDevice = true }) {
    if (!userId || !token) return { success: false, reason: "missing_user_or_token" };

    try {
        const tokenHash = sha256(token);
        const remember = rememberDevice !== false;

        // 1. Record session
        try {
            db.prepare(`
                INSERT INTO sessions
                    (user_id, session_token_hash, user_agent, ip_address, expires_at, last_seen_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(userId, tokenHash, userAgent || null, ipAddress || null, futureIso(SESSION_TTL_MS));
        } catch (e) { console.error("[loginSecurity] session insert failed:", e.message); }

        // 2. Device fingerprint
        const parsed = deviceService.parse(userAgent || "");
        const fp = deviceService.fingerprint({ userAgent, ipAddress: null, acceptLanguage });

        // 3. First-ever login?
        let priorSessions = 1;
        try {
            const row = db.prepare("SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?").get(userId);
            priorSessions = row ? Number(row.c) : 1;
        } catch (e) { priorSessions = 1; }
        const isFirstEver = priorSessions <= 1;

        // 4. Existing trusted device?
        let existingDevice = null;
        if (remember) {
            try {
                existingDevice = db.prepare(
                    "SELECT * FROM trusted_devices WHERE user_id = ? AND device_token = ? LIMIT 1"
                ).get(userId, fp) || null;
            } catch (e) { existingDevice = null; }
        }

        if (existingDevice) {
            try {
                db.prepare("UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?")
                  .run(existingDevice.id);
            } catch (e) {}
            return { success: true, isNewDevice: false, device: parsed.friendly };
        }

        // 5. New device → record it (only if remember=true)
        if (remember) {
            try {
                db.prepare(`
                    INSERT INTO trusted_devices
                        (user_id, device_token, device_name, user_agent, ip_address, expires_at, last_used_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).run(userId, fp, parsed.friendly, userAgent || null, ipAddress || null, futureIso(DEVICE_TTL_MS));
            } catch (e) { console.error("[loginSecurity] device insert failed:", e.message); }
        }

        // 6. First-ever login: silent trust
        if (isFirstEver) {
            return { success: true, isNewDevice: true, firstEver: true, device: parsed.friendly };
        }

        // 7. GeoIP
        let loc = { private: true };
        try {
            loc = await geoService.lookup(ipAddress);
        } catch (e) {}
        const locationText = geoService.friendly(loc);
        const timestamp = formatDateTime(nowIso());

        // 8. Notification
        let notificationId = null;
        try {
            const r = notificationService.create({
                userId: userId,
                type: "alert",
                title: "New sign-in on " + parsed.friendly,
                message:
                    "We detected a sign-in from " + locationText + ".\n\n" +
                    "**Device:** " + parsed.friendly + "\n" +
                    "**IP address:** " + (ipAddress || "unknown") + "\n" +
                    "**Time:** " + timestamp + "\n\n" +
                    "If this wasn't you, secure your account immediately by changing your password."
            });
            if (r && r.success) notificationId = r.id;
        } catch (e) { console.error("[loginSecurity] notification failed:", e.message); }

        // 9. Create lockdown token for the "This wasn't me" button
        let lockdownLink = null;
        try {
            const t = lockdownService.createToken({ userId, notificationId });
            if (t && t.success) {
                lockdownLink = appUrl() + "/api/security/report-compromise?token=" + t.token;
            }
        } catch (e) { console.warn("[loginSecurity] lockdown token failed:", e.message); }

        // 10. Email
        if (userEmail) {
            const subject = "Security alert: New sign-in to your Crevio account";
            let text =
                "Hi there,\n\n" +
                "We noticed a new sign-in to your Crevio account from a device we don't recognize.\n\n" +
                "Device:     " + parsed.friendly + "\n" +
                "Location:   " + locationText + "\n" +
                "IP Address: " + (ipAddress || "unknown") + "\n" +
                "Time:       " + timestamp + "\n\n" +
                "If this was you, no action is needed.\n\n" +
                "If this wasn't you, secure your account immediately:\n";

            if (lockdownLink) {
                text += lockdownLink + "\n\n";
            } else {
                text += appUrl() + "/admin/pages/login.html\n\n";
            }

            text += "If this wasn't you, please contact our security team:\n\n    security@crevio.indevs.in\n\nOr simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\nThe Crevio Team";

            emailService.send({
                userId: userId,
                to: userEmail,
                subject: subject,
                text: text,
                category: "security_new_device"
            }).catch(function () {});
        }

        return {
            success: true,
            isNewDevice: true,
            device: parsed.friendly,
            location: locationText,
            lockdownLink: !!lockdownLink
        };

    } catch (err) {
        console.error("[loginSecurity] failed:", err.message);
        return { success: false, reason: err.message };
    }
}

module.exports = { recordLogin };