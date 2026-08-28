// =========================================================
// CREVIO — AUTHENTICATION CONTROLLER
// =========================================================

const bcrypt =
    require("bcrypt");

const jwt =
    require("jsonwebtoken");

const userModel =
    require("../models/userModel");

const sessionModel =
    require("../models/sessionModel");


const JWT_SECRET =
    process.env.JWT_SECRET;


// =========================================================
// SESSION DURATION
// =========================================================

const SESSION_DAYS =
    7;


// =========================================================
// CREATE TOKEN
// =========================================================

function createAccessToken(
    user
) {

    return jwt.sign(

        {

            id:
                user.id,

            username:
                user.username,

            email:
                user.email,

            role:
                user.role ||
                "creator"

        },

        JWT_SECRET,

        {

            expiresIn:
                `${SESSION_DAYS}d`

        }

    );

}


// =========================================================
// GET CLIENT IP
// =========================================================

function getClientIp(
    req
) {

    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];


    if (forwarded) {

        return String(
            forwarded
        )
            .split(",")[0]
            .trim();

    }


    return (
        req.socket?.remoteAddress ||
        null
    );

}


// =========================================================
// LOGIN
// =========================================================

const login =
    async (
        req,
        res
    ) => {

        try {

            const {
                email,
                phone,
                identifier,
                password
            } =
                req.body;


            /*
             * Existing frontend sends "email".
             *
             * New frontend may send "phone"
             * or "identifier".
             *
             * Supporting all three keeps
             * the transition backward-compatible.
             */

            const loginIdentifier =
                identifier ||
                email ||
                phone;


            // =============================================
            // VALIDATION
            // =============================================

            if (
                !loginIdentifier ||
                !password
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Email or phone number and password are required."

                });

            }


            // =============================================
            // FIND USER
            // =============================================

            const user =
                userModel.findByLogin(
                    loginIdentifier
                );


            if (!user) {

                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid email/phone or password."

                });

            }


            // =============================================
            // ACCOUNT STATUS
            // =============================================

            if (
                user.account_status &&
                user.account_status !==
                    "active"
            ) {

                return res.status(
                    403
                ).json({

                    success: false,

                    message:
                        "This account is currently unavailable."

                });

            }


            // =============================================
            // PASSWORD
            // =============================================

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordMatch) {

                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Invalid email/phone or password."

                });

            }


            // =============================================
            // CREATE JWT
            // =============================================

            const token =
                createAccessToken(
                    user
                );


            // =============================================
            // SESSION EXPIRY
            // =============================================

            const expiresAt =
                new Date(
                    Date.now() +
                    (
                        SESSION_DAYS *
                        24 *
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


            // =============================================
            // CREATE SESSION
            // =============================================

            const session =
                sessionModel.create({

                    userId:
                        user.id,

                    token,

                    userAgent:
                        req.headers[
                            "user-agent"
                        ] ||
                        null,

                    ipAddress:
                        getClientIp(
                            req
                        ),

                    expiresAt

                });


            // =============================================
            // RESPONSE
            // =============================================

            return res.json({

                success: true,

                message:
                    "Login successful.",

                token,

                session: {

                    id:
                        session.id,

                    expires_at:
                        session.expires_at

                },

                user: {

                    id:
                        user.id,

                    username:
                        user.username,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    role:
                        user.role ||
                        "creator",

                    display_name:
                        user.display_name,

                    bio:
                        user.bio,

                    profile_image:
                        user.profile_image,

                    location:
                        user.location,

                    email_verified:
                        Boolean(
                            user.email_verified
                        ),

                    phone_verified:
                        Boolean(
                            user.phone_verified
                        ),

                    two_factor_enabled:
                        Boolean(
                            user.two_factor_enabled
                        )

                }

            });


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to login."

            });

        }

    };


// =========================================================
// LOGOUT
// =========================================================

const logout =
    (
        req,
        res
    ) => {

        try {

            const authHeader =
                req.headers.authorization;


            if (
                !authHeader ||
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res.json({

                    success: true,

                    message:
                        "Logged out."

                });

            }


            const token =
                authHeader
                    .slice(
                        7
                    )
                    .trim();


            sessionModel
                .revokeByToken(
                    token
                );


            return res.json({

                success: true,

                message:
                    "Logout successful."

            });


        } catch (error) {

            console.error(
                "Logout error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to logout."

            });

        }

    };


// =========================================================
// LOGOUT ALL SESSIONS
// =========================================================

const logoutAll =
    (
        req,
        res
    ) => {

        try {

            const count =
                sessionModel
                    .revokeAllForUser(
                        req.user.id
                    );


            return res.json({

                success: true,

                message:
                    "All sessions have been logged out.",

                sessions_revoked:
                    count

            });


        } catch (error) {

            console.error(
                "Logout all error:",
                error
            );


            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to logout all sessions."

            });

        }

    };


module.exports = {

    login,

    logout,

    logoutAll

};