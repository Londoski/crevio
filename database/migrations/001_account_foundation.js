// =========================================================
// CREVIO — MIGRATION 001
// ACCOUNT + SECURITY FOUNDATION
// =========================================================
//
// This migration safely extends the existing live
// projects.db database.
//
// IMPORTANT:
// - Existing users are preserved.
// - Existing projects are preserved.
// - Existing media is preserved.
// - Existing social links are preserved.
// - The legacy crevio.db is NOT touched.
//
// =========================================================

const db = require("../db");


// =========================================================
// HELPERS
// =========================================================

function getTableColumns(tableName) {

    return db
        .prepare(
            `PRAGMA table_info("${tableName}")`
        )
        .all()
        .map(
            column => column.name
        );

}


function addColumnIfMissing(
    tableName,
    columnName,
    definition
) {

    const columns =
        getTableColumns(
            tableName
        );


    if (
        columns.includes(
            columnName
        )
    ) {

        return false;

    }


    db.exec(
        `
        ALTER TABLE "${tableName}"
        ADD COLUMN "${columnName}"
        ${definition}
        `
    );


    return true;

}


// =========================================================
// MIGRATION
// =========================================================

const migrate =
    db.transaction(
        () => {

            // =================================================
            // USERS
            // =================================================

            addColumnIfMissing(
                "users",
                "role",
                `TEXT NOT NULL DEFAULT 'creator'`
            );


            addColumnIfMissing(
                "users",
                "phone",
                `TEXT`
            );


            addColumnIfMissing(
                "users",
                "email_verified",
                `INTEGER NOT NULL DEFAULT 0`
            );


            addColumnIfMissing(
                "users",
                "phone_verified",
                `INTEGER NOT NULL DEFAULT 0`
            );


            addColumnIfMissing(
                "users",
                "account_status",
                `TEXT NOT NULL DEFAULT 'active'`
            );


            addColumnIfMissing(
                "users",
                "two_factor_enabled",
                `INTEGER NOT NULL DEFAULT 0`
            );


            addColumnIfMissing(
                "users",
                "updated_at",
                `DATETIME`
            );


            // =================================================
            // BACKFILL UPDATED_AT
            // =================================================

            db.prepare(
                `
                UPDATE users

                SET updated_at =
                    COALESCE(
                        updated_at,
                        created_at,
                        CURRENT_TIMESTAMP
                    )

                WHERE updated_at IS NULL
                `
            ).run();


            // =================================================
            // UNIQUE PHONE INDEX
            // =================================================
            //
            // SQLite does not allow adding a UNIQUE
            // constraint to an existing table using a
            // simple ALTER TABLE ADD COLUMN.
            //
            // We therefore use a partial unique index so
            // multiple users may have NULL phone values,
            // while actual phone numbers remain unique.
            //
            // =================================================

            db.exec(
                `
                CREATE UNIQUE INDEX IF NOT EXISTS
                    idx_users_phone_unique
                ON users(phone)
                WHERE phone IS NOT NULL
                `
            );


            // =================================================
            // EMAIL LOOKUP INDEX
            // =================================================

            db.exec(
                `
                CREATE INDEX IF NOT EXISTS
                    idx_users_email
                ON users(email)
                `
            );


            // =================================================
            // USERNAME LOOKUP INDEX
            // =================================================

            db.exec(
                `
                CREATE INDEX IF NOT EXISTS
                    idx_users_username
                ON users(username)
                `
            );


            // =================================================
            // SESSIONS
            // =================================================

            db.exec(
                `
                CREATE TABLE IF NOT EXISTS sessions (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    user_id INTEGER NOT NULL,

                    session_token_hash TEXT NOT NULL UNIQUE,

                    user_agent TEXT,

                    ip_address TEXT,

                    expires_at DATETIME NOT NULL,

                    revoked_at DATETIME,

                    created_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    last_seen_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE

                );
                `
            );


            db.exec(
                `
                CREATE INDEX IF NOT EXISTS
                    idx_sessions_user_id
                ON sessions(user_id)
                `
            );


            db.exec(
                `
                CREATE INDEX IF NOT EXISTS
                    idx_sessions_expires_at
                ON sessions(expires_at)
                `
            );


            // =================================================
            // TWO-FACTOR METHODS
            // =================================================
            //
            // Supported method values will eventually include:
            //
            // email
            // sms
            // authenticator
            //
            // The secret is only used for authenticator/TOTP
            // based methods and must be protected carefully.
            //
            // =================================================

            db.exec(
                `
                CREATE TABLE IF NOT EXISTS
                    two_factor_methods (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    user_id INTEGER NOT NULL,

                    method_type TEXT NOT NULL,

                    label TEXT,

                    secret TEXT,

                    destination TEXT,

                    is_primary INTEGER
                        NOT NULL DEFAULT 0,

                    is_verified INTEGER
                        NOT NULL DEFAULT 0,

                    created_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    updated_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE

                );
                `
            );


            db.exec(
                `
                CREATE INDEX IF NOT EXISTS
                    idx_two_factor_user
                ON two_factor_methods(user_id)
                `
            );


            // =================================================
            // TWO-FACTOR RECOVERY CODES
            // =================================================

            db.exec(
                `
                CREATE TABLE IF NOT EXISTS
                    two_factor_recovery_codes (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    user_id INTEGER NOT NULL,

                    code_hash TEXT NOT NULL,

                    used_at DATETIME,

                    created_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (user_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE

                );
                `
            );


            db.exec(
                `
                CREATE INDEX IF NOT EXISTS
                    idx_recovery_codes_user
                ON two_factor_recovery_codes(user_id)
                `
            );


            // =================================================
            // MIGRATION HISTORY
            // =================================================

            db.exec(
                `
                CREATE TABLE IF NOT EXISTS
                    schema_migrations (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    migration_name TEXT NOT NULL UNIQUE,

                    applied_at DATETIME
                        DEFAULT CURRENT_TIMESTAMP

                );
                `
            );


            db.prepare(
                `
                INSERT OR IGNORE INTO
                    schema_migrations(
                        migration_name
                    )

                VALUES (?)
                `
            ).run(
                "001_account_foundation"
            );

        }
    );


// =========================================================
// RUN
// =========================================================

try {

    migrate();

    console.log(
        "✅ Crevio migration 001 completed successfully."
    );

} catch (error) {

    console.error(
        "❌ Crevio migration 001 failed:"
    );

    console.error(
        error
    );

    process.exitCode =
        1;

}


// =========================================================
// CLOSE
// =========================================================

db.close();