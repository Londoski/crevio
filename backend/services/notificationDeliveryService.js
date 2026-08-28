// =========================================================
// CREVIO — NOTIFICATION DELIVERY SERVICE
// =========================================================
//
// Development-safe delivery abstraction.
//
// In development:
// - Generates/stores codes normally.
// - Logs delivery information to the server console.
//
// In production:
// - Refuses to pretend an email/SMS was sent until a real
//   provider is configured.
//
// This prevents us from accidentally building a fake
// authentication system that appears to work.
//

const NODE_ENV =
    process.env.NODE_ENV || "development";


// =========================================================
// MASK EMAIL
// =========================================================

function maskEmail(
    email
) {

    if (!email) {
        return null;
    }


    const value =
        String(email).trim();


    const parts =
        value.split("@");


    if (
        parts.length !== 2
    ) {

        return "***";

    }


    const local =
        parts[0];

    const domain =
        parts[1];


    if (
        local.length <= 2
    ) {

        return (
            local.charAt(0) +
            "***@" +
            domain
        );

    }


    return (
        local.substring(
            0,
            2
        ) +
        "***@" +
        domain
    );

}


// =========================================================
// MASK PHONE
// =========================================================

function maskPhone(
    phone
) {

    if (!phone) {
        return null;
    }


    const value =
        String(phone).trim();


    if (
        value.length <= 4
    ) {

        return "***";

    }


    return (
        "*".repeat(
            Math.max(
                value.length - 4,
                2
            )
        ) +
        value.slice(-4)
    );

}


// =========================================================
// DEVELOPMENT EMAIL
// =========================================================

async function sendEmailVerificationCode({

    email,

    code

}) {

    if (
        NODE_ENV !==
        "production"
    ) {

        console.log(
            "\n📧 CREVIO DEV EMAIL"
        );

        console.log(
            `To: ${maskEmail(email)}`
        );

        console.log(
            `Verification code: ${code}`
        );

        console.log(
            "Replace this development transport with a real email provider before production.\n"
        );


        return {

            delivered:
                true,

            development:
                true

        };

    }


    throw new Error(
        "Email delivery provider is not configured for production."
    );

}


// =========================================================
// DEVELOPMENT SMS
// =========================================================

async function sendSmsVerificationCode({

    phone,

    code

}) {

    if (
        NODE_ENV !==
        "production"
    ) {

        console.log(
            "\n📱 CREVIO DEV SMS"
        );

        console.log(
            `To: ${maskPhone(phone)}`
        );

        console.log(
            `Verification code: ${code}`
        );

        console.log(
            "Replace this development transport with a real SMS provider before production.\n"
        );


        return {

            delivered:
                true,

            development:
                true

        };

    }


    throw new Error(
        "SMS delivery provider is not configured for production."
    );

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    sendEmailVerificationCode,

    sendSmsVerificationCode

};