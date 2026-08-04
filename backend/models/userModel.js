const db = require("../../database/db");

const userModel = {
    create(user) {
        const stmt = db.prepare(`
            INSERT INTO users (
                username,
                email,
                password_hash,
                display_name,
                bio,
                profile_image,
                location
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            user.username,
            user.email,
            user.password_hash,
            user.display_name || null,
            user.bio || null,
            user.profile_image || null,
            user.location || null
        );

        return {
            id: result.lastInsertRowid,
            ...user
        };
    },

    findById(id) {
        return db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(id);
    },

    findByUsername(username) {
        return db
            .prepare("SELECT * FROM users WHERE username = ?")
            .get(username);
    },

    findByEmail(email) {
        return db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(email);
    }
};

module.exports = userModel;