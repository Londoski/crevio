const db = require("../database/db");

// Create notifications table
db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'system',
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);
console.log("✅ notifications table ready");

// Insert a welcome notification for user 1 (if none exists)
const existing = db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = 1").get();
if (existing.c === 0) {
    const r = db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `).run(1, "Welcome to Crevio!", "Your account is ready. Start by adding a project.", "system");
    console.log("✅ Inserted test notification id:", r.lastInsertRowid);
} else {
    console.log("ℹ️ Notifications already exist, skipping seed");
}

console.log("Done.");