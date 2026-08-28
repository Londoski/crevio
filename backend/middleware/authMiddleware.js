// =========================================================
// CREVIO — AUTHENTICATION MIDDLEWARE
// =========================================================

const jwt =
    require("jsonwebtoken");

const sessionModel =
    require("../models/sessionModel");


// =========================================================
// JWT SECRET
// =========================================================

const JWT_SECRET =
    process.env.JWT_SECRET;


// =========================================================
// VALIDATE CONFIGURATION
// =========================================================

if (!JWT_SECRET) {

    console.error(
        "JWT_SECRET is not configured."
    );

}


// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================

function authMiddleware(
    req,
    res,
    next
) {

    try {

        // =============================================
        // CHECK JWT CONFIGURATION
        // =============================================

        if (!JWT_SECRET) {

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Authentication service is not configured."

            });

        }


        // =============================================
        // GET AUTHORIZATION HEADER
        // =============================================

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith(
                "Bearer "
            )
        ) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        // =============================================
        // EXTRACT TOKEN
        // =============================================

        const token =
            authHeader
                .slice(7)
                .trim();


        if (!token) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Authentication token is missing."

            });

        }


        // =============================================
        // VERIFY JWT
        // =============================================

        let decoded;

        try {

            decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );

        } catch (error) {

            console.error(
                "JWT verification error:",
                error.message
            );

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Invalid or expired authentication token."

            });

        }


        // =============================================
        // VALIDATE JWT PAYLOAD
        // =============================================

        if (
            !decoded ||
            !decoded.id
        ) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Invalid authentication token."

            });

        }


        // =============================================
        // CHECK DATABASE SESSION
        // =============================================

        const session =
            sessionModel.findByToken(
                token
            );


        if (!session) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Your session is no longer valid."

            });

        }


        // =============================================
        // CHECK SESSION EXPIRATION
        // =============================================

        if (
            session.expires_at
        ) {

            const expiresAt =
                new Date(
                    session.expires_at
                );


            if (
                !Number.isNaN(
                    expiresAt.getTime()
                ) &&
                expiresAt.getTime() <=
                    Date.now()
            ) {

                return res.status(
                    401
                ).json({

                    success: false,

                    message:
                        "Your session has expired."

                });

            }

        }


        // =============================================
        // CHECK SESSION USER
        // =============================================

        if (
            String(
                session.user_id
            ) !==
            String(
                decoded.id
            )
        ) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Invalid authentication session."

            });

        }


        // =============================================
        // ATTACH USER TO REQUEST
        // =============================================

        req.user = {

            id:
                decoded.id,

            username:
                decoded.username,

            email:
                decoded.email,

            role:
                decoded.role ||
                "creator"

        };


        // =============================================
        // ATTACH TOKEN
        // =============================================

        req.token =
            token;


        // =============================================
        // CONTINUE
        // =============================================

        return next();

    } catch (error) {

        console.error(
            "Authentication middleware error:",
            error
        );


        return res.status(
            500
        ).json({

            success: false,

            message:
                "Authentication service error."

        });

    }

}


// =========================================================
// EXPORT
// =========================================================

module.exports =
    authMiddleware;