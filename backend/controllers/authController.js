// =========================================================
// CREVIO â€” AUTH CONTROLLER
// File: backend/controllers/authController.js
// =========================================================

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../database/db");

function cols(table) {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); }
    catch (e) { return []; }
}

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { email, password, username, display_name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (existing) return res.status(400).json({ success: false, message: "User already exists" });

        const hashed = await bcrypt.hash(password, 12);
        const c = cols("users");
        const passwordCol = c.includes("password_hash") ? "password_hash" : "password";

        const fields = ["email", passwordCol, "username"];
        const placeholders = ["?", "?", "?"];
        const values = [email, hashed, username || email.split("@")[0]];

        if (c.includes("display_name") && display_name) {
            fields.push("display_name"); placeholders.push("?"); values.push(display_name);
        }
        if (c.includes("role")) {
            fields.push("role"); placeholders.push("?"); values.push("creator");
        }
        if (c.includes("created_at")) {
            fields.push("created_at"); placeholders.push("CURRENT_TIMESTAMP");
        }

        const sql = `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`;
        const result = db.prepare(sql).run(...values);

        res.json({ success: true, message: "User registered", userId: result.lastInsertRowid });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }

        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

        const hash = user.password_hash || user.password;
        if (!hash) return res.status(401).json({ success: false, message: "Account has no password" });

        const ok = await bcrypt.compare(password, hash);
        if (!ok) return res.status(401).json({ success: false, message: "Invalid email or password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || "creator" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                role: user.role || "creator",
                profile_image: user.profile_image
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
    res.json({ success: true, message: "Logged out" });
};

// POST /api/auth/set-password â€” helper for users without a password
exports.setPassword = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }

        const hashed = await bcrypt.hash(password, 12);
        const c = cols("users");
        const passwordCol = c.includes("password_hash") ? "password_hash" : "password";

        const r = db.prepare(`UPDATE users SET ${passwordCol} = ? WHERE email = ?`).run(hashed, email);
        if (r.changes === 0) return res.status(404).json({ success: false, message: "User not found" });

        res.json({ success: true, message: "Password updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// PATCH /api/auth/email
// Body: { newEmail, currentPassword }
// =========================================================
exports.changeEmail = async (req, res) => {
    try {
        const uid = req.user.id;
        const newEmail = String(req.body.newEmail || "").trim().toLowerCase();
        const currentPassword = String(req.body.currentPassword || "");

        if (!newEmail || !currentPassword) {
            return res.status(400).json({ success: false, message: "Email and current password required" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const hash = user.password_hash || user.password;
        if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        if (user.email === newEmail) {
            return res.status(400).json({ success: false, message: "That is already your email" });
        }

        const taken = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(newEmail, uid);
        if (taken) return res.status(409).json({ success: false, message: "Email already in use" });

        db.prepare("UPDATE users SET email = ? WHERE id = ?").run(newEmail, uid);

        // Invalidate other sessions (force re-login)
        try { db.prepare("DELETE FROM sessions WHERE user_id = ?").run(uid); } catch (e) {}

        res.json({ success: true, message: "Email updated. Please sign in again.", email: newEmail });
    } catch (err) {
        console.error("Change email error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =========================================================
// PATCH /api/auth/password
// Body: { currentPassword, newPassword, confirmPassword }
// =========================================================
exports.changePassword = async (req, res) => {
    try {
        const uid = req.user.id;
        const currentPassword = String(req.body.currentPassword || "");
        const newPassword     = String(req.body.newPassword || "");
        const confirmPassword = String(req.body.confirmPassword || "");

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }
        if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must contain letters and numbers" });
        }
        if (newPassword === currentPassword) {
            return res.status(400).json({ success: false, message: "New password must be different" });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const hash = user.password_hash || user.password;
        if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        const col = user.password_hash ? "password_hash" : "password";
        db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(newHash, uid);

        // Invalidate all sessions
        try { db.prepare("DELETE FROM sessions WHERE user_id = ?").run(uid); } catch (e) {}

        res.json({ success: true, message: "Password updated. Please sign in again." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};