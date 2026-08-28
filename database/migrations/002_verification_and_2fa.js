// =========================================================
// CREVIO — MIGRATION 002
// EMAIL / PHONE VERIFICATION + 2FA FOUNDATION
// =========================================================

const db =
    require("../db");


// =========================================================
// HELPERS
// =========================================================

function tableExists(
    tableName
) {

    return Boolean(
        db
            .prepare(
                `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                AND name = ?
                `
            )
            .get(tableName)
    );

}


// =========================================================
// MIGRATION
// =========================================================

const migrate =
    db.transaction(
        () => {

            // =================================================
            // VERIFICATION TOKENS
            // =================================================

            db.exec(`
                CREATE TABLE IF NOT EXISTS verification_tokens (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    user_id INTEGER NOT NULL,

                    token_hash TEXT NOT NULL,

                    token_type TEXT NOT NULL,

                    destination TEXT,

                    expires_at DATETIME NOT NULL,

                    used_at DATETIME,

                    created_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                );
            `);


            db.exec(`
                CREATE INDEX IF NOT EXISTS
                    idx_verification_user
                ON verification_tokens(user_id);
            `);


            db.exec(`
                CREATE INDEX IF NOT EXISTS
                    idx_verification_expires
                ON verification_tokens(expires_at);
            `);


            // =================================================
            // ONE-TIME PASSWORDS
            // =================================================
            //
            // Used for:
            // email OTP
            // SMS OTP
            // login verification
            // 2FA challenges
            //
            // OTPs are stored as hashes, not plaintext.
            //

            db.exec(`
                CREATE TABLE IF NOT EXISTS otp_challenges (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    user_id INTEGER NOT NULL,

                    challenge_type TEXT NOT NULL,

                    code_hash TEXT NOT NULL,

                    destination TEXT,

                    expires_at DATETIME NOT NULL,

                    attempts INTEGER NOT NULL DEFAULT 0,

                    max_attempts INTEGER NOT NULL DEFAULT 5,

                    verified_at DATETIME,

                    created_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                );
            `);


            db.exec(`
                CREATE INDEX IF NOT EXISTS
                    idx_otp_user
                ON otp_challenges(user_id);
            `);


            db.exec(`
                CREATE INDEX IF NOT EXISTS
                    idx_otp_expires
                ON otp_challenges(expires_at);
            `);


            // =================================================
            // MIGRATION HISTORY
            // =================================================

            db.exec(`
                CREATE TABLE IF NOT EXISTS schema_migrations (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    migration_name TEXT NOT NULL UNIQUE,

                    applied_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP
                );
            `);


            db.prepare(`
                INSERT OR IGNORE INTO
                    schema_migrations(
                        migration_name
                    )
                VALUES (?)
            `).run(
                "002_verification_and_2fa"
            );

        }
    );


// =========================================================
// RUN
// =========================================================

try {

    migrate();

    console.log(
        "✅ Crevio migration 002 completed successfully."
    );

} catch (error) {

    console.error(
        "❌ Crevio migration 002 failed:"
    );

    console.error(
        error
    );

    process.exitCode = 1;

}


// =========================================================
// CLOSE
// =========================================================

db.close();