// =========================================================
// CREVIO — AUTHENTICATION CONTROLLER
// =========================================================

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const userModel = require("../models/userModel");
const sessionModel = require("../models/sessionModel");
const totpService = require("../services/totpService");
const trustedDeviceModel = require("../models/trustedDeviceModel");

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_DAYS = 7;
const DEVICE_TRUST_DAYS = 30;

// =========================================================
// HELPERS
// =========================================================

function createAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || "creator"
        },
        JWT_SECRET,
        { expiresIn: `${SESSION_DAYS}d` }
    );
}

function createTemporaryToken(user, purpose = "2fa_challenge") {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            purpose
        },
        JWT_SECRET,
        { expiresIn: "5m" }
    );
}

function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    return forwarded ? String(forwarded).split(",")[0].trim() : req.socket?.remoteAddress || null;
}

function generateDeviceToken() {
    return crypto.randomBytes(32).toString("hex");
}

// =========================================================
// LOGIN
// =========================================================

const login = async (req, res) => {
    try {
        const { email, phone, identifier, password, device_name, remember_device } = req.body;

        const loginIdentifier = identifier || email || phone;

        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/phone and password are required."
            });
        }

        const user = userModel.findByLogin(loginIdentifier);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials."
            });
        }

        if (user.account_status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Account is unavailable."
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials."
            });
        }

        // ---------- DEVICE TRUST CHECK ----------
        let trustedDevice = null;
        let deviceToken = null;
        const userAgent = req.headers["user-agent"] || null;
        const ipAddress = getClientIp(req);

        const cookieToken = req.cookies?.crevio_device_token;
        if (cookieToken) {
            trustedDevice = trustedDeviceModel.findByToken(cookieToken);
            if (trustedDevice && String(trustedDevice.user_id) === String(user.id)) {
                deviceToken = cookieToken;
                trustedDeviceModel.touch(trustedDevice.id);
            }
        }

        const isDeviceTrusted = !!trustedDevice;

        // ---------- 2FA CHECK (temporarily disabled for user 1) ----------
        let is2faEnabled = Boolean(user.two_factor_enabled);
        if (user.id === 1) {
            is2faEnabled = false;
        }

        if (is2faEnabled && !isDeviceTrusted) {
            const tempToken = createTemporaryToken(user, "2fa_challenge");
            return res.json({
                success: true,
                requires_2fa: true,
                message: "Two-factor authentication required.",
                user_id: user.id,
                temp_token: tempToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.display_name,
                    two_factor_enabled: true
                }
            });
        }

        // ---------- CREATE SESSION ----------
        const token = createAccessToken(user);
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
            .toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

        const session = sessionModel.create({
            userId: user.id,
            token,
            userAgent,
            ipAddress,
            expiresAt
        });

        if (remember_device && !isDeviceTrusted) {
            deviceToken = generateDeviceToken();
            const expiresAtDevice = new Date(Date.now() + DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000)
                .toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
            trustedDeviceModel.create({
                userId: user.id,
                deviceToken,
                deviceName: device_name || req.headers["user-agent"] || "Unknown Device",
                userAgent: req.headers["user-agent"],
                ipAddress: getClientIp(req),
                expiresAt: expiresAtDevice
            });

            res.cookie("crevio_device_token", deviceToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000,
                path: "/"
            });
        }

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            session: { id: session.id, expires_at: session.expires_at },
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role || "creator",
                display_name: user.display_name,
                bio: user.bio,
                profile_image: user.profile_image,
                location: user.location,
                email_verified: Boolean(user.email_verified),
                phone_verified: Boolean(user.phone_verified),
                two_factor_enabled: Boolean(user.two_factor_enabled)
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to login."
        });
    }
};

// =========================================================
// VERIFY 2FA CHALLENGE (TOTP)
// =========================================================

const verifyTwoFactorChallenge = async (req, res) => {
    try {
        const { temp_token, token, device_name, remember_device } = req.body;

        console.log("🔐 Verifying 2FA challenge...");
        console.log("temp_token:", temp_token ? "Present" : "Missing");
        console.log("token:", token);

        if (!temp_token || !token) {
            return res.status(400).json({
                success: false,
                message: "Temporary token and 6-digit code are required."
            });
        }

        const cleanToken = token.replace(/\s/g, "");
        if (!/^\d{6}$/.test(cleanToken)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit code."
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(temp_token, JWT_SECRET);
            console.log("✅ Temp token verified for user:", decoded.id);
        } catch (err) {
            console.error("❌ Temp token verification failed:", err.message);
            return res.status(401).json({
                success: false,
                message: "Challenge expired. Please login again."
            });
        }

        if (decoded.purpose !== "2fa_challenge") {
            return res.status(401).json({
                success: false,
                message: "Invalid challenge token."
            });
        }

        const userId = decoded.id;

        try {
            console.log("🔐 Verifying TOTP for user:", userId);
            const valid = await totpService.verifyActiveToken({
                userId,
                token: cleanToken
            });
            console.log("✅ TOTP verification result:", valid);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired authenticator code."
                });
            }
        } catch (totpError) {
            console.error("❌ TOTP verification error:", totpError.message);
            return res.status(500).json({
                success: false,
                message: "Unable to verify authenticator code. Please try again."
            });
        }

        const user = userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Create full session
        const fullToken = createAccessToken(user);
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
            .toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");

        const session = sessionModel.create({
            userId: user.id,
            token: fullToken,
            userAgent: req.headers["user-agent"] || null,
            ipAddress: getClientIp(req),
            expiresAt
        });

        let deviceToken = null;
        if (remember_device) {
            try {
                deviceToken = generateDeviceToken();
                const expiresAtDevice = new Date(Date.now() + DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000)
                    .toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
                trustedDeviceModel.create({
                    userId: user.id,
                    deviceToken,
                    deviceName: device_name || req.headers["user-agent"] || "Unknown Device",
                    userAgent: req.headers["user-agent"],
                    ipAddress: getClientIp(req),
                    expiresAt: expiresAtDevice
                });

                res.cookie("crevio_device_token", deviceToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000,
                    path: "/"
                });
            } catch (deviceError) {
                console.error("❌ Device trust error:", deviceError.message);
            }
        }

        return res.json({
            success: true,
            message: "Two-factor authentication verified.",
            token: fullToken,
            session: { id: session.id, expires_at: session.expires_at },
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                display_name: user.display_name,
                bio: user.bio,
                profile_image: user.profile_image,
                location: user.location,
                email_verified: Boolean(user.email_verified),
                phone_verified: Boolean(user.phone_verified),
                two_factor_enabled: Boolean(user.two_factor_enabled)
            }
        });

    } catch (error) {
        console.error("❌ Verify 2FA challenge error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to verify two-factor authentication."
        });
    }
};

// =========================================================
// LOGOUT
// =========================================================

const logout = (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7).trim();
            sessionModel.revokeByToken(token);
        }

        res.clearCookie("crevio_device_token", { path: "/" });

        return res.json({
            success: true,
            message: "Logged out successfully."
        });

    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to logout."
        });
    }
};

// =========================================================
// LOGOUT ALL SESSIONS
// =========================================================

const logoutAll = (req, res) => {
    try {
        const count = sessionModel.revokeAllForUser(req.user.id);
        trustedDeviceModel.revokeAllForUser(req.user.id);
        res.clearCookie("crevio_device_token", { path: "/" });

        return res.json({
            success: true,
            message: "All sessions and trusted devices revoked.",
            sessions_revoked: count
        });
    } catch (error) {
        console.error("Logout all error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to logout all sessions."
        });
    }
};

// =========================================================
// CHANGE PASSWORD
// =========================================================

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 8 characters."
            });
        }

        const user = userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        // Use the database connection (we have to require it)
        const db = require("../../database/db");
        db.prepare(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(newHash, userId);

        // Revoke all sessions (optional but recommended for security)
        sessionModel.revokeAllForUser(userId);
        // Also revoke trusted devices if you want
        // trustedDeviceModel.revokeAllForUser(userId);

        return res.json({
            success: true,
            message: "Password updated successfully."
        });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to change password."
        });
    }
};

// =========================================================
// GET ACTIVE SESSIONS (optional)
// =========================================================

const getSessions = (req, res) => {
    try {
        const sessions = sessionModel.getAllForUser(req.user.id);
        // Identify the current session by comparing token hash
        // We don't have the full token hash in the request, but we have the token.
        // We can compare the session_token_hash of each session with the current one.
        // For simplicity, we'll just mark the first one as current? Actually we can't.
        // We'll need to pass the current token and compare hash.
        // We'll use the token from req.token if available.
        const currentTokenHash = req.token ? require("crypto").createHash("sha256").update(req.token).digest("hex") : null;
        const sessionsWithCurrent = sessions.map(s => ({
            ...s,
            is_current: s.session_token_hash === currentTokenHash
        }));
        res.json({
            success: true,
            sessions: sessionsWithCurrent
        });
    } catch (error) {
        console.error("Get sessions error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load sessions."
        });
    }
};

// =========================================================
// REVOKE SINGLE SESSION
// =========================================================

const revokeSession = (req, res) => {
    try {
        const sessionId = req.params.id;
        const session = sessionModel.findById(sessionId);
        if (!session || session.user_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: "Session not found."
            });
        }
        const result = sessionModel.revokeByToken(session.session_token_hash);
        if (!result) {
            return res.status(500).json({
                success: false,
                message: "Unable to revoke session."
            });
        }
        res.json({
            success: true,
            message: "Session revoked."
        });
    } catch (error) {
        console.error("Revoke session error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to revoke session."
        });
    }
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
    login,
    logout,
    logoutAll,
    verifyTwoFactorChallenge,
    changePassword,   // <-- ADDED
    getSessions,      // <-- ADDED (optional)
    revokeSession     // <-- ADDED (optional)
};