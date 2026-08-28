// =========================================================
// CREVIO — SERVER
// =========================================================

require("dotenv").config();

const express =
    require("express");

const path =
    require("path");


// =========================================================
// ROUTES
// =========================================================

const projectRoutes =
    require("./routes/projectRoutes");

const userRoutes =
    require("./routes/userRoutes");

const authRoutes =
    require("./routes/authRoutes");

const verificationRoutes =
    require("./routes/verificationRoutes");

const twoFactorRoutes =
    require("./routes/twoFactorRoutes");

const projectMediaRoutes =
    require("./routes/mediaRoutes");

const dashboardRoutes =
    require("./routes/dashboardRoutes");

const socialLinksRoutes =
    require("./routes/socialLinksRoutes");

const publicSocialLinksRoutes =
    require("./routes/publicSocialLinksRoutes");

const publicProjectRoutes =
    require("./routes/publicProjectRoutes");


// =========================================================
// DATABASE
// =========================================================
//
// The live Crevio database is:
//
// database/projects.db
//
// database/schema.js loads database/db.js.
//

require("../database/schema");


// =========================================================
// EXPRESS APP
// =========================================================

const app =
    express();

const PORT =
    process.env.PORT || 3000;


// =========================================================
// GLOBAL MIDDLEWARE
// =========================================================


// ---------------------------------------------------------
// JSON REQUESTS
// ---------------------------------------------------------

app.use(
    express.json()
);


// ---------------------------------------------------------
// FORM SUBMISSIONS
// ---------------------------------------------------------

app.use(
    express.urlencoded({
        extended: true
    })
);


// ---------------------------------------------------------
// DEVELOPMENT CACHE CONTROL
// ---------------------------------------------------------

app.use(
    (req, res, next) => {

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.setHeader(
            "Pragma",
            "no-cache"
        );

        res.setHeader(
            "Expires",
            "0"
        );

        next();

    }
);


// =========================================================
// REQUEST LOGGER
// =========================================================

app.use(
    (req, res, next) => {

        console.log(
            `${new Date().toISOString()} ${req.method} ${req.url}`
        );

        next();

    }
);


// =========================================================
// STATIC ADMIN FRONTEND
// =========================================================

app.use(
    "/admin",
    express.static(
        path.join(
            __dirname,
            "..",
            "admin"
        ),
        {
            index: false
        }
    )
);


// =========================================================
// STATIC PUBLIC FRONTEND
// =========================================================

app.use(
    "/",
    express.static(
        path.join(
            __dirname,
            "..",
            "frontend"
        ),
        {
            index: "index.html"
        }
    )
);


// =========================================================
// UPLOADED MEDIA
// =========================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "..",
            "uploads"
        )
    )
);


// =========================================================
// API ROUTES
// =========================================================


// ---------------------------------------------------------
// AUTHENTICATION
// ---------------------------------------------------------

app.use(
    "/api/auth",
    authRoutes
);


// ---------------------------------------------------------
// ACCOUNT VERIFICATION / SECURITY
// ---------------------------------------------------------

app.use(
    "/api/auth",
    verificationRoutes
);


// ---------------------------------------------------------
// AUTHENTICATOR APP / TWO-FACTOR AUTHENTICATION
// ---------------------------------------------------------

app.use(
    "/api/auth/2fa",
    twoFactorRoutes
);


// ---------------------------------------------------------
// USERS
// ---------------------------------------------------------

app.use(
    "/api/users",
    userRoutes
);


// ---------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------

app.use(
    "/api/projects",
    projectRoutes
);


// ---------------------------------------------------------
// PROJECT MEDIA
// ---------------------------------------------------------

app.use(
    "/api",
    projectMediaRoutes
);


// ---------------------------------------------------------
// CREATOR DASHBOARD
// ---------------------------------------------------------

app.use(
    "/api/dashboard",
    dashboardRoutes
);


// ---------------------------------------------------------
// ADMIN SOCIAL LINKS
// ---------------------------------------------------------

app.use(
    "/api/social-links",
    socialLinksRoutes
);


// ---------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------

app.use(
    "/api/public",
    publicSocialLinksRoutes
);

app.use(
    "/api/public",
    publicProjectRoutes
);


// =========================================================
// ROOT ROUTE
// =========================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "..",
                "frontend",
                "index.html"
            )
        );

    }
);


// =========================================================
// 404 HANDLER
// =========================================================

app.use(
    (req, res) => {

        res.status(
            404
        ).json({

            success: false,

            message:
                "Route not found"

        });

    }
);


// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "❌ Express error:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        res.status(
            error.status ||
            500
        ).json({

            success: false,

            message:
                error.message ||
                "Internal server error."

        });

    }
);


// =========================================================
// START SERVER
// =========================================================

const server =
    app.listen(
        PORT,
        () => {

            console.log("");

            console.log(
                "=========================================="
            );

            console.log(
                "              CREVIO SERVER"
            );

            console.log(
                "=========================================="
            );

            console.log(
                `🚀 Server: http://localhost:${PORT}`
            );

            console.log(
                "✅ Database connected"
            );

            console.log(
                "✅ Authentication routes loaded"
            );

            console.log(
                "✅ Verification routes loaded"
            );

            console.log(
                "✅ 2FA routes loaded"
            );

            console.log(
                "✅ Express server is listening"
            );

            console.log(
                "=========================================="
            );

            console.log("");

        }
    );


// =========================================================
// SERVER ERROR
// =========================================================

server.on(
    "error",
    (error) => {

        if (
            error.code ===
            "EADDRINUSE"
        ) {

            console.error("");

            console.error(
                `❌ Port ${PORT} is already in use.`
            );

            console.error(
                "Stop the existing Node process before starting Crevio again."
            );

            console.error("");

            return;

        }


        console.error(
            "❌ Server error:",
            error
        );

    }
);


// =========================================================
// UNCAUGHT EXCEPTION
// =========================================================

process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "❌ Uncaught exception:",
            error
        );

    }
);


// =========================================================
// UNHANDLED PROMISE REJECTION
// =========================================================

process.on(
    "unhandledRejection",
    (reason) => {

        console.error(
            "❌ Unhandled promise rejection:",
            reason
        );

    }
);