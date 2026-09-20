// CREVIO — PASSWORD HISTORY SERVICE
// Blocks reuse of the last N passwords (current + 5 previous).
// Stores bcrypt hashes only — never plaintext.
const bcrypt = require("bcrypt");
const db = require("../../database/db");

const HISTORY_LIMIT = 5;

async function isPasswordReused(userId, plaintext) {
    if (!userId || !plaintext) return false;

    // 1. Check current password
    try {
        const user = db.prepare("SELECT password_hash, password FROM users WHERE id = ?").get(userId);
        const currentHash = user && (user.password_hash || user.password);
        if (currentHash && await bcrypt.compare(plaintext, currentHash)) return true;
    } catch (e) { console.error("[passwordHistory] current check failed:", e.message); }

    // 2. Check history
    try {
        const rows = db.prepare(
            "SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT ?"
        ).all(userId, HISTORY_LIMIT);
        for (const row of rows) {
            if (await bcrypt.compare(plaintext, row.password_hash)) return true;
        }
    } catch (e) { console.error("[passwordHistory] history check failed:", e.message); }

    return false;
}

function recordPasswordChange(userId, oldHash) {
    if (!userId || !oldHash) return;
    try {
        db.prepare("INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)").run(userId, oldHash);
        db.prepare(
            "DELETE FROM password_history WHERE user_id = ? AND id NOT IN (" +
            "  SELECT id FROM password_history WHERE user_id = ? ORDER BY id DESC LIMIT ?" +
            ")"
        ).run(userId, userId, HISTORY_LIMIT);
    } catch (e) { console.error("[passwordHistory] record failed:", e.message); }
}

function getCurrentHash(userId) {
    try {
        const user = db.prepare("SELECT password_hash, password FROM users WHERE id = ?").get(userId);
        return user ? (user.password_hash || user.password) : null;
    } catch (e) { return null; }
}

module.exports = { isPasswordReused, recordPasswordChange, getCurrentHash, HISTORY_LIMIT };
