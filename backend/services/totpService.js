// =========================================================
// CREVIO — TOTP SERVICE
// =========================================================
//
// Uses current otplib functional APIs.
//
// TOTP defaults used here are intentionally compatible
// with mainstream authenticator applications:
//
// SHA-1
// 6 digits
// 30 second period
//
// =========================================================

const crypto =
    require("crypto");

const {
    generateSecret,
    verify,
    generateURI
} =
    require("otplib");

const QRCode =
    require("qrcode");


const twoFactorModel =
    require("../models/twoFactorModel");


// =========================================================
// CONFIGURATION
// =========================================================

const ISSUER =
    "Crevio";

const ALGORITHM =
    "sha1";

const DIGITS =
    6;

const PERIOD =
    30;


// =========================================================
// ENCRYPTION KEY
// =========================================================

function getEncryptionKey() {

    const value =
        process.env.CREVIO_2FA_ENCRYPTION_KEY;


    if (!value) {

        throw new Error(
            "CREVIO_2FA_ENCRYPTION_KEY is not configured."
        );

    }


    if (
        !/^[0-9a-fA-F]{64}$/.test(
            value
        )
    ) {

        throw new Error(
            "CREVIO_2FA_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters."
        );

    }


    return Buffer.from(
        value,
        "hex"
    );

}


// =========================================================
// ENCRYPT SECRET
// =========================================================

function encryptSecret(
    secret
) {

    const key =
        getEncryptionKey();


    const iv =
        crypto.randomBytes(
            12
        );


    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    const encrypted =
        Buffer.concat([
            cipher.update(
                secret,
                "utf8"
            ),
            cipher.final()
        ]);


    const authTag =
        cipher.getAuthTag();


    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        encrypted.toString("base64")
    ].join(
        "."
    );

}


// =========================================================
// DECRYPT SECRET
// =========================================================

function decryptSecret(
    encryptedValue
) {

    const key =
        getEncryptionKey();


    const parts =
        String(
            encryptedValue
        ).split(
            "."
        );


    if (
        parts.length !== 3
    ) {

        throw new Error(
            "Invalid encrypted TOTP secret."
        );

    }


    const iv =
        Buffer.from(
            parts[0],
            "base64"
        );


    const authTag =
        Buffer.from(
            parts[1],
            "base64"
        );


    const encrypted =
        Buffer.from(
            parts[2],
            "base64"
        );


    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    decipher.setAuthTag(
        authTag
    );


    const decrypted =
        Buffer.concat([
            decipher.update(
                encrypted
            ),
            decipher.final()
        ]);


    return decrypted.toString(
        "utf8"
    );

}


// =========================================================
// GENERATE SECRET
// =========================================================

function createSecret() {

    return generateSecret();

}


// =========================================================
// GENERATE AUTHENTICATOR URI
// =========================================================

function createAuthenticatorUri({

    secret,

    email

}) {

    return generateURI({

        issuer:
            ISSUER,

        label:
            email,

        secret,

        algorithm:
            ALGORITHM,

        digits:
            DIGITS,

        period:
            PERIOD

    });

}


// =========================================================
// GENERATE QR CODE
// =========================================================

async function createQrCode(
    uri
) {

    return QRCode.toDataURL(
        uri,
        {
            errorCorrectionLevel:
                "M",

            margin:
                2,

            width:
                280
        }
    );

}


// =========================================================
// VERIFY TOKEN
// =========================================================

async function verifyToken({

    secret,

    token

}) {

    const result =
        await verify({

            secret,

            token,

            algorithm:
                ALGORITHM,

            digits:
                DIGITS,

            period:
                PERIOD

        });


    return Boolean(
        result.valid
    );

}


// =========================================================
// CREATE USER SETUP
// =========================================================

async function createSetup({

    userId,

    email

}) {

    const secret =
        createSecret();


    const encryptedSecret =
        encryptSecret(
            secret
        );


    const label =
        email ||
        `user-${userId}`;


    const uri =
        createAuthenticatorUri({

            secret,

            email:
                label

        });


    const qrCode =
        await createQrCode(
            uri
        );


    const method =
        twoFactorModel
            .createAuthenticatorMethod({

                userId,

                label,

                encryptedSecret

            });


    return {

        methodId:
            method.id,

        secret,

        uri,

        qrCode

    };

}


// =========================================================
// GET STORED SECRET
// =========================================================

function getUserSecret(
    userId
) {

    const method =
        twoFactorModel
            .findAuthenticatorMethod(
                userId
            );


    if (!method) {

        return null;

    }


    if (
        !method.secret
    ) {

        return null;

    }


    return {

        method,

        secret:
            decryptSecret(
                method.secret
            )

    };

}


// =========================================================
// VERIFY SETUP
// =========================================================

async function verifySetup({

    userId,

    token

}) {

    const stored =
        getUserSecret(
            userId
        );


    if (!stored) {

        return {

            valid: false,

            reason:
                "not_configured"

        };

    }


    const valid =
        await verifyToken({

            secret:
                stored.secret,

            token

        });


    if (!valid) {

        return {

            valid: false,

            reason:
                "invalid_code"

        };

    }


    twoFactorModel
        .markVerified(
            stored.method.id
        );


    return {

        valid: true,

        method:
            twoFactorModel
                .findById(
                    stored.method.id
                )

    };

}


// =========================================================
// VERIFY ACTIVE 2FA
// =========================================================

async function verifyActiveToken({

    userId,

    token

}) {

    const stored =
        getUserSecret(
            userId
        );


    if (!stored) {

        return false;

    }


    if (
        !stored.method.is_verified
    ) {

        return false;

    }


    return verifyToken({

        secret:
            stored.secret,

        token

    });

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    createSetup,

    verifySetup,

    verifyActiveToken,

    getUserSecret,

    encryptSecret,

    decryptSecret

};