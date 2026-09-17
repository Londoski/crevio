// =========================================================
// SEED TEST CONVERSATION
// File: scripts/seed-conversation.js
// =========================================================

const db = require("../database/db");

// 1. Create the conversation
const r = db.prepare(`
    INSERT INTO conversations
        (creator_id, client_name, client_email, service_id, status, source, notes, created_at)
    VALUES (?, ?, ?, ?, 'new', 'portfolio', ?, CURRENT_TIMESTAMP)
`).run(
    1,
    "Jane Client",
    "jane@example.com",
    null,
    "Looking for a video edit for my startup."
);

// 2. Insert first client message
db.prepare(`
    INSERT INTO messages (conversation_id, sender_type, content, created_at)
    VALUES (?, 'client', ?, CURRENT_TIMESTAMP)
`).run(r.lastInsertRowid, "Hi! Can you edit a 2-minute promo video?");

// 3. Insert follow-up client message
db.prepare(`
    INSERT INTO messages (conversation_id, sender_type, content, created_at)
    VALUES (?, 'client', ?, CURRENT_TIMESTAMP)
`).run(r.lastInsertRowid, "Budget is around $500, timeline is 2 weeks.");

console.log("✅ Seeded conversation id:", r.lastInsertRowid);