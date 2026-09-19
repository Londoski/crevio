// =========================================================
// CREVIO — LOGIN SECURITY SERVICE
// File: backend/services/loginSecurityService.js
// Called once per successful login. Never blocks — everything
// after the session insert is fire-and-forget. Emits a real
// notification + queues a real email ONLY when the device is
// new AND it isn't the user's very first login.
// =========================================================
const crypto = require("crypto");
const db = require("../../database/db");
const deviceService = require("./deviceService");
const geoService = require("./geoService");
const notificationService = require("./notificationService");
const emailService = require("./emailService");

const DEVICE_TTL_MS  = 90 * 24 * 60 * 60 * 1000; // 90 days device trust
const SESSION_TTL_MS =  7 * 24 * 60 * 60 * 1000; // 7 days — matches JWT

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

async function recordLogin({ userId, userEmail, token, userAgent, ipAddress, acceptLanguage }) {
    if (!userId || !token) return { success: false, reason: "missing_user_or_token" };

    try {
        const tokenHash = sha256(token);

        // ---------- 1. Record session ----------
        try {
            db.prepare(`
                INSERT INTO sessions
                    (user_id, session_token_hash, user_agent, ip_address, expires_at, last_seen_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(userId, tokenHash, userAgent || null, ipAddress || null, futureIso(SESSION_TTL_MS));
        } catch (e) { console.error("[loginSecurity] session insert failed:", e.message); }

        // ---------- 2. Device fingerprint (IP NOT included — so switching Wi-Fi→4G isn't "new") ----------
        const parsed = deviceService.parse(userAgent || "");
        const fp = deviceService.fingerprint({ userAgent, ipAddress: null, acceptLanguage });

        // ---------- 3. Is this the user's very first login? ----------
        let priorSessions = 1;
        try {
            const row = db.prepare("SELECT COUNT(*) AS c FROM sessions WHERE user_id = ?").get(userId);
            priorSessions = row ? Number(row.c) : 1;
        } catch (e) { priorSessions = 1; }
        const isFirstEver = priorSessions <= 1;

        // ---------- 4. Existing trusted device? ----------
        let existingDevice = null;
        try {
            existingDevice = db.prepare(
                "SELECT * FROM trusted_devices WHERE user_id = ? AND device_token = ? LIMIT 1"
            ).get(userId, fp) || null;
        } catch (e) { existingDevice = null; }

        if (existingDevice) {
            try {
                db.prepare("UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?")
                  .run(existingDevice.id);
            } catch (e) {}
            return { success: true, isNewDevice: false, device: parsed.friendly };
        }

        // ---------- 5. New device → record it ----------
        try {
            db.prepare(`
                INSERT INTO trusted_devices
                    (user_id, device_token, device_name, user_agent, ip_address, expires_at, last_used_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(userId, fp, parsed.friendly, userAgent || null, ipAddress || null, futureIso(DEVICE_TTL_MS));
        } catch (e) { console.error("[loginSecurity] device insert failed:", e.message); }

        // ---------- 6. First-ever login: trust silently, no notification ----------
        if (isFirstEver) {
            return { success: true, isNewDevice: true, firstEver: true, device: parsed.friendly };
        }

        // ---------- 7. GeoIP (async, cached, 1.5s timeout) ----------
        let loc = { private: true };
        try {
            loc = await geoService.lookup(ipAddress);
        } catch (e) { /* handled inside */ }
        const locationText = geoService.friendly(loc);
        const timestamp = formatDateTime(nowIso());

        // ---------- 8. Notification (short, in-app) ----------
        try {
            notificationService.create({
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
        } catch (e) { console.error("[loginSecurity] notification failed:", e.message); }

        // ---------- 9. Email (different wording, more detailed) ----------
        if (userEmail) {
            const subject = "Security alert: New sign-in to your Crevio account";
            const text =
                "Hi there,\n\n" +
                "We noticed a new sign-in to your Crevio account from a device we don't recognize.\n\n" +
                "Device:    " + parsed.friendly + "\n" +
                "Location:  " + locationText + "\n" +
                "IP Address: " + (ipAddress || "unknown") + "\n" +
                "Time:      " + timestamp + "\n\n" +
                "If this was you, no action is needed.\n\n" +
                "If this wasn't you, please secure your account immediately by signing in and changing your password:\n" +
                appUrl() + "/admin/pages/login.html\n\n" +
                "The Crevio Team";

            emailService.send({
                userId: userId,
                to: userEmail,
                subject: subject,
                text: text,
                category: "security_new_device"
            }).catch(function () {});
        }

        return { success: true, isNewDevice: true, device: parsed.friendly, location: locationText };

    } catch (err) {
        console.error("[loginSecurity] failed:", err.message);
        return { success: false, reason: err.message };
    }
}

module.exports = { recordLogin };