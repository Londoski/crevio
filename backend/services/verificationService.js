// =========================================================
// CREVIO — VERIFICATION SERVICE
// =========================================================

const crypto =
    require("crypto");

const db =
    require("../../database/db");


// =========================================================
// CONFIGURATION
// =========================================================

const OTP_LENGTH = 6;

const OTP_EXPIRY_MINUTES = 10;

const VERIFICATION_EXPIRY_HOURS = 24;

const MAX_OTP_ATTEMPTS = 5;


// =========================================================
// HASH VALUE
// =========================================================

function hashValue(
    value
) {

    return crypto
        .createHash("sha256")
        .update(String(value))
        .digest("hex");

}


// =========================================================
// GENERATE OTP
// =========================================================

function generateOtp() {

    const minimum =
        10 ** (OTP_LENGTH - 1);

    const maximum =
        (10 ** OTP_LENGTH) - 1;

    return String(
        crypto.randomInt(
            minimum,
            maximum + 1
        )
    );

}


// =========================================================
// EXPIRY DATE
// =========================================================

function futureDate(
    minutes
) {

    return new Date(
        Date.now() +
        (
            minutes *
            60 *
            1000
        )
    )
        .toISOString()
        .replace(
            "T",
            " "
        )
        .replace(
            /\.\d{3}Z$/,
            ""
        );

}


// =========================================================
// CREATE OTP CHALLENGE
// =========================================================

function createOtpChallenge({

    userId,

    challengeType,

    destination

}) {

    // Remove previous active challenges
    db.prepare(`
        DELETE FROM otp_challenges

        WHERE user_id = ?

        AND challenge_type = ?

        AND verified_at IS NULL

        AND expires_at > CURRENT_TIMESTAMP
    `).run(
        userId,
        challengeType
    );


    const code =
        generateOtp();


    const codeHash =
        hashValue(
            code
        );


    const expiresAt =
        futureDate(
            OTP_EXPIRY_MINUTES
        );


    const result =
        db.prepare(`
            INSERT INTO otp_challenges (
                user_id,
                challenge_type,
                code_hash,
                destination,
                expires_at,
                max_attempts
            )

            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `).run(
            userId,
            challengeType,
            codeHash,
            destination || null,
            expiresAt,
            MAX_OTP_ATTEMPTS
        );


    return {

        id:
            result.lastInsertRowid,

        code,

        expiresAt

    };

}


// =========================================================
// VERIFY OTP
// =========================================================

function verifyOtp({

    userId,

    challengeType,

    code

}) {

    const challenge =
        db.prepare(`
            SELECT
                *
            FROM otp_challenges

            WHERE user_id = ?

            AND challenge_type = ?

            AND verified_at IS NULL

            AND expires_at > CURRENT_TIMESTAMP

            ORDER BY created_at DESC

            LIMIT 1
        `).get(
            userId,
            challengeType
        );


    if (!challenge) {

        return {

            success: false,

            reason:
                "expired_or_missing"

        };

    }


    if (
        challenge.attempts >=
        challenge.max_attempts
    ) {

        return {

            success: false,

            reason:
                "too_many_attempts"

        };

    }


    const incomingHash =
        hashValue(
            code
        );


    if (
        incomingHash !==
        challenge.code_hash
    ) {

        db.prepare(`
            UPDATE otp_challenges

            SET attempts =
                attempts + 1

            WHERE id = ?
        `).run(
            challenge.id
        );


        return {

            success: false,

            reason:
                "invalid_code"

        };

    }


    db.prepare(`
        UPDATE otp_challenges

        SET verified_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
    `).run(
        challenge.id
    );


    return {

        success: true,

        challengeId:
            challenge.id

    };

}


// =========================================================
// DELETE EXPIRED OTPs
// =========================================================

function cleanupExpiredOtps() {

    const result =
        db.prepare(`
            DELETE FROM otp_challenges

            WHERE
                expires_at <= CURRENT_TIMESTAMP

                OR
                verified_at IS NOT NULL
        `).run();


    return result.changes;

}


// =========================================================
// GENERATE VERIFICATION TOKEN
// =========================================================

function createVerificationToken({

    userId,

    tokenType,

    destination

}) {

    const rawToken =
        crypto
            .randomBytes(
                32
            )
            .toString(
                "hex"
            );


    const tokenHash =
        hashValue(
            rawToken
        );


    const expiresAt =
        new Date(
            Date.now() +
            (
                VERIFICATION_EXPIRY_HOURS *
                60 *
                60 *
                1000
            )
        )
            .toISOString()
            .replace(
                "T",
                " "
            )
            .replace(
                /\.\d{3}Z$/,
                ""
            );


    const result =
        db.prepare(`
            INSERT INTO verification_tokens (
                user_id,
                token_hash,
                token_type,
                destination,
                expires_at
            )

            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `).run(
            userId,
            tokenHash,
            tokenType,
            destination || null,
            expiresAt
        );


    return {

        id:
            result.lastInsertRowid,

        token:
            rawToken,

        expiresAt

    };

}


// =========================================================
// VERIFY TOKEN
// =========================================================

function consumeVerificationToken(
    token
) {

    const tokenHash =
        hashValue(
            token
        );


    const record =
        db.prepare(`
            SELECT
                *
            FROM verification_tokens

            WHERE token_hash = ?

            AND used_at IS NULL

            AND expires_at > CURRENT_TIMESTAMP
        `).get(
            tokenHash
        );


    if (!record) {

        return null;

    }


    db.prepare(`
        UPDATE verification_tokens

        SET used_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
    `).run(
        record.id
    );


    return record;

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    generateOtp,

    createOtpChallenge,

    verifyOtp,

    cleanupExpiredOtps,

    createVerificationToken,

    consumeVerificationToken

};