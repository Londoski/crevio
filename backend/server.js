const express = require("express");
const db = require("../database/db");
const userRoutes = require("./routes/userRoutes");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API Routes
app.use("/api/users", userRoutes);

// Health Check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Crevio API is running.",
        status: "online"
    });
});

// Database Test
app.get("/api/db-test", (req, res) => {
    try {
        const result = db.prepare("SELECT 1 AS connected").get();

        res.json({
            success: true,
            database: result.connected === 1 ? "connected" : "error"
        });
    } catch (error) {
        console.error("Database test error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Crevio database connected.`);
    console.log(`Crevio server running at http://localhost:${PORT}`);
});