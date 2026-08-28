// =========================================================
// CREVIO — AUTHENTICATION ROUTES
// =========================================================

const express =
    require("express");


const {

    login,

    logout,

    logoutAll

} =
    require(
        "../controllers/authController"
    );


const authenticateToken =
    require(
        "../middleware/authMiddleware"
    );


const router =
    express.Router();


// =========================================================
// AUTH API TEST
// =========================================================

router.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Crevio Auth API is working."

        });

    }
);


// =========================================================
// LOGIN
// =========================================================

router.post(
    "/login",
    login
);


// =========================================================
// LOGOUT CURRENT SESSION
// =========================================================

router.post(
    "/logout",
    logout
);


// =========================================================
// LOGOUT ALL SESSIONS
// =========================================================

router.post(
    "/logout-all",
    authenticateToken,
    logoutAll
);


// =========================================================
// CURRENT USER
// =========================================================

router.get(
    "/me",
    authenticateToken,
    (req, res) => {

        res.json({

            success: true,

            message:
                "Authentication successful.",

            user:
                req.user

        });

    }
);


module.exports =
    router;