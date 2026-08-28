// =========================================================
// CREVIO — DEVELOPMENT TEST PASSWORD RESET
// =========================================================
//
// WARNING:
// This script is for LOCAL DEVELOPMENT ONLY.
//
// It resets the password for the known test account:
// joseph_test@crevio.test
//
// Do NOT use this mechanism in production.
// Production password changes must go through the
// authenticated password-reset/security flow.
//

const bcrypt =
    require("bcrypt");

const db =
    require("./db");


// =========================================================
// TEST ACCOUNT
// =========================================================

const TEST_EMAIL =
    "joseph_test@crevio.test";


// =========================================================
// TEMPORARY DEVELOPMENT PASSWORD
// =========================================================
//
// Use this only for testing.
// You can change it later.
//

const TEMPORARY_PASSWORD =
    "CrevioTest@2026!";


// =========================================================
// PASSWORD HASH
// =========================================================

async function resetPassword() {

    try {

        // -------------------------------------------------
        // Find test account
        // -------------------------------------------------

        const user =
            db
                .prepare(
                    `
                    SELECT
                        id,
                        username,
                        email
                    FROM users
                    WHERE LOWER(email) = LOWER(?)
                    `
                )
                .get(
                    TEST_EMAIL
                );


        if (!user) {

            console.error(
                "❌ Test account was not found."
            );

            process.exitCode =
                1;

            return;

        }


        // -------------------------------------------------
        // Hash password
        // -------------------------------------------------

        const passwordHash =
            await bcrypt.hash(
                TEMPORARY_PASSWORD,
                12
            );


        // -------------------------------------------------
        // Update password
        // -------------------------------------------------

        db
            .prepare(
                `
                UPDATE users

                SET
                    password_hash = ?,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            )
            .run(
                passwordHash,
                user.id
            );


        // -------------------------------------------------
        // Revoke existing sessions
        // -------------------------------------------------
        //
        // This ensures the password reset invalidates
        // previously-created development sessions.
        //

        const sessionsTable =
            db
                .prepare(
                    `
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table'
                    AND name = 'sessions'
                    `
                )
                .get();


        if (sessionsTable) {

            db
                .prepare(
                    `
                    UPDATE sessions

                    SET
                        revoked_at =
                            CURRENT_TIMESTAMP

                    WHERE user_id = ?

                    AND revoked_at IS NULL
                    `
                )
                .run(
                    user.id
                );

        }


        // -------------------------------------------------
        // Success
        // -------------------------------------------------

        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            "CREVIO TEST PASSWORD RESET"
        );
        console.log(
            "=========================================="
        );

        console.log(
            `User: ${user.username}`
        );

        console.log(
            `Email: ${user.email}`
        );

        console.log(
            `Temporary password: ${TEMPORARY_PASSWORD}`
        );

        console.log(
            "=========================================="
        );

        console.log(
            "✅ Password reset successfully."
        );

        console.log(
            "✅ Existing sessions revoked."
        );

        console.log("");

    } catch (error) {

        console.error(
            "❌ Password reset failed:"
        );

        console.error(
            error
        );

        process.exitCode =
            1;

    } finally {

        db.close();

    }

}


// =========================================================
// RUN
// =========================================================

resetPassword();