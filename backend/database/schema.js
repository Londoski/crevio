const Database = require('better-sqlite3');
const path = require('path');

// Path to your SQLite database file – adjust if needed
const dbPath = path.join(__dirname, '../../data.sqlite');
// If your DB is elsewhere, change the path accordingly

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Export the database instance
module.exports = { db };