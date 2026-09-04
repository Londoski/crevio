// =========================================================
// CREVIO — SERVER (backend/server.js)
// =========================================================
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require("dotenv").config({ path: "../.env" });

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

// =========================================================
// ROUTES
// =========================================================
const authRoutes = require("./routes/auth");
const notificationsRouter = require("./routes/notifications");
const messageRoutes = require("./routes/messageRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const skillRoutes = require("./routes/skillRoutes");
const projectRoutes = require("./routes/projectRoutes");
const userRoutes = require("./routes/userRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const twoFactorRoutes = require("./routes/twoFactorRoutes");
const projectMediaRoutes = require("./routes/projectMediaRoutes");
const mediaLibraryRoutes = require("./routes/mediaLibraryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const socialLinksRoutes = require("./routes/socialLinksRoutes");
const publicSocialLinksRoutes = require("./routes/publicSocialLinksRoutes");
const publicProjectRoutes = require("./routes/publicProjectRoutes");
const publicSkillRoutes = require("./routes/publicSkillRoutes");
const publicProfileRoutes = require("./routes/publicProfileRoutes");
const billingRoutes = require("./routes/billingRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const accountRoutes = require("./routes/accountRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const socialRoutes = require("./routes/socialRoutes");

// =========================================================
// DATABASE
// =========================================================
require("../database/schema");   // adjust if needed

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
app.use("/", express.static(path.join(__dirname, "..", "frontend"), { index: "index.html" }));
app.use("/admin", express.static(path.join(__dirname, "..", "admin"), { index: false }));
app.use("/dashboard", express.static(path.join(__dirname, "..", "dashboard"), { index: "index.html" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// =========================================================
// PUBLIC PORTFOLIO ROUTE
// =========================================================
app.get("/public/:username", (req, res) => {
    const username = req.params.username;
    if (!username || username.includes('..') || username.includes('/')) {
        return res.status(400).send('Invalid username');
    }
    const portfolioPath = path.join(__dirname, "..", "frontend", "public", "index.html");
    res.sendFile(portfolioPath, (err) => {
        if (err) {
            console.error('Portfolio serve error:', err);
            res.status(404).send('Portfolio page not found.');
        }
    });
});

app.use("/public", express.static(path.join(__dirname, "..", "frontend", "public")));

// =========================================================
// API ROUTES
// =========================================================
app.use("/api/auth", authRoutes);
app.use("/api/auth", verificationRoutes);
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
    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// Public service detail
app.get("/u/:username/services/:slug", (req, res) => {
    const username = req.params.username;
    const slug = req.params.slug;
    if (!username || !slug) {
        return res.status(400).send('Invalid request.');
    }
    const servicePath = path.join(__dirname, "..", "frontend", "service.html");
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
    console.log("✅ Database connected");
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