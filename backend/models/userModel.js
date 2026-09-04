// =========================================================
// CREVIO — USER MODEL
// =========================================================

const db = require("../../database/db");

const userModel = {

    // ---- CREATE USER ----
    create(user) {
        const stmt = db.prepare(`
            INSERT INTO users (
                username, email, phone, password_hash,
                display_name, bio, profile_image, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            user.username,
            user.email,
            user.phone || null,
            user.password_hash,
            user.display_name || null,
            user.bio || null,
            user.profile_image || null,
            user.location || null
        );
        return this.findById(result.lastInsertRowid);
    },

    // ---- FIND BY ID ----
    findById(id) {
        return db.prepare(`
            SELECT
                id, username, email, phone, role,
                display_name, bio, profile_image, location,
                email_verified, phone_verified, account_status,
                two_factor_enabled, created_at, updated_at,
                deactivated_at, deletion_requested_at, deletion_scheduled_for, deletion_reason
            FROM users WHERE id = ?
        `).get(id);
    },

    // ---- FIND BY USERNAME ----
    findByUsername(username) {
        return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
    },

    // ---- FIND BY EMAIL ----
    findByEmail(email) {
        return db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email);
    },

    // ---- FIND BY PHONE ----
    findByPhone(phone) {
        return db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
    },

    // ---- FIND BY LOGIN ----
    findByLogin(identifier) {
        const value = String(identifier || "").trim();
        if (!value) return undefined;
        const emailUser = this.findByEmail(value);
        if (emailUser) return emailUser;
        return this.findByPhone(value);
    },

    // ---- UPDATE PROFILE ----
    updateProfile(id, profile) {
        const { display_name, bio, profile_image, location } = profile;
        db.prepare(`
            UPDATE users SET
                display_name = ?, bio = ?, profile_image = ?, location = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(display_name || null, bio || null, profile_image || null, location || null, id);
        return this.findById(id);
    },

    // ---- UPDATE PHONE ----
    updatePhone(id, phone) {
        db.prepare(`UPDATE users SET phone = ?, phone_verified = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(phone || null, id);
        return this.findById(id);
    },

    // ---- MARK EMAIL VERIFIED ----
    markEmailVerified(id) {
    db.prepare(`UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    return this.findById(id);
},

    // ---- MARK PHONE VERIFIED ----
    markPhoneVerified(id) {
    db.prepare(`UPDATE users SET phone_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    return this.findById(id);
},
    // ---- UPDATE 2FA ----
    setTwoFactorEnabled(id, enabled) {
        db.prepare(`UPDATE users SET two_factor_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(enabled ? 1 : 0, id);
        return this.findById(id);
    },

    // ---- SET ACCOUNT STATUS ----
    setAccountStatus(id, status) {
        db.prepare(`UPDATE users SET account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(status, id);
        return this.findById(id);
    },

    // ---- DEACTIVATE ----
    deactivate(id) {
        db.prepare(`
            UPDATE users
            SET account_status = 'deactivated',
                deactivated_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
        return this.code(id);
    },

    // ---- REACTIVATE ----
    reactivate(id) {
        db.prepare(`
            UPDATE users
            SET account_status = 'active',
                deactivated_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
        return this.findById(id);
    },

    // ---- REQUEST DELETION ----
    requestDeletion(id, reason) {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 30);
        const scheduledStr = scheduledDate.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
        db.prepare(`
            UPDATE users
            SET account_status = 'pending_deletion',
                deletion_requested_at = CURRENT_TIMESTAMP,
                deletion_scheduled_for = ?,
                deletion_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(scheduledStr, reason || null, id);
        return this.findById(id);
    },

    // ---- CANCEL DELETION ----
    cancelDeletion(id) {
        db.prepare(`
            UPDATE users
            SET account_status = 'active',
                deletion_requested_at = NULL,
                deletion_scheduled_for = NULL,
                deletion_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);
        return this.findById(id);
    },

    // ---- PERMANENTLY DELETE ----
    permanentlyDelete(id) {
        const user = this.findById(id);
        if (!user) return null;
        db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
        return user;
    }
};

module.exports = userModel;