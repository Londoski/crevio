// =========================================================
// CREVIO — TWO FACTOR CONTROLLER
// =========================================================

const crypto =
    require("crypto");

const db =
    require("../../database/db");

const userModel =
    require("../models/userModel");

const twoFactorModel =
    require("../models/twoFactorModel");

const totpService =
    require("../services/totpService");


// =========================================================
// RECOVERY CODE CONFIGURATION
// =========================================================

const RECOVERY_CODE_COUNT =
    10;


// =========================================================
// GENERATE RECOVERY CODE
// =========================================================

function generateRecoveryCode() {

    const raw =
        crypto.randomBytes(
            6
        ).toString(
            "hex"
        ).toUpperCase();


    return (
        raw.slice(0, 4) +
        "-" +
        raw.slice(4, 8) +
        "-" +
        raw.slice(8, 12)
    );

}


// =========================================================
// HASH RECOVERY CODE
// =========================================================

function hashRecoveryCode(
    code
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            String(
                code
            )
                .trim()
                .toUpperCase()
        )
        .digest(
            "hex"
        );

}


// =========================================================
// GENERATE RECOVERY CODES
// =========================================================

function generateRecoveryCodes(
    userId
) {

    const codes = [];


    const transaction =
        db.transaction(
            () => {

                twoFactorModel
                    .deleteRecoveryCodes(
                        userId
                    );


                for (
                    let i = 0;
                    i < RECOVERY_CODE_COUNT;
                    i++
                ) {

                    const code =
                        generateRecoveryCode();


                    const hash =
                        hashRecoveryCode(
                            code
                        );


                    twoFactorModel
                        .createRecoveryCode(
                            userId,
                            hash
                        );


                    codes.push(
                        code
                    );

                }

            }
        );


    transaction();


    return codes;

}


// =========================================================
// ENABLE 2FA SETUP
// =========================================================

const setupAuthenticator =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                req.user.id;


            const user =
                userModel.findById(
                    userId
                );


            if (!user) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            if (
                !user.email_verified
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Verify your email address before setting up an authenticator app."

                });

            }


            const setup =
                await totpService
                    .createSetup({

                        userId,

                        email:
                            user.email

                    });


            return res.json({

                success: true,

                message:
                    "Authenticator setup created. Scan the QR code and verify the code from your authenticator app.",

                setup: {

                    method_id:
                        setup.methodId,

                    secret:
                        setup.secret,

                    uri:
                        setup.uri,

                    qr_code:
                        setup.qrCode

                }

            });


        } catch (error) {

            console.error(
                "2FA setup error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Unable to create authenticator setup."

            });

        }

    };


// =========================================================
// VERIFY AUTHENTICATOR SETUP
// =========================================================

const verifyAuthenticatorSetup =
    async (
        req,
        res
    ) => {

        try {

            const token =
                String(
                    req.body.token ||
                    req.body.code ||
                    ""
                )
                    .replace(
                        /\s/g,
                        ""
                    );


            if (
                !/^\d{6}$/.test(
                    token
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Enter the 6-digit code shown by your authenticator app."

                });

            }


            const result =
                await totpService
                    .verifySetup({

                        userId:
                            req.user.id,

                        token

                    });


            if (
                !result.valid
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        result.reason ===
                        "not_configured"
                            ? "Authenticator setup was not found."
                            : "The authenticator code is invalid or expired."

                });

            }


            userModel
                .setTwoFactorEnabled(
                    req.user.id,
                    true
                );


            const recoveryCodes =
                generateRecoveryCodes(
                    req.user.id
                );


            return res.json({

                success: true,

                message:
                    "Two-factor authentication has been enabled.",

                two_factor_enabled:
                    true,

                recovery_codes:
                    recoveryCodes

            });


        } catch (error) {

            console.error(
                "Verify authenticator setup error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to enable two-factor authentication."

            });

        }

    };


// =========================================================
// DISABLE 2FA
// =========================================================

const disableTwoFactor =
    async (
        req,
        res
    ) => {

        try {

            const token =
                String(
                    req.body.token ||
                    ""
                )
                    .replace(
                        /\s/g,
                        ""
                    );


            if (
                !/^\d{6}$/.test(
                    token
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Enter your current 6-digit authenticator code."

                });

            }


            const valid =
                await totpService
                    .verifyActiveToken({

                        userId:
                            req.user.id,

                        token

                    });


            if (!valid) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "The authenticator code is invalid."

                });

            }


            twoFactorModel
                .deleteAuthenticatorMethod(
                    req.user.id
                );


            twoFactorModel
                .deleteRecoveryCodes(
                    req.user.id
                );


            userModel
                .setTwoFactorEnabled(
                    req.user.id,
                    false
                );


            return res.json({

                success: true,

                message:
                    "Two-factor authentication has been disabled.",

                two_factor_enabled:
                    false

            });


        } catch (error) {

            console.error(
                "Disable 2FA error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to disable two-factor authentication."

            });

        }

    };


// =========================================================
// REGENERATE RECOVERY CODES
// =========================================================

const regenerateRecoveryCodes =
    async (
        req,
        res
    ) => {

        try {

            const user =
                userModel.findById(
                    req.user.id
                );


            if (!user) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            if (
                !user.two_factor_enabled
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Two-factor authentication is not enabled."

                });

            }


            const token =
                String(
                    req.body.token ||
                    ""
                )
                    .replace(
                        /\s/g,
                        ""
                    );


            const valid =
                await totpService
                    .verifyActiveToken({

                        userId:
                            req.user.id,

                        token

                    });


            if (!valid) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "The authenticator code is invalid."

                });

            }


            const recoveryCodes =
                generateRecoveryCodes(
                    req.user.id
                );


            return res.json({

                success: true,

                message:
                    "New recovery codes generated.",

                recovery_codes:
                    recoveryCodes

            });


        } catch (error) {

            console.error(
                "Recovery code regeneration error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to regenerate recovery codes."

            });

        }

    };


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    setupAuthenticator,

    verifyAuthenticatorSetup,

    disableTwoFactor,

    regenerateRecoveryCodes

};