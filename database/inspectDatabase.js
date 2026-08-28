const db = require("./db");

console.log("\n========================================");
console.log("        CREVIO DATABASE INSPECTOR");
console.log("========================================\n");

console.log("DATABASE TABLES");
console.log("----------------------------------------");

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
`).all();

console.table(tables);

console.log("\nUSERS");
console.log("----------------------------------------");

const users = db.prepare(`
    SELECT
        id,
        username,
        email,
        display_name,
        bio,
        profile_image,
        location,
        created_at
    FROM users
    ORDER BY id
`).all();

console.table(users);

console.log("\nPROJECTS");
console.log("----------------------------------------");

const projects = db.prepare(`
    SELECT
        id,
        user_id,
        title,
        category,
        client_name,
        year,
        created_at,
        updated_at
    FROM projects
    ORDER BY id
`).all();

console.table(projects);

console.log("\nPROJECT MEDIA");
console.log("----------------------------------------");

const media = db.prepare(`
    SELECT
        id,
        project_id,
        media_type,
        media_url,
        title,
        sort_order,
        created_at
    FROM project_media
    ORDER BY project_id, sort_order
`).all();

console.table(media);

console.log("\nFOREIGN KEYS");
console.log("----------------------------------------");

const projectForeignKeys = db.prepare(`
    PRAGMA foreign_key_list(projects)
`).all();

console.table(projectForeignKeys);

const mediaForeignKeys = db.prepare(`
    PRAGMA foreign_key_list(project_media)
`).all();

console.table(mediaForeignKeys);

console.log("\n========================================");
console.log("       DATABASE INSPECTION COMPLETE");
console.log("========================================\n");

db.close();