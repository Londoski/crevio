// =========================================================
// CREVIO — VERIFICATION CONTROLLER
// =========================================================

const userModel =
    require("../models/userModel");

const verificationService =
    require("../services/verificationService");

const notificationDelivery =
    require("../services/notificationDeliveryService");


// =========================================================
// BASIC EMAIL VALIDATION
// =========================================================

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            String(email || "").trim()
        );

}


// =========================================================
// BASIC PHONE VALIDATION
// =========================================================
//
// Accepts international-style numbers.
// We will normalize phone numbers more strictly when we
// add the production phone-number provider.
//

function isValidPhone(
    phone
) {

    return /^\+?[1-9]\d{7,14}$/
        .test(
            String(phone || "")
                .replace(
                    /[\s()-]/g,
                    ""
                )
        );

}


// =========================================================
// NORMALIZE PHONE
// =========================================================

function normalizePhone(
    phone
) {

    return String(
        phone || ""
    )
        .replace(
            /[\s()-]/g,
            ""
        );

}


// =========================================================
// START EMAIL VERIFICATION
// =========================================================

const startEmailVerification =
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
                !user.email
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "This account does not have an email address."

                });

            }


            if (
                Boolean(
                    user.email_verified
                )
            ) {

                return res.json({

                    success: true,

                    already_verified:
                        true,

                    message:
                        "Email address is already verified."

                });

            }


            const challenge =
                verificationService
                    .createOtpChallenge({

                        userId,

                        challengeType:
                            "email_verification",

                        destination:
                            user.email

                    });


            await notificationDelivery
                .sendEmailVerificationCode({

                    email:
                        user.email,

                    code:
                        challenge.code

                });


            return res.json({

                success: true,

                message:
                    "Email verification code generated.",

                expires_at:
                    challenge.expiresAt

            });


        } catch (error) {

            console.error(
                "Start email verification error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Unable to start email verification."

            });

        }

    };


// =========================================================
// VERIFY EMAIL
// =========================================================

const verifyEmail =
    async (
        req,
        res
    ) => {

        try {

            const userId =
                req.user.id;


            const code =
                String(
                    req.body.code ||
                    ""
                ).trim();


            if (
                !/^\d{6}$/.test(
                    code
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "A valid 6-digit verification code is required."

                });

            }


            const result =
                verificationService
                    .verifyOtp({

                        userId,

                        challengeType:
                            "email_verification",

                        code

                    });


            if (
                !result.success
            ) {

                const messages = {

                    expired_or_missing:
                        "The verification code has expired or does not exist.",

                    too_many_attempts:
                        "Too many verification attempts. Please request a new code.",

                    invalid_code:
                        "The verification code is incorrect."

                };


                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        messages[
                            result.reason
                        ] ||
                        "Unable to verify email."

                });

            }


            const user =
                userModel
                    .markEmailVerified(
                        userId
                    );


            return res.json({

                success: true,

                message:
                    "Email address verified successfully.",

                user: {

                    id:
                        user.id,

                    email:
                        user.email,

                    email_verified:
                        true

                }

            });


        } catch (error) {

            console.error(
                "Verify email error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to verify email."

            });

        }

    };


// =========================================================
// SAVE / UPDATE PHONE
// =========================================================

const setPhone =
    async (
        req,
        res
    ) => {

        try {

            const phone =
                normalizePhone(
                    req.body.phone
                );


            if (
                !isValidPhone(
                    phone
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Enter a valid phone number in international format."

                });

            }


            const existing =
                userModel.findByPhone(
                    phone
                );


            if (
                existing &&
                existing.id !==
                    req.user.id
            ) {

                return res.status(
                    409
                ).json({

                    success: false,

                    message:
                        "That phone number is already associated with another account."

                });

            }


            const user =
                userModel.updatePhone(
                    req.user.id,
                    phone
                );


            return res.json({

                success: true,

                message:
                    "Phone number saved. Verification is required.",

                user: {

                    id:
                        user.id,

                    phone:
                        user.phone,

                    phone_verified:
                        Boolean(
                            user.phone_verified
                        )

                }

            });


        } catch (error) {

            console.error(
                "Set phone error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to save phone number."

            });

        }

    };


// =========================================================
// START PHONE VERIFICATION
// =========================================================

const startPhoneVerification =
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


            if (!user.phone) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Add a phone number before requesting verification."

                });

            }


            if (
                Boolean(
                    user.phone_verified
                )
            ) {

                return res.json({

                    success: true,

                    already_verified:
                        true,

                    message:
                        "Phone number is already verified."

                });

            }


            const challenge =
                verificationService
                    .createOtpChallenge({

                        userId:
                            user.id,

                        challengeType:
                            "phone_verification",

                        destination:
                            user.phone

                    });


            await notificationDelivery
                .sendSmsVerificationCode({

                    phone:
                        user.phone,

                    code:
                        challenge.code

                });


            return res.json({

                success: true,

                message:
                    "Phone verification code generated.",

                expires_at:
                    challenge.expiresAt

            });


        } catch (error) {

            console.error(
                "Start phone verification error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    error.message ||
                    "Unable to start phone verification."

            });

        }

    };


// =========================================================
// VERIFY PHONE
// =========================================================

const verifyPhone =
    async (
        req,
        res
    ) => {

        try {

            const code =
                String(
                    req.body.code ||
                    ""
                ).trim();


            if (
                !/^\d{6}$/.test(
                    code
                )
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "A valid 6-digit verification code is required."

                });

            }


            const result =
                verificationService
                    .verifyOtp({

                        userId:
                            req.user.id,

                        challengeType:
                            "phone_verification",

                        code

                    });


            if (
                !result.success
            ) {

                const messages = {

                    expired_or_missing:
                        "The verification code has expired or does not exist.",

                    too_many_attempts:
                        "Too many verification attempts. Please request a new code.",

                    invalid_code:
                        "The verification code is incorrect."

                };


                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        messages[
                            result.reason
                        ] ||
                        "Unable to verify phone."

                });

            }


            const user =
                userModel
                    .markPhoneVerified(
                        req.user.id
                    );


            return res.json({

                success: true,

                message:
                    "Phone number verified successfully.",

                user: {

                    id:
                        user.id,

                    phone:
                        user.phone,

                    phone_verified:
                        true

                }

            });


        } catch (error) {

            console.error(
                "Verify phone error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to verify phone."

            });

        }

    };


// =========================================================
// GET SECURITY STATUS
// =========================================================

const getSecurityStatus =
    (
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


            return res.json({

                success: true,

                security: {

                    email: {

                        address:
                            user.email,

                        verified:
                            Boolean(
                                user.email_verified
                            )

                    },

                    phone: {

                        number:
                            user.phone,

                        verified:
                            Boolean(
                                user.phone_verified
                            )

                    },

                    two_factor_enabled:
                        Boolean(
                            user.two_factor_enabled
                        )

                }

            });


        } catch (error) {

            console.error(
                "Get security status error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to load security status."

            });

        }

    };


module.exports = {

    startEmailVerification,

    verifyEmail,

    setPhone,

    startPhoneVerification,

    verifyPhone,

    getSecurityStatus

};