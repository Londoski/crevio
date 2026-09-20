const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "backend", "controllers", "securityController.js");
let s = fs.readFileSync(file, "utf8");

// 1. Import emailOtpService + smsService
if (!s.includes("emailOtpService")) {
    const anchor = 'const passwordHistoryService = require("../services/passwordHistoryService");';
    if (s.includes(anchor)) {
        s = s.replace(anchor, anchor + '\nconst emailOtpService = require("../services/emailOtpService");\nconst smsService = require("../services/smsService");');
        console.log("OK — imports added");
    } else {
        const anchor2 = 'const lockdownService = require("../services/lockdownService");';
        if (s.includes(anchor2)) {
            s = s.replace(anchor2, anchor2 + '\nconst emailOtpService = require("../services/emailOtpService");\nconst smsService = require("../services/smsService");');
            console.log("OK — imports added");
        }
    }
}

// 2. Change resetPasswordPost: replace "unlock" block with OTP issue
// Find:  lockdownService.unlock({ userId: row.user_id, reason: "password_reset_after_compromise" });
const unlockCall = 'lockdownService.unlock({ userId: row.user_id, reason: "password_reset_after_compromise" });';
if (s.includes(unlockCall) && !s.includes("emailOtpService.createAndSend")) {
    const replacement = 
'// Do NOT unlock yet - require email OTP first.\n' +
'        // Password is saved; account stays suspended until OTP verified.\n' +
'        try {\n' +
'            await emailOtpService.createAndSend({ userId: row.user_id, userEmail: user.email });\n' +
'        } catch (e) { console.error("[reset] otp send failed:", e.message); }\n' +
'\n' +
'        // Optionally queue an SMS for when Twilio is configured\n' +
'        try {\n' +
'            const phoneRow = db.prepare("SELECT phone FROM users WHERE id = ?").get(row.user_id);\n' +
'            if (phoneRow && phoneRow.phone) {\n' +
'                smsService.send({\n' +
'                    userId: row.user_id,\n' +
'                    to: phoneRow.phone,\n' +
'                    body: "Your Crevio verification code has been sent to your email.",\n' +
'                    category: "reset_otp_notice"\n' +
'                }).catch(function () {});\n' +
'            }\n' +
'        } catch (e) {}';
    s = s.replace(unlockCall, replacement);
    console.log("OK — resetPasswordPost now issues OTP instead of unlocking");
}

// 3. Change return response to indicate OTP step needed
const oldReturn = 'res.json({ success: true, message: "Password reset complete. Your account is unlocked." });';
const newReturn = 'res.json({ success: true, message: "Password updated. Enter the 6-digit code we just emailed you.", requires_otp: true });';
if (s.includes(oldReturn)) {
    s = s.replace(oldReturn, newReturn);
    console.log("OK — response changed to indicate OTP step");
}

// 4. Add verifyResetOtp endpoint at end of file (before module.exports if any, or append)
if (!s.includes("exports.verifyResetOtp")) {
    const block = [
        "",
        "// =========================================================",
        "// POST /api/security/reset-verify-otp",
        "// Public. Body: { token, code }",
        "// Verifies the email OTP, unlocks the account on success.",
        "// =========================================================",
        "exports.verifyResetOtp = async (req, res) => {",
        "    try {",
        "        const token = String((req.body && req.body.token) || \"\").trim();",
        "        const code  = String((req.body && req.body.code) || \"\").trim();",
        "        if (!token || !code) return res.status(400).json({ success: false, message: \"Token and code required\" });",
        "",
        "        const crypto = require(\"crypto\");",
        "        const hash = crypto.createHash(\"sha256\").update(token).digest(\"hex\");",
        "        const row = db.prepare(",
        "            \"SELECT user_id FROM verification_tokens WHERE token_hash = ? AND token_type = 'password_reset_compromise' AND used_at IS NOT NULL LIMIT 1\"",
        "        ).get(hash);",
        "        // After resetPasswordPost consumed the token, it is marked used_at IS NOT NULL.",
        "        // So we look for the consumed token to identify the user.",
        "",
        "        if (!row) return res.status(400).json({ success: false, message: \"This session is invalid or has expired.\" });",
        "",
        "        const v = emailOtpService.verify({ userId: row.user_id, code: code });",
        "        if (!v.success) {",
        "            let msg = \"Incorrect code.\";",
        "            if (v.reason === \"expired_or_missing\") msg = \"This code has expired. Request a new reset link.\";",
        "            if (v.reason === \"too_many_attempts\") msg = \"Too many attempts. Request a new reset link.\";",
        "            if (v.reason === \"invalid_format\") msg = \"Enter the 6-digit code from your email.\";",
        "            return res.status(400).json({ success: false, message: msg });",
        "        }",
        "",
        "        // OTP is valid — unlock the account",
        "        const lockdownService = require(\"../services/lockdownService\");",
        "        lockdownService.unlock({ userId: row.user_id, reason: \"otp_verified_after_reset\" });",
        "",
        "        // Send confirmation email + notification",
        "        try {",
        "            const user = db.prepare(\"SELECT email FROM users WHERE id = ?\").get(row.user_id);",
        "            const emailService = require(\"../services/emailService\");",
        "            const notificationService = require(\"../services/notificationService\");",
        "            notificationService.create({",
        "                userId: row.user_id,",
        "                type: \"system\",",
        "                title: \"Account unlocked\",",
        "                message: \"Your identity was verified and your account is unlocked. You can sign in again.\"",
        "            });",
        "            if (user && user.email) {",
        "                emailService.send({",
        "                    userId: row.user_id,",
        "                    to: user.email,",
        "                    subject: \"Your Crevio account has been restored\",",
        "                    text:",
        "                        \"Hi,\\n\\n\" +",
        "                        \"Your Crevio account has been unlocked and is ready to use.\\n\\n\" +",
        "                        \"If this wasn't you, please contact our security team immediately:\\n\\n\" +",
        "                        \"    security@crevio.indevs.in\\n\\n\" +",
        "                        \"Or simply reply to this email - our security team monitors replies and will respond as soon as possible.\\n\\n\" +",
        "                        \"The Crevio Team\",",
        "                    category: \"security_account_restored\"",
        "                }).catch(function () {});",
        "            }",
        "        } catch (e) {}",
        "",
        "        res.json({ success: true, message: \"Verification complete. Your account is unlocked.\" });",
        "    } catch (err) {",
        "        console.error(\"verifyResetOtp error:\", err);",
        "        res.status(500).json({ success: false, message: \"Failed\", error: err.message });",
        "    }",
        "};",
        ""
    ].join("\n");
    s = s.trimEnd() + block;
    console.log("OK — verifyResetOtp added");
}

fs.writeFileSync(file, s, "utf8");
console.log("✅ saved securityController.js");