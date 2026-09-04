// =========================================================
// CREVIO — SESSION MODEL
// =========================================================

const crypto = require("crypto");
const db = require("../../database/db");

// =========================================================
// HASH TOKEN
// =========================================================

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// =========================================================
// SESSION MODEL
// =========================================================

const sessionModel = {

    // -----------------------------------------------------
    // CREATE SESSION
    // -----------------------------------------------------

    create({ userId, token, userAgent = null, ipAddress = null, expiresAt }) {
        const tokenHash = hashToken(token);
        const result = db
            .prepare(`
                INSERT INTO sessions (
                    user_id,
                    session_token_hash,
                    user_agent,
                    ip_address,
                    expires_at
                )
                VALUES (?, ?, ?, ?, ?)
            `)
            .run(userId, tokenHash, userAgent, ipAddress, expiresAt);
        return this.findById(result.lastInsertRowid);
    },

    // -----------------------------------------------------
    // FIND BY ID
    // -----------------------------------------------------

    findById(id) {
        return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
    },

    // -----------------------------------------------------
    // FIND BY TOKEN (ACTIVE)
    // -----------------------------------------------------

    findByToken(token) {
        if (!token) return undefined;
        const tokenHash = hashToken(token);
        return db
            .prepare(`
                SELECT * FROM sessions
                WHERE session_token_hash = ?
                AND revoked_at IS NULL
                AND expires_at > CURRENT_TIMESTAMP
                LIMIT 1
            `)
            .get(tokenHash);
    },

    // -----------------------------------------------------
    // FIND ACTIVE BY TOKEN (alias)
    // -----------------------------------------------------

    findActiveByToken(token) {
        return this.findByToken(token);
    },

    // -----------------------------------------------------
    // TOUCH SESSION
    // -----------------------------------------------------

    touch(id) {
        const result = db
            .prepare(`
                UPDATE sessions
                SET last_seen_at = CURRENT_TIMESTAMP
                WHERE id = ? AND revoked_at IS NULL
            `)
            .run(id);
        return result.changes > 0;
    },

    // -----------------------------------------------------
    // REVOKE BY TOKEN
    // -----------------------------------------------------

    revokeByToken(token) {
        if (!token) return false;
        const tokenHash = hashToken(token);
        const result = db
            .prepare(`
                UPDATE sessions
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE session_token_hash = ? AND revoked_at IS NULL
            `)
            .run(tokenHash);
        return result.changes > 0;
    },

    // -----------------------------------------------------
    // REVOKE ALL USER SESSIONS
    // -----------------------------------------------------

    revokeAllForUser(userId) {
        const result = db
            .prepare(`
                UPDATE sessions
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND revoked_at IS NULL
            `)
            .run(userId);
        return result.changes;
    },

    // -----------------------------------------------------
    // GET ALL SESSIONS FOR USER (NEW)
    // -----------------------------------------------------

    getAllForUser(userId) {
        return db
            .prepare(`
                SELECT * FROM sessions
                WHERE user_id = ? AND revoked_at IS NULL
                ORDER BY created_at DESC
            `)
            .all(userId);
    },

    // -----------------------------------------------------
    // CLEANUP EXPIRED / REVOKED
    // -----------------------------------------------------

    cleanupExpired() {
        const result = db
            .prepare(`
                DELETE FROM sessions
                WHERE expires_at <= CURRENT_TIMESTAMP
                OR revoked_at IS NOT NULL
            `)
            .run();
        return result.changes;
    }
};

module.exports = sessionModel;