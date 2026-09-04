// =========================================================
// CREVIO — TOTP SERVICE
// =========================================================
//
// Uses current otplib functional APIs.
//
// TOTP defaults:
//   SHA-1, 6 digits, 30 second period
//
// =========================================================

const crypto = require("crypto");
const { generateSecret, verify, generateURI } = require("otplib");
const QRCode = require("qrcode");
const twoFactorModel = require("../models/twoFactorModel");

// =========================================================
// CONFIGURATION
// =========================================================

const ISSUER = "Crevio";
const ALGORITHM = "sha1";
const DIGITS = 6;
const PERIOD = 30;

// =========================================================
// ENCRYPTION KEY
// =========================================================

function getEncryptionKey() {
    const value = process.env.CREVIO_2FA_ENCRYPTION_KEY;
    if (!value) {
        throw new Error("CREVIO_2FA_ENCRYPTION_KEY is not configured.");
    }
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
        throw new Error("CREVIO_2FA_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.");
    }
    return Buffer.from(value, "hex");
}

// =========================================================
// ENCRYPT / DECRYPT SECRET
// =========================================================

function encryptSecret(secret) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptSecret(encryptedValue) {
    const key = getEncryptionKey();
    const parts = String(encryptedValue).split(".");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted TOTP secret.");
    }
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}

// =========================================================
// GENERATE SECRET & URI
// =========================================================

function createSecret() {
    return generateSecret();
}

function createAuthenticatorUri({ secret, email }) {
    return generateURI({
        issuer: ISSUER,
        label: email,
        secret,
        algorithm: ALGORITHM,
        digits: DIGITS,
        period: PERIOD
    });
}

async function createQrCode(uri) {
    return QRCode.toDataURL(uri, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 280
    });
}

// =========================================================
// VERIFY TOKEN (core verification)
// =========================================================

async function verifyToken({ secret, token }) {
    try {
        const result = verify({
            secret,
            token: String(token).replace(/\s/g, ""),
            algorithm: ALGORITHM,
            digits: DIGITS,
            period: PERIOD
        });
        // verify() returns either boolean or { valid: true/false }
        if (typeof result === "boolean") {
            return result;
        }
        return result.valid === true;
    } catch (error) {
        console.error("❌ TOTP verification error:", error.message);
        return false;
    }
}

// =========================================================
// GET STORED SECRET
// =========================================================

function getUserSecret(userId) {
    const method = twoFactorModel.findAuthenticatorMethod(userId);
    if (!method || !method.secret) {
        return null;
    }
    try {
        const secret = decryptSecret(method.secret);
        return { method, secret };
    } catch (error) {
        console.error("❌ Decryption error for user", userId, error.message);
        return null;
    }
}

// =========================================================
// CREATE SETUP
// =========================================================

async function createSetup({ userId, email }) {
    const secret = createSecret();
    const encryptedSecret = encryptSecret(secret);
    const label = email || `user-${userId}`;
    const uri = createAuthenticatorUri({ secret, email: label });
    const qrCode = await createQrCode(uri);

    const method = twoFactorModel.createAuthenticatorMethod({
        userId,
        label,
        encryptedSecret
    });

    return {
        methodId: method.id,
        secret,
        uri,
        qrCode
    };
}

// =========================================================
// VERIFY SETUP (for enabling 2FA)
// =========================================================

async function verifySetup({ userId, token }) {
    const stored = getUserSecret(userId);
    if (!stored) {
        return { valid: false, reason: "not_configured" };
    }
    const valid = await verifyToken({ secret: stored.secret, token });
    if (!valid) {
        return { valid: false, reason: "invalid_code" };
    }
    // Mark as verified
    twoFactorModel.markVerified(stored.method.id);
    return {
        valid: true,
        method: twoFactorModel.findById(stored.method.id)
    };
}

// =========================================================
// VERIFY ACTIVE TOKEN (for login)
// =========================================================

async function verifyActiveToken({ userId, token }) {
    console.log("🔐 verifyActiveToken called for user:", userId);
    console.log("Token:", token);

    const stored = getUserSecret(userId);
    console.log("Stored secret found:", !!stored);

    if (!stored) {
        console.error("❌ No TOTP secret found for user:", userId);
        return false;
    }
    if (!stored.method.is_verified) {
        console.error("❌ TOTP method not verified for user:", userId);
        return false;
    }

    try {
        const result = await verifyToken({ secret: stored.secret, token });
        console.log("✅ TOTP verification result:", result);
        return result;
    } catch (error) {
        console.error("❌ TOTP verification error:", error.message);
        return false;
    }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
    createSetup,
    verifySetup,
    verifyActiveToken,
    getUserSecret,
    encryptSecret,
    decryptSecret
};