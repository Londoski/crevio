// CREVIO — TOTP SERVICE
// File: backend/services/totpService.js
// SHA-1, 6 digits, 30s period. Secrets encrypted with AES-256-GCM.

const crypto = require("crypto");
const otplib = require("otplib");
const QRCode = require("qrcode");

const ISSUER = "Crevio";
const ALGORITHM = "sha1";
const DIGITS = 6;
const PERIOD = 30;

function getEncryptionKey() {
    const value = process.env.CREVIO_2FA_ENCRYPTION_KEY;
    if (!value) throw new Error("CREVIO_2FA_ENCRYPTION_KEY is not configured.");
    if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error("CREVIO_2FA_ENCRYPTION_KEY must be 64 hex characters.");
    return Buffer.from(value, "hex");
}

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
    if (parts.length !== 3) throw new Error("Invalid encrypted TOTP secret.");
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}

function createSecret() {
    return otplib.generateSecret();
}

function createAuthenticatorUri({ secret, email }) {
    return otplib.generateURI({
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

async function verifyToken({ secret, token }) {
    try {
        const clean = String(token || "").replace(/\s/g, "");
        if (!/^\d{6}$/.test(clean)) return false;
        const result = otplib.verify({
            secret,
            token: clean,
            algorithm: ALGORITHM,
            digits: DIGITS,
            period: PERIOD
        });
        if (typeof result === "boolean") return result;
        return result && result.valid === true;
    } catch (e) {
        console.error("[totpService] verifyToken error:", e.message);
        return false;
    }
}

module.exports = {
    createSecret,
    createAuthenticatorUri,
    createQrCode,
    encryptSecret,
    decryptSecret,
    verifyToken
};
