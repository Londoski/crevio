const db = require("./db");

console.log("\n=== USERS ===");
console.log(
    db.prepare(`
        SELECT id, username, email
        FROM users
        ORDER BY id
    `).all()
);

console.log("\n=== PROJECTS ===");
console.log(
    db.prepare(`
        SELECT id, user_id, title
        FROM projects
        ORDER BY id
    `).all()
);

console.log("\n=== PROJECT MEDIA ===");
console.log(
    db.prepare(`
        SELECT id, project_id, media_type, media_url
        FROM project_media
        ORDER BY id
    `).all()
);

console.log("\n=== TABLES ===");
console.log(
    db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
    `).all()
);