const db = require("../../database/db");

const trustedDeviceModel = {
    // ---- Create a trusted device ----
    create({ userId, deviceToken, deviceName, userAgent, ipAddress, expiresAt }) {
        const stmt = db.prepare(`
            INSERT INTO trusted_devices (
                user_id,
                device_token,
                device_name,
                user_agent,
                ip_address,
                expires_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(userId, deviceToken, deviceName || null, userAgent || null, ipAddress || null, expiresAt);
        const id = result.lastInsertRowid;
        return this.findById(id);
    },

    // ---- Find by ID ----
    findById(id) {
        return db
            .prepare(`
                SELECT *
                FROM trusted_devices
                WHERE id = ?
            `)
            .get(id);
    },

    // ---- Find by device token ----
    findByToken(deviceToken) {
        return db
            .prepare(`
                SELECT *
                FROM trusted_devices
                WHERE device_token = ?
                  AND expires_at > CURRENT_TIMESTAMP
                LIMIT 1
            `)
            .get(deviceToken);
    },

    // ---- Find all devices for a user ----
    findByUserId(userId) {
        return db
            .prepare(`
                SELECT *
                FROM trusted_devices
                WHERE user_id = ?
                ORDER BY created_at DESC
            `)
            .all(userId);
    },

    // ---- Update last used timestamp ----
    touch(id) {
        db.prepare(`
            UPDATE trusted_devices
            SET last_used_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
    },

    // ---- Revoke a device ----
    revoke(id) {
        db.prepare(`
            DELETE FROM trusted_devices
            WHERE id = ?
        `).run(id);
    },

    // ---- Revoke all devices for a user ----
    revokeAllForUser(userId) {
        const result = db
            .prepare(`
                DELETE FROM trusted_devices
                WHERE user_id = ?
            `)
            .run(userId);
        return result.changes;
    },

    // ---- Cleanup expired devices ----
    cleanup() {
        const result = db
            .prepare(`
                DELETE FROM trusted_devices
                WHERE expires_at <= CURRENT_TIMESTAMP
            `)
            .run();
        return result.changes;
    }
};

module.exports = trustedDeviceModel;