const Database = require("better-sqlite3");
const path = require("path");

// Path to Crevio SQLite database
const dbPath = path.join(__dirname, "projects.db");

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

console.log("✅ Database connected successfully");
console.log(`📁 Database: ${dbPath}`);

module.exports = db;