const fs = require("fs");
const path = require("path");

// =========================================================
// 1. authController.js — 2FA gate + verify2FALogin
// =========================================================
const authPath = path.join(__dirname, "backend", "controllers", "authController.js");
let a = fs.readFileSync(authPath, "utf8");

if (a.includes("verify2FALogin")) {
    console.log("SKIP authController — already patched");
} else {
    // Regex-tolerant match of the jwt.sign block
    const re = /(const token = jwt\.sign\([\s\S]*?\{ expiresIn: "7d" \}\s*\);)/;
    if (!re.test(a)) {
        console.log("FAIL authController — jwt.sign block not found");
        process.exit(1);
    }

    const gate = `// =========================================================
        // 2FA enforcement — require TOTP when enabled + device untrusted
        // =========================================================
        try {
            const u2 = db.prepare("SELECT two_factor_enabled FROM users WHERE id = ?").get(user.id);
            if (u2 && u2.two_factor_enabled === 1) {
                const hasMethod = db.prepare(
                    "SELECT id FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 LIMIT 1"
                ).get(user.id);

                if (hasMethod) {
                    const fp = deviceService.fingerprint({
                        userAgent: req.headers["user-agent"] || "",
                        ipAddress: null,
                        acceptLanguage: req.headers["accept-language"] || ""
                    });
                    const trustedDev = db.prepare(
                        "SELECT id FROM trusted_devices WHERE user_id = ? AND device_token = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1"
                    ).get(user.id, fp);

                    if (!trustedDev) {
                        const ticket = jwt.sign(
                            { id: user.id, purpose: "2fa_login" },
                            process.env.JWT_SECRET,
                            { expiresIn: "5m" }
                        );
                        return res.json({
                            success: true,
                            requires_2fa: true,
                            ticket: ticket,
                            method: "totp",
                            message: "Enter the 6-digit code from your authenticator app."
                        });
                    }
                }
            }
        } catch (e) { /* silent */ }

        $1`;

    a = a.replace(re, gate);
    console.log("OK — authController login gate inserted");

    const verifyFn = `

// =========================================================
// POST /api/auth/verify-2fa
// =========================================================
exports.verify2FALogin = async (req, res) => {
    try {
        const ticket = String((req.body && req.body.ticket) || "").trim();
        const code = String((req.body && req.body.code) || "").trim();
        const rememberDevice = req.body && req.body.rememberDevice !== false;

        if (!ticket || !code) return res.status(400).json({ success: false, message: "Ticket and code required" });
        if (!/^\\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter the 6-digit code." });

        let decoded;
        try { decoded = jwt.verify(ticket, process.env.JWT_SECRET); }
        catch (e) { return res.status(401).json({ success: false, message: "Session expired. Please log in again." }); }

        if (!decoded || decoded.purpose !== "2fa_login" || !decoded.id) {
            return res.status(401).json({ success: false, message: "Invalid ticket." });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id);
        if (!user) return res.status(401).json({ success: false, message: "User not found" });

        const method = db.prepare(
            "SELECT * FROM two_factor_methods WHERE user_id = ? AND method_type = 'authenticator' AND is_verified = 1 ORDER BY is_primary DESC, id DESC LIMIT 1"
        ).get(user.id);
        if (!method) return res.status(400).json({ success: false, message: "No authenticator configured." });

        const totpService = require("../services/totpService");
        let secret;
        try { secret = totpService.decryptSecret(method.secret); }
        catch (e) {
            console.error("verify2FALogin decrypt error:", e.message);
            return res.status(500).json({ success: false, message: "Could not read 2FA secret." });
        }

        const ok = await totpService.verifyToken({ secret, token: code });
        if (!ok) return res.status(400).json({ success: false, message: "Incorrect code. Try again." });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || "creator" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        try {
            loginSecurityService.recordLogin({
                userId: user.id,
                userEmail: user.email,
                token: token,
                userAgent: req.headers["user-agent"] || "",
                ipAddress: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                acceptLanguage: req.headers["accept-language"] || "",
                rememberDevice: rememberDevice
            }).catch(function () {});
        } catch (e) {}

        res.json({
            success: true,
            token: token,
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
        console.error("verify2FALogin error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};
`;
    a = a.trimEnd() + verifyFn;
    fs.writeFileSync(authPath, a, "utf8");
    console.log("OK — verify2FALogin appended");
}

// =========================================================
// 2. authMiddleware.js — reject 2FA tickets
// =========================================================
const mwPath = path.join(__dirname, "backend", "middleware", "authMiddleware.js");
let mw = fs.readFileSync(mwPath, "utf8");

if (mw.includes("Invalid token type")) {
    console.log("SKIP authMiddleware — already patched");
} else {
    const re = /(if \(!decoded \|\| !decoded\.id\) \{\s*return res\.status\(401\)\.json\(\{ success: false, message: 'Invalid authentication token\.' \}\);\s*\})/;
    if (!re.test(mw)) {
        console.log("FAIL authMiddleware — anchor not found");
    } else {
        mw = mw.replace(re, `$1
        if (decoded.purpose) {
            return res.status(401).json({ success: false, message: 'Invalid token type.' });
        }`);
        fs.writeFileSync(mwPath, mw, "utf8");
        console.log("OK — authMiddleware patched");
    }
}

// =========================================================
// 3. authRoutes.js — verify-2fa route
// =========================================================
const rPath = path.join(__dirname, "backend", "routes", "authRoutes.js");
let r = fs.readFileSync(rPath, "utf8");

if (r.includes("verify-2fa")) {
    console.log("SKIP authRoutes — already present");
} else {
    const lines = r.split("\n");
    const out = [];
    let inserted = false;
    for (const line of lines) {
        if (!inserted && /module\.exports\s*=/.test(line)) {
            out.push('router.post("/verify-2fa", authController.verify2FALogin);');
            out.push("");
            inserted = true;
        }
        out.push(line);
    }
    if (!inserted) {
        console.log("FAIL authRoutes — no module.exports");
        process.exit(1);
    }
    fs.writeFileSync(rPath, out.join("\n"), "utf8");
    console.log("OK — authRoutes: /verify-2fa added");
}

console.log("done");