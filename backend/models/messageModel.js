// =========================================================
// CREVIO — MESSAGE MODEL
// =========================================================

const db = require("../../database/db");

const messageModel = {

    // ---- CREATE MESSAGE ----
    create(data) {
        const { conversation_id, sender_type, content, attachments } = data;
        const stmt = db.prepare(`
            INSERT INTO messages (conversation_id, sender_type, content, attachments)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
            conversation_id,
            sender_type,
            content,
            attachments ? JSON.stringify(attachments) : null
        );
        return this.findById(result.lastInsertRowid);
    },

    // ---- FIND BY ID ----
    findById(id) {
        return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id);
    },

    // ---- FIND BY CONVERSATION ----
    findByConversation(conversationId, limit = 50, offset = 0) {
        return db.prepare(`
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            LIMIT ? OFFSET ?
        `).all(conversationId, limit, offset);
    },

    // ---- MARK AS READ (single message) ----
    markAsRead(id) {
        db.prepare(`UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    },

    // ---- DELETE ----
    delete(id) {
        db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
    }
};

module.exports = messageModel;