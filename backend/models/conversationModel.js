// =========================================================
// CREVIO — CONVERSATION MODEL
// =========================================================

const db = require("../../database/db");

const conversationModel = {

    // ---- CREATE CONVERSATION ----
    create(data) {
        const {
            creator_id, client_name, client_email, service_id, project_id,
            source, budget, timeline, notes, status
        } = data;

        const stmt = db.prepare(`
            INSERT INTO conversations (
                creator_id, client_name, client_email, service_id, project_id,
                source, budget, timeline, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            creator_id,
            client_name,
            client_email,
            service_id || null,
            project_id || null,
            source || null,
            budget || null,
            timeline || null,
            notes || null,
            status || 'new_inquiry'
        );
        return this.findById(result.lastInsertRowid);
    },

    // ---- FIND BY ID ----
    findById(id) {
        return db.prepare(`
            SELECT c.*,
                   s.title as service_title,
                   p.name as project_title
            FROM conversations c
            LEFT JOIN services s ON c.service_id = s.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE c.id = ?
        `).get(id);
    },

    // ---- FIND BY CREATOR (with filters) ----
    findByCreator(creatorId, filters = {}) {
        let sql = `
            SELECT c.*,
                   s.title as service_title,
                   p.name as project_title,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND read_at IS NULL AND sender_type = 'client') as unread_count,
                   (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            LEFT JOIN services s ON c.service_id = s.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE c.creator_id = ?
        `;
        const params = [creatorId];

        if (filters.status) {
            sql += ` AND c.status = ?`;
            params.push(filters.status);
        }
        if (filters.archived !== undefined) {
            sql += ` AND c.archived = ?`;
            params.push(filters.archived ? 1 : 0);
        }
        if (filters.starred !== undefined) {
            sql += ` AND c.starred = ?`;
            params.push(filters.starred ? 1 : 0);
        }
        if (filters.search) {
            sql += ` AND (c.client_name LIKE ? OR c.client_email LIKE ?)`;
            const s = `%${filters.search}%`;
            params.push(s, s);
        }

        sql += ` ORDER BY c.updated_at DESC, c.created_at DESC`;

        return db.prepare(sql).all(...params);
    },

    // ---- UPDATE ----
    update(id, data) {
        const fields = [];
        const values = [];
        const allowed = ['status', 'budget', 'timeline', 'notes', 'starred', 'archived'];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (fields.length === 0) return this.findById(id);
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const sql = `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...values);
        return this.findById(id);
    },

    // ---- GET UNREAD COUNT ----
    getUnreadCount(creatorId) {
        const result = db.prepare(`
            SELECT COUNT(*) as count
            FROM conversations c
            JOIN messages m ON c.id = m.conversation_id
            WHERE c.creator_id = ? AND m.sender_type = 'client' AND m.read_at IS NULL
        `).get(creatorId);
        return result ? result.count : 0;
    },

    // ---- MARK AS READ ----
    markAsRead(conversationId, senderType = 'client') {
        db.prepare(`
            UPDATE messages
            SET read_at = CURRENT_TIMESTAMP
            WHERE conversation_id = ? AND sender_type = ? AND read_at IS NULL
        `).run(conversationId, senderType);
    },

    // ---- DELETE ----
    delete(id) {
        db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
    }
};

module.exports = conversationModel;
