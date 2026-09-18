const db = require("../database/db");

function time(label, sql, params = []) {
    const start = process.hrtime.bigint();
    try {
        const stmt = db.prepare(sql);
        const rows = params.length ? stmt.all(...params) : stmt.all();
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`  ${ms.toFixed(2).padStart(8)} ms  ${label}  (${rows.length} rows)`);
    } catch (e) {
        console.log(`  ERROR  ${label}: ${e.message}`);
    }
}

console.log("\n=== Timings (userId=1, convId=2) ===\n");

time("List conversations (list query)",
    `SELECT c.*,
        (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_type='client' AND read_at IS NULL) AS unread_count
     FROM conversations c
     WHERE c.creator_id = ?`, [1]);

time("Get conversation meta",
    "SELECT * FROM conversations WHERE id=? AND creator_id=?", [2, 1]);

time("Get messages (ascending)",
    "SELECT id, sender_type, content, read_at, delivered_at, created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC", [2]);

time("Count unread per conv",
    "SELECT conversation_id, COUNT(*) FROM messages WHERE sender_type='client' AND read_at IS NULL GROUP BY conversation_id");

time("Mark client messages read",
    "UPDATE messages SET read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND sender_type='client' AND read_at IS NULL", [2]);

console.log("\n=== Existing indexes ===\n");
const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name IN ('messages','conversations')").all();
if (indexes.length === 0) console.log("  (none on messages/conversations)");
else indexes.forEach(i => console.log(`  ${i.tbl_name}.${i.name}`));

console.log("\n=== Row counts ===\n");
console.log("  conversations:", db.prepare("SELECT COUNT(*) c FROM conversations").get().c);
console.log("  messages:     ", db.prepare("SELECT COUNT(*) c FROM messages").get().c);
