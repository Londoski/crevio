const express = require("express");
const db = require("../database/db");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test route
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Crevio API is running.",
        status: "online"
    });
});

// Database test route
app.get("/api/db-test", (req, res) => {
    try {
        const result = db.prepare("SELECT 1 AS connected").get();

        res.json({
            success: true,
            database: result.connected === 1 ? "connected" : "error"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Crevio server running at http://localhost:${PORT}`);
});