// =========================================================
// SEED TEST NOTIFICATION
// File: scripts/seed-notification.js
// =========================================================

const db = require("../database/db");

// 1. Ensure the table exists
db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'system',
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// 2. Insert a test notification for user 1
const r = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
`).run(
    1,
    "Welcome to Crevio!",
    "Your account is ready. Start by adding a project.",
    "system"
);

console.log("✅ Seeded notification id:", r.lastInsertRowid);