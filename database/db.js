const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "crevio.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

console.log("Crevio database connected.");

module.exports = db;