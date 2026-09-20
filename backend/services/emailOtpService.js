// CREVIO — EMAIL OTP SERVICE
// File: backend/services/emailOtpService.js
// Generates a 6-digit code, stores it hashed in otp_challenges,
// sends it by email. Verifies by comparing hash + enforcing expiry
// and max attempts.
const crypto = require("crypto");
const db = require("../../database/db");
const emailService = require("./emailService");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MIN = 10;
const MAX_ATTEMPTS = 5;
const CHALLENGE_TYPE = "reset_otp";

function hashValue(v) {
    return crypto.createHash("sha256").update(String(v)).digest("hex");
}

function futureIso(minutes) {
    return new Date(Date.now() + minutes * 60 * 1000)
        .toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function generateCode() {
    const min = 10 ** (OTP_LENGTH - 1);
    const max = (10 ** OTP_LENGTH) - 1;
    return String(crypto.randomInt(min, max + 1));
}

function invalidatePrevious(userId) {
    try {
        db.prepare(
            "DELETE FROM otp_challenges WHERE user_id = ? AND challenge_type = ? AND verified_at IS NULL"
        ).run(userId, CHALLENGE_TYPE);
    } catch (e) {}
}

async function createAndSend({ userId, userEmail }) {
    invalidatePrevious(userId);
    const code = generateCode();
    const codeHash = hashValue(code);
    const expiresAt = futureIso(OTP_EXPIRY_MIN);

    try {
        db.prepare(
            "INSERT INTO otp_challenges (user_id, challenge_type, code_hash, destination, expires_at, max_attempts) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(userId, CHALLENGE_TYPE, codeHash, userEmail || null, expiresAt, MAX_ATTEMPTS);
    } catch (e) {
        console.error("[emailOtp] insert failed:", e.message);
        return { success: false, reason: e.message };
    }

    // Fire-and-forget email
    try {
        await emailService.send({
            userId,
            to: userEmail,
            subject: "Your Crevio verification code",
            text:
                "Hi,\n\n" +
                "Your Crevio verification code is:\n\n" +
                "    " + code + "\n\n" +
                "This code expires in " + OTP_EXPIRY_MIN + " minutes.\n\n" +
                "If you didn't request this, someone may be trying to access your account. Please contact our security team immediately:\n\n" +
                "    security@crevio.indevs.in\n\n" +
                "Or simply reply to this email - our security team monitors replies and will respond as soon as possible.\n\n" +
                "The Crevio Team",
            category: "security_reset_otp"
        });
    } catch (e) { console.error("[emailOtp] email failed:", e.message); }

    return { success: true, expiresAt, codeLength: OTP_LENGTH };
}

function verify({ userId, code }) {
    try {
        if (!code || String(code).length !== OTP_LENGTH) {
            return { success: false, reason: "invalid_format" };
        }
        const row = db.prepare(
            "SELECT * FROM otp_challenges WHERE user_id = ? AND challenge_type = ? AND verified_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1"
        ).get(userId, CHALLENGE_TYPE);

        if (!row) return { success: false, reason: "expired_or_missing" };
        if (row.attempts >= row.max_attempts) return { success: false, reason: "too_many_attempts" };

        const incoming = hashValue(code);
        if (incoming !== row.code_hash) {
            db.prepare("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?").run(row.id);
            return { success: false, reason: "invalid_code" };
        }

        db.prepare("UPDATE otp_challenges SET verified_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
        return { success: true, challengeId: row.id };
    } catch (e) {
        console.error("[emailOtp] verify failed:", e.message);
        return { success: false, reason: e.message };
    }
}

module.exports = { createAndSend, verify, CHALLENGE_TYPE };
