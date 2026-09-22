require("dotenv").config();
(async function () {
    const emails = require("./backend/emails/templates/securityEmails");
    const emailService = require("./backend/services/emailService");
    const db = require("./database/db");

    const u = db.prepare("SELECT id, display_name, email FROM users WHERE id = 1").get();
    console.log("sending to:", u.email);
    console.log("");

    const tests = [
        ["new_device",   "renderNewDeviceSignIn",   { firstName: u.display_name, device: "Chrome on Windows", location: "Lagos, Nigeria", ipAddress: "105.127.6.187", lockdownUrl: "http://localhost:3000/api/security/report-compromise?token=demo" }],
        ["pwd_changed",  "renderPasswordChanged",   { firstName: u.display_name, ipAddress: "105.127.6.187" }],
        ["email_changed","renderEmailChanged",      { firstName: u.display_name, oldEmail: "old@crevio.dev", newEmail: u.email }],
        ["2fa_enabled",  "renderTwoFactorChanged",  { firstName: u.display_name, enabled: true, method: "authenticator" }],
        ["reset_link",   "renderPasswordResetLink", { firstName: u.display_name, resetUrl: "http://localhost:3000/admin/pages/reset-password.html?token=demo123", expiresIn: "30 minutes" }],
        ["otp_login",    "renderOtpCode",           { firstName: u.display_name, code: "482917", purpose: "login", expiresIn: "10 minutes" }],
        ["recovery_use", "renderRecoveryCodeUsed",  { firstName: u.display_name, remainingCodes: 5, ipAddress: "105.127.6.187" }],
        ["locked",       "renderAccountLocked",     { firstName: u.display_name, sessionsRevoked: 4, devicesRevoked: 2 }],
        ["unlocked",     "renderAccountUnlocked",   { firstName: u.display_name }]
    ];

    for (const t of tests) {
        const label = t[0], fn = t[1], opts = t[2];
        try {
            const r = emails[fn](opts);
            const sendResult = await emailService.send({
                userId: u.id,
                to: u.email,
                subject: r.subject,
                html: r.html,
                text: r.text,
                category: "security_" + label + "_test"
            });
            console.log("OK   " + label + " — " + r.subject);
            await new Promise(function (res) { setTimeout(res, 900); });
        } catch (e) {
            console.log("FAIL " + label + " — " + e.message);
        }
    }

    await new Promise(function (r) { setTimeout(r, 3000); });

    console.log("");
    console.log("=== last 9 security emails ===");
    const rows = db.prepare("SELECT id, subject, category, status FROM email_outbox WHERE category LIKE 'security_%_test' ORDER BY id DESC LIMIT 9").all();
    rows.forEach(function (r) {
        console.log("  id=" + r.id + " | " + r.status + " | " + r.subject);
    });
})();