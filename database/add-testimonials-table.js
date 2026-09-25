// =========================================================
// CREVIO — Add testimonials table (run once)
// File: database/add-testimonials-table.js
// =========================================================
const db = require("./db");

db.exec(`
CREATE TABLE IF NOT EXISTS testimonials (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    quote           TEXT NOT NULL,
    author_name     TEXT NOT NULL,
    author_role     TEXT,
    author_company  TEXT,
    author_avatar   TEXT,
    display_order   INTEGER DEFAULT 0,
    is_visible      INTEGER DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_testimonials_user
    ON testimonials(user_id, is_visible, display_order);
`);

const cols = db.prepare("PRAGMA table_info(testimonials)").all().map(c => c.name);
console.log("testimonials table ready — columns:", cols.join(", "));