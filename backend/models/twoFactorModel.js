// =========================================================
// CREVIO — TWO FACTOR MODEL
// =========================================================

const db =
    require("../../database/db");


// =========================================================
// FIND AUTHENTICATOR METHOD
// =========================================================

function findAuthenticatorMethod(
    userId
) {

    return db
        .prepare(
            `
            SELECT
                *

            FROM two_factor_methods

            WHERE user_id = ?

            AND method_type =
                'authenticator'

            ORDER BY id DESC

            LIMIT 1
            `
        )
        .get(
            userId
        );

}


// =========================================================
// CREATE AUTHENTICATOR METHOD
// =========================================================

function createAuthenticatorMethod({

    userId,

    label,

    encryptedSecret

}) {

    const existing =
        findAuthenticatorMethod(
            userId
        );


    if (existing) {

        db
            .prepare(
                `
                DELETE FROM
                    two_factor_methods

                WHERE id = ?
                `
            )
            .run(
                existing.id
            );

    }


    const result =
        db
            .prepare(
                `
                INSERT INTO two_factor_methods (
                    user_id,
                    method_type,
                    label,
                    secret,
                    is_primary,
                    is_verified
                )

                VALUES (
                    ?,
                    'authenticator',
                    ?,
                    ?,
                    1,
                    0
                )
                `
            )
            .run(
                userId,
                label,
                encryptedSecret
            );


    return findById(
        result.lastInsertRowid
    );

}


// =========================================================
// FIND BY ID
// =========================================================

function findById(
    id
) {

    return db
        .prepare(
            `
            SELECT *
            FROM two_factor_methods
            WHERE id = ?
            `
        )
        .get(
            id
        );

}


// =========================================================
// VERIFY METHOD
// =========================================================

function markVerified(
    id
) {

    db
        .prepare(
            `
            UPDATE two_factor_methods

            SET
                is_verified = 1,
                is_primary = 1,
                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = ?
            `
        )
        .run(
            id
        );


    return findById(
        id
    );

}


// =========================================================
// DELETE AUTHENTICATOR METHOD
// =========================================================

function deleteAuthenticatorMethod(
    userId
) {

    const result =
        db
            .prepare(
                `
                DELETE FROM
                    two_factor_methods

                WHERE user_id = ?

                AND method_type =
                    'authenticator'
                `
            )
            .run(
                userId
            );


    return result.changes;

}


// =========================================================
// RECOVERY CODES
// =========================================================

function deleteRecoveryCodes(
    userId
) {

    db
        .prepare(
            `
            DELETE FROM
                two_factor_recovery_codes

            WHERE user_id = ?
            `
        )
        .run(
            userId
        );

}


function createRecoveryCode(
    userId,
    codeHash
) {

    const result =
        db
            .prepare(
                `
                INSERT INTO
                    two_factor_recovery_codes (
                        user_id,
                        code_hash
                    )

                VALUES (
                    ?,
                    ?
                )
                `
            )
            .run(
                userId,
                codeHash
            );


    return result.lastInsertRowid;

}


function findUnusedRecoveryCodes(
    userId
) {

    return db
        .prepare(
            `
            SELECT
                *

            FROM two_factor_recovery_codes

            WHERE user_id = ?

            AND used_at IS NULL

            ORDER BY id ASC
            `
        )
        .all(
            userId
        );

}


function markRecoveryCodeUsed(
    id
) {

    const result =
        db
            .prepare(
                `
                UPDATE
                    two_factor_recovery_codes

                SET
                    used_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?

                AND used_at IS NULL
                `
            )
            .run(
                id
            );


    return result.changes > 0;

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    findAuthenticatorMethod,

    createAuthenticatorMethod,

    findById,

    markVerified,

    deleteAuthenticatorMethod,

    deleteRecoveryCodes,

    createRecoveryCode,

    findUnusedRecoveryCodes,

    markRecoveryCodeUsed

};