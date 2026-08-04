const Database = require("better-sqlite3");
const path = require("path");

// Database file location
const dbPath = path.join(__dirname, "crevio.db");

// Create / connect to SQLite database
const db = new Database(dbPath);

// Enable foreign key relationships
db.pragma("foreign_keys = ON");

// Create database tables
db.exec(`
    -- =========================================
    -- USERS
    -- =========================================

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'creator',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );


    -- =========================================
    -- PROFILES
    -- =========================================

    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        professional_title TEXT,
        bio TEXT,
        profile_image TEXT,
        location TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );


    -- =========================================
    -- CATEGORIES
    -- =========================================

    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(name, type)
    );


    -- =========================================
    -- PROJECTS
    -- =========================================

    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        project_type TEXT,
        client TEXT,
        project_year INTEGER,
        role TEXT,
        thumbnail_url TEXT,
        project_url TEXT,
        featured INTEGER NOT NULL DEFAULT 0,
        published INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (category_id)
            REFERENCES categories(id)
            ON DELETE SET NULL
    );


    -- =========================================
    -- PROJECT MEDIA
    -- =========================================

    CREATE TABLE IF NOT EXISTS project_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        media_type TEXT NOT NULL,
        media_url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (project_id)
            REFERENCES projects(id)
            ON DELETE CASCADE
    );


    -- =========================================
    -- SERVICES
    -- =========================================

    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );


    -- =========================================
    -- SKILLS
    -- =========================================

    CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );


    -- =========================================
    -- SOCIAL LINKS
    -- =========================================

    CREATE TABLE IF NOT EXISTS social_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );


    -- =========================================
    -- TESTIMONIALS
    -- =========================================

    CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        client_role TEXT,
        testimonial TEXT NOT NULL,
        client_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
`);

console.log("Crevio database initialized successfully.");

module.exports = db;