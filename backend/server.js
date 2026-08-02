const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test route
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Londoski Media API is running.",
        status: "online"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Londoski Media server running at http://localhost:${PORT}`);
});