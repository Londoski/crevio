// =========================================================
// CREVIO — SERVER (Root level)
// =========================================================
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

// =========================================================
// ROUTES – all from ./backend/...
// =========================================================
const authRoutes = require("./backend/routes/auth");         // change to authRoutes if needed
const notificationsRouter = require("./backend/routes/notifications");
const messageRoutes = require("./backend/routes/messageRoutes");
const serviceRoutes = require("./backend/routes/serviceRoutes");
const skillRoutes = require("./backend/routes/skillRoutes");
const projectRoutes = require("./backend/routes/projectRoutes");
const userRoutes = require("./backend/routes/userRoutes");
const twoFactorRoutes = require("./backend/routes/twoFactorRoutes");
const projectMediaRoutes = require("./backend/routes/projectMediaRoutes");
const mediaLibraryRoutes = require("./backend/routes/mediaLibraryRoutes");
const dashboardRoutes = require("./backend/routes/dashboardRoutes");
const socialLinksRoutes = require("./backend/routes/socialLinksRoutes");
const publicSocialLinksRoutes = require("./backend/routes/publicSocialLinksRoutes");
const publicProjectRoutes = require("./backend/routes/publicProjectRoutes");
const publicSkillRoutes = require("./backend/routes/publicSkillRoutes");
const publicProfileRoutes = require("./backend/routes/publicProfileRoutes");
const billingRoutes = require("./backend/routes/billingRoutes");
const webhookRoutes = require("./backend/routes/webhookRoutes");
const accountRoutes = require("./backend/routes/accountRoutes");
const portfolioRoutes = require("./backend/routes/portfolioRoutes");
const uploadRoutes = require("./backend/routes/uploadRoutes");
const socialRoutes = require("./backend/routes/socialRoutes");

// =========================================================
// DATABASE
// =========================================================
require("./backend/database/schema");   // adjust if needed

// =========================================================
// EXPRESS APP
// =========================================================
const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================
// WEBHOOKS (must come before express.json)
// =========================================================
app.use("/api/webhooks", webhookRoutes);

// =========================================================
// GLOBAL MIDDLEWARE
// =========================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Cache control
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// =========================================================
// STATIC FRONTENDS
// =========================================================
app.use("/", express.static(path.join(__dirname, "frontend"), { index: "index.html" }));
app.use("/admin", express.static(path.join(__dirname, "admin"), { index: false }));
app.use("/dashboard", express.static(path.join(__dirname, "dashboard"), { index: "index.html" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================================================
// PUBLIC PORTFOLIO ROUTE
// =========================================================
app.get("/public/:username", (req, res) => {
    const username = req.params.username;
    if (!username || username.includes('..') || username.includes('/')) {
        return res.status(400).send('Invalid username');
    }
    const portfolioPath = path.join(__dirname, "frontend", "public", "index.html");
    res.sendFile(portfolioPath, (err) => {
        if (err) {
            console.error('Portfolio serve error:', err);
            res.status(404).send('Portfolio page not found. Please create frontend/public/index.html');
        }
    });
});

app.use("/public", express.static(path.join(__dirname, "frontend", "public")));

// =========================================================
// API ROUTES
// =========================================================
app.use("/api/auth", authRoutes);
app.use("/api/auth/2fa", twoFactorRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", projectMediaRoutes);
app.use("/api/media", mediaLibraryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/social-links", socialLinksRoutes);
app.use("/api/public", publicSocialLinksRoutes);
app.use("/api/public", publicProjectRoutes);
app.use("/api/public", publicSkillRoutes);
app.use("/api/public", publicProfileRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationsRouter);

// =========================================================
// ROOT ROUTE
// =========================================================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Public service detail
app.get("/u/:username/services/:slug", (req, res) => {
    const username = req.params.username;
    const slug = req.params.slug;
    if (!username || !slug) {
        return res.status(400).send('Invalid request.');
    }
    const servicePath = path.join(__dirname, "frontend", "service.html");
    res.sendFile(servicePath, (err) => {
        if (err) {
            console.error('Service serve error:', err);
            res.status(404).send('Service page not found.');
        }
    });
});

// =========================================================
// 404 HANDLER
// =========================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================
app.use((error, req, res, next) => {
    console.error("❌ Express error:", error);
    if (res.headersSent) {
        return next(error);
    }
    res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error."
    });
});

// =========================================================
// START SERVER
// =========================================================
const server = app.listen(PORT, () => {
    console.log("");
    console.log("==========================================");
    console.log("              CREVIO SERVER");
    console.log("==========================================");
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log("✅ Authentication routes loaded");
    console.log("✅ 2FA routes loaded");
    console.log("✅ Billing routes loaded");
    console.log("✅ Webhook routes loaded");
    console.log("✅ Account routes loaded");
    console.log("✅ Portfolio routes loaded");
    console.log("✅ Upload routes loaded");
    console.log("✅ Skill routes loaded");
    console.log("✅ Project media routes loaded");
    console.log("✅ Media library routes loaded");
    console.log("✅ Social routes loaded");
    console.log("✅ Message routes loaded");
    console.log("✅ Notification routes loaded");
    console.log("✅ Express server is listening");
    console.log("==========================================");
    console.log("");
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Stop the existing process.`);
        return;
    }
    console.error("❌ Server error:", error);
});

process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled promise rejection:", reason);
});