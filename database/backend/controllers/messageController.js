// =========================================================
// CREVIO — MESSAGE CONTROLLER
// File: backend/controllers/messageController.js
// Real schema:
//   conversations: id, creator_id, client_name, client_email,
//     service_id, project_id, status, source, budget, timeline,
//     notes, starred, archived, created_at, updated_at
//   messages: id, conversation_id, sender_type, content,
//     attachments, read_at, created_at
// =========================================================

const db = require("../../database/db");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// =========================================================
// GET /api/messages/conversations
// List all inquiries for current creator
// =========================================================
exports.getConversations = (req, res) => {
    try {
        const userId = req.user.id;
        const c = cols("conversations");

        if (!c.includes("creator_id")) {
            return res.status(500).json({ success: false, message: "conversations.creator_id missing" });
        }

        const hasStarred  = c.includes("starred");
        const hasArchived = c.includes("archived");

        const orderCol = c.includes("updated_at") ? "COALESCE(c.updated_at, c.created_at)" : "c.created_at";

        const rows = db.prepare(`
            SELECT
                c.id,
                c.creator_id,
                c.client_name,
                c.client_email,
                c.service_id,
                c.project_id,
                c.status,
                c.source,
                c.budget,
                c.timeline,
                c.notes,
                ${hasStarred  ? "c.starred," : "0 AS starred,"}
                ${hasArchived ? "c.archived," : "0 AS archived,"}
                c.created_at,
                c.updated_at,
                (SELECT content    FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                (SELECT COUNT(*)   FROM messages WHERE conversation_id = c.id AND sender_type = 'client' AND read_at IS NULL) AS unread_count
            FROM conversations c
            WHERE c.creator_id = ?
            ORDER BY ${orderCol} DESC
        `).all(userId);

        // Normalize for frontend
        const conversations = rows.map(r => ({
            ...r,
            other_user_name:   r.client_name || "Client",
            other_user_email:  r.client_email || null,
            other_user_avatar: null,
            title:             r.client_name || "Client",
            unread_count:      r.unread_count || 0,
            last_message:      r.last_message || r.notes || "",
            last_message_at:   r.last_message_at || r.created_at
        }));

        res.json({ success: true, conversations });
    } catch (err) {
        console.error("Get conversations error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/messages/conversations/:id
// Get a single inquiry + all messages
// =========================================================
exports.getConversation = (req, res) => {
    try {
        const userId = req.user.id;

        const conv = db.prepare(`
            SELECT * FROM conversations WHERE id = ? AND creator_id = ?
        `).get(req.params.id, userId);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });

        const messages = db.prepare(`
            SELECT id, conversation_id, sender_type, content,
                   attachments, read_at, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        `).all(req.params.id);

        // Normalize for frontend
        const normalizedMessages = messages.map(m => ({
            ...m,
            body:    m.content,
            is_mine: m.sender_type === "creator"
        }));

        const conversation = {
            ...conv,
            other_user_name:   conv.client_name || "Client",
            other_user_email:  conv.client_email || null,
            other_user_avatar: null,
            title:             conv.client_name || "Client"
        };

        // Auto-mark incoming messages as read
        try {
            db.prepare(`
                UPDATE messages SET read_at = CURRENT_TIMESTAMP
                WHERE conversation_id = ? AND sender_type = 'client' AND read_at IS NULL
            `).run(req.params.id);
        } catch (e) { /* ignore */ }

        res.json({ success: true, conversation, messages: normalizedMessages });
    } catch (err) {
        console.error("Get conversation error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/messages/conversations/:id
// Creator replies (sender_type = 'creator')
// =========================================================
exports.sendMessage = (req, res) => {
    try {
        const userId = req.user.id;
        const { body, content } = req.body;
        const text = (body || content || "").trim();
        if (!text) return res.status(400).json({ success: false, message: "Message body required" });

        const conv = db.prepare(
            "SELECT * FROM conversations WHERE id = ? AND creator_id = ?"
        ).get(req.params.id, userId);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });

        const r = db.prepare(`
            INSERT INTO messages (conversation_id, sender_type, content, created_at)
            VALUES (?, 'creator', ?, CURRENT_TIMESTAMP)
        `).run(req.params.id, text);

        try {
            const c = cols("conversations");
            if (c.includes("updated_at")) {
                db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
            }
        } catch (e) { /* ignore */ }

        const message = db.prepare(`
            SELECT id, conversation_id, sender_type, content, attachments, read_at, created_at
            FROM messages WHERE id = ?
        `).get(r.lastInsertRowid);

        res.json({
            success: true,
            message: {
                ...message,
                body:    message.content,
                is_mine: true
            }
        });
    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// POST /api/messages/conversations
// PUBLIC — client inquiry (from portfolio contact form)
// =========================================================
exports.startConversation = (req, res) => {
    try {
        const {
            creator_id, client_name, client_email,
            service_id, project_id, source,
            budget, timeline, notes, message
        } = req.body;

        if (!creator_id || !client_email) {
            return res.status(400).json({ success: false, message: "creator_id and client_email required" });
        }

        // Reuse existing conversation if same client + same service
        let conv = null;
        if (service_id) {
            conv = db.prepare(`
                SELECT * FROM conversations
                WHERE creator_id = ? AND client_email = ? AND service_id = ?
                LIMIT 1
            `).get(creator_id, client_email, service_id);
        } else {
            conv = db.prepare(`
                SELECT * FROM conversations
                WHERE creator_id = ? AND client_email = ?
                LIMIT 1
            `).get(creator_id, client_email);
        }

        if (!conv) {
            const r = db.prepare(`
                INSERT INTO conversations
                    (creator_id, client_name, client_email, service_id, project_id,
                     status, source, budget, timeline, notes, created_at)
                VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(
                creator_id,
                client_name || "Anonymous",
                client_email,
                service_id || null,
                project_id || null,
                source   || "portfolio",
                budget   || null,
                timeline || null,
                notes    || null
            );
            conv = { id: r.lastInsertRowid };
        }

        if (message && message.trim()) {
            db.prepare(`
                INSERT INTO messages (conversation_id, sender_type, content, created_at)
                VALUES (?, 'client', ?, CURRENT_TIMESTAMP)
            `).run(conv.id, message.trim());
        }

        res.json({ success: true, conversation_id: conv.id });
    } catch (err) {
        console.error("Start conversation error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/messages/conversations/:id
// Update status, starred, archived, notes, budget, timeline
// =========================================================
exports.updateConversation = (req, res) => {
    try {
        const userId = req.user.id;
        const c = cols("conversations");
        const allowed = ["status", "starred", "archived", "notes", "budget", "timeline"];
        const updates = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined && c.includes(k)) updates[k] = req.body[k];
        }
        if (!Object.keys(updates).length) {
            return res.json({ success: true, message: "Nothing to update" });
        }

        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates)];

        let sql = `UPDATE conversations SET ${setClauses}`;
        if (c.includes("updated_at")) sql += ", updated_at = CURRENT_TIMESTAMP";
        sql += " WHERE id = ? AND creator_id = ?";
        values.push(req.params.id, userId);

        db.prepare(sql).run(...values);
        res.json({ success: true, message: "Updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// DELETE /api/messages/conversations/:id
// =========================================================
exports.deleteConversation = (req, res) => {
    try {
        const userId = req.user.id;

        const r = db.prepare(
            "DELETE FROM conversations WHERE id = ? AND creator_id = ?"
        ).run(req.params.id, userId);

        if (r.changes === 0) return res.status(404).json({ success: false, message: "Not found" });

        try {
            db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(req.params.id);
        } catch (e) { /* ignore */ }

        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};