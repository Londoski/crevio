// =========================================================
// CREVIO — DATABASE MIGRATION VERIFICATION
// =========================================================

const db = require("./db");

const tables = [
    "users",
    "projects",
    "project_media",
    "social_links",
    "sessions",
    "two_factor_methods",
    "two_factor_recovery_codes",
    "schema_migrations"
];

console.log("\n========================================");
console.log("CREVIO DATABASE VERIFICATION");
console.log("========================================");

for (const table of tables) {

    const exists = db
        .prepare(
            `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name = ?
            `
        )
        .get(table);

    console.log(
        `\nTABLE: ${table}`
    );

    console.log(
        `EXISTS: ${Boolean(exists)}`
    );


    if (!exists) {
        continue;
    }


    const columns =
        db
            .prepare(
                `PRAGMA table_info("${table}")`
            )
            .all()
            .map(
                column => column.name
            );


    console.log(
        "COLUMNS:",
        columns
    );


    const count =
        db
            .prepare(
                `SELECT COUNT(*) AS count FROM "${table}"`
            )
            .get()
            .count;


    console.log(
        "COUNT:",
        count
    );

}


console.log("\n========================================");
console.log("VERIFICATION COMPLETE");
console.log("========================================\n");

db.close();