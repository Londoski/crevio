// =========================================================
// CREVIO — SECURITY EMAIL TEMPLATES
// File: backend/emails/templates/securityEmails.js
// All auth / security emails. Same premium shell as billing.
// Each render* returns { subject, html, text }.
// =========================================================
const layout = require("../layout");
const plans = require("../../../config/plans");

// ---------- helpers ----------
function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

function formatDateTime(d) {
    const dt = d ? new Date(d) : new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return months[dt.getMonth()] + " " + dt.getDate() + ", " + dt.getFullYear() +
        " at " + pad(dt.getHours()) + ":" + pad(dt.getMinutes());
}

// ---------- shared blocks ----------
function detailsCard(rows, C, FONT, esc) {
    const labelCell = "padding:11px 22px;font-size:13px;color:" + C.TEXT_MUTED + ";font-family:" + FONT + ";text-align:left;vertical-align:middle;";
    const valueCell = "padding:11px 22px;font-size:13px;color:" + C.TEXT_PRIMARY + ";font-weight:600;font-family:" + FONT + ";text-align:right;vertical-align:middle;word-break:break-word;";

    let h = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' " +
        "style='background-color:#F8FAFC;border:1px solid " + C.BORDER + ";border-radius:12px;margin:20px 0;width:100%;'>";

    rows.forEach(function (r, i) {
        const borderStyle = i === rows.length - 1 ? "" : "border-bottom:1px solid " + C.BORDER + ";";
        h += "<tr>";
        h += "<td width='40%' align='left' valign='middle' style='" + labelCell + borderStyle + "'>" + esc(r[0]) + "</td>";
        h += "<td width='60%' align='right' valign='middle' style='" + valueCell + borderStyle + "'>" + esc(r[1]) + "</td>";
        h += "</tr>";
    });

    h += "</table>";
    return h;
}

function bigCodeBlock(code, C, FONT) {
    return "<div style='background-color:#F8FAFC;border:1px solid " + C.BORDER + ";border-radius:12px;padding:24px;margin:24px 0;text-align:center;'>" +
        "<div style='font-family:" + FONT + ";font-size:11px;color:" + C.TEXT_MUTED + ";letter-spacing:0.08em;font-weight:700;margin-bottom:10px;'>YOUR CODE</div>" +
        "<div style='font-family:Courier,Consolas,Monaco,monospace;font-size:32px;font-weight:700;color:" + C.TEXT_PRIMARY + ";letter-spacing:0.15em;'>" + code + "</div>" +
        "</div>";
}

function alertBanner(text, color, C, FONT) {
    const bg = color === "danger" ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)";
    const border = color === "danger" ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.35)";
    const fg = color === "danger" ? "#DC2626" : "#B45309";
    return "<div style='background-color:" + bg + ";border:1px solid " + border + ";border-radius:10px;padding:12px 16px;margin:16px 0;font-family:" + FONT + ";font-size:13px;line-height:1.55;color:" + fg + ";'>" + text + "</div>";
}

function defaultFooter(C) {
    return "Need help? Contact <a href='mailto:security@crevio.indevs.in' style='color:" + C.TEXT_SECONDARY + ";text-decoration:underline;'>Crevio Support</a>.<br><br><strong style='color:" + C.TEXT_SECONDARY + ";'>The Crevio Team</strong><br>" + layout.brandTagline;
}

// =========================================================
// 1. NEW DEVICE SIGN-IN
// =========================================================
function renderNewDeviceSignIn(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const device = opts.device || "Unknown device";
    const location = opts.location || "Unknown location";
    const ipAddress = opts.ipAddress || "Unknown";
    const timestamp = opts.timestamp || formatDateTime();
    const lockdownUrl = opts.lockdownUrl || null;

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Device", device],
        ["Location", location],
        ["IP address", ipAddress],
        ["Time", timestamp]
    ];

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>We noticed a new sign-in to your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio account</strong> from a device we don't recognize.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;'><strong>If this was you</strong>, no action is needed. You can safely ignore this email.</p>";
    bodyHtml += alertBanner(
        "<strong>If this wasn't you</strong>, someone may have access to your account. Secure it immediately by changing your password and signing out of all devices.",
        "danger", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "New sign-in on " + device,
        title: "New sign-in detected",
        bodyHtml: bodyHtml,
        ctaText: lockdownUrl ? "Secure My Account" : null,
        ctaUrl: lockdownUrl,
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "We noticed a new sign-in to your Crevio account from a device we don't recognize.",
        "",
        "DEVICE",
        "  Device:     " + device,
        "  Location:   " + location,
        "  IP:         " + ipAddress,
        "  Time:       " + timestamp,
        "",
        "If this was you, no action is needed.",
        "If this wasn't you, secure your account immediately by changing your password.",
        "",
        lockdownUrl ? ("Secure your account: " + lockdownUrl) : "",
        "",
        "The Crevio Team"
    ].filter(Boolean).join("\n");

    return {
        subject: "New sign-in to your Crevio account",
        html: html,
        text: text
    };
}

// =========================================================
// 2. PASSWORD CHANGED
// =========================================================
function renderPasswordChanged(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const timestamp = opts.timestamp || formatDateTime();
    const ipAddress = opts.ipAddress || "Unknown";

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Changed", timestamp],
        ["IP address", ipAddress]
    ];

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your Crevio account password was changed successfully.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;'><strong>If this was you</strong>, no action is needed.</p>";
    bodyHtml += alertBanner(
        "<strong>If you didn't change your password</strong>, someone may have access to your account. Reset your password immediately and contact Crevio Support.",
        "danger", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "Your Crevio password was changed",
        title: "Password changed",
        bodyHtml: bodyHtml,
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio account password was changed successfully.",
        "",
        "PASSWORD CHANGE",
        "  Changed:  " + timestamp,
        "  IP:       " + ipAddress,
        "",
        "If this wasn't you, reset your password immediately and contact security@crevio.indevs.in",
        "",
        "The Crevio Team"
    ].join("\n");

    return {
        subject: "Your Crevio password was changed",
        html: html,
        text: text
    };
}

// =========================================================
// 3. EMAIL CHANGED
// =========================================================
function renderEmailChanged(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const oldEmail = opts.oldEmail || "(previous email)";
    const newEmail = opts.newEmail || "(new email)";
    const timestamp = opts.timestamp || formatDateTime();

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Previous email", oldEmail],
        ["New email", newEmail],
        ["Changed", timestamp]
    ];

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>The email address on your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio account</strong> was updated successfully.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;'><strong>If this was you</strong>, no action is needed. Use your new email to sign in from now on.</p>";
    bodyHtml += alertBanner(
        "<strong>If you didn't request this change</strong>, someone may have access to your account. Contact Crevio Support immediately.",
        "danger", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "Your Crevio email address was changed",
        title: "Email address changed",
        bodyHtml: bodyHtml,
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "The email address on your Crevio account was updated.",
        "",
        "EMAIL CHANGE",
        "  From:  " + oldEmail,
        "  To:    " + newEmail,
        "  When:  " + timestamp,
        "",
        "If this wasn't you, contact security@crevio.indevs.in immediately.",
        "",
        "The Crevio Team"
    ].join("\n");

    return {
        subject: "Your Crevio email address was changed",
        html: html,
        text: text
    };
}

// =========================================================
// 4. TWO-FACTOR CHANGED (enabled OR disabled)
// =========================================================
function renderTwoFactorChanged(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const enabled = opts.enabled !== false;
    const method = opts.method || null; // "authenticator" | "email" | null
    const timestamp = opts.timestamp || formatDateTime();

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const stateWord = enabled ? "enabled" : "disabled";
    const stateLabel = enabled ? "Enabled" : "Disabled";
    const methodLabel = method === "email" ? "Email 2FA"
        : (method === "authenticator" ? "Authenticator App" : "Two-Factor Authentication");

    const rows = [
        ["Status", stateLabel],
        ["Method", methodLabel],
        ["Changed", timestamp]
    ];

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Two-factor authentication (2FA) was <strong style='color:" + C.TEXT_PRIMARY + ";'>" + stateWord + "</strong> on your Crevio account.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);

    if (enabled) {
        bodyHtml += "<p style='margin:8px 0 0 0;'>Your account now has an extra layer of security. Keep your authenticator app or email inbox safe.</p>";
    } else {
        bodyHtml += alertBanner(
            "Without 2FA, your account is more vulnerable to unauthorized access. If you didn't make this change, re-enable 2FA and change your password immediately.",
            "danger", C, FONT
        );
    }

    const html = layout.renderEmail({
        preheader: "Two-factor authentication was " + stateWord,
        title: "Two-factor authentication " + stateWord,
        bodyHtml: bodyHtml,
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "Two-factor authentication was " + stateWord + " on your Crevio account.",
        "",
        "2FA",
        "  Status:   " + stateLabel,
        "  Method:   " + methodLabel,
        "  Changed:  " + timestamp,
        "",
        enabled
            ? "Your account now has an extra layer of security."
            : "If this wasn't you, re-enable 2FA and change your password immediately.",
        "",
        "The Crevio Team"
    ].join("\n");

    return {
        subject: "Two-factor authentication " + stateWord + " on Crevio",
        html: html,
        text: text
    };
}

// =========================================================
// 5. PASSWORD RESET LINK
// =========================================================
function renderPasswordResetLink(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const resetUrl = opts.resetUrl || (appUrl() + "/admin/pages/reset-password.html");
    const expiresIn = opts.expiresIn || "30 minutes";
    const ipAddress = opts.ipAddress || null;

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>We received a request to reset the password on your Crevio account.</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Click the button below to set a new password. This link expires in <strong>" + esc(expiresIn) + "</strong>.</p>";
    if (ipAddress) {
        bodyHtml += "<p style='margin:0 0 8px 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>Request came from IP: " + esc(ipAddress) + "</p>";
    }
    bodyHtml += alertBanner(
        "If you didn't request a password reset, you can safely ignore this email — your password won't change. No one else has access to your account.",
        "warning", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "Reset your Crevio password (link expires in " + expiresIn + ")",
        title: "Reset your password",
        bodyHtml: bodyHtml,
        ctaText: "Reset Password",
        ctaUrl: resetUrl,
        footerNote: defaultFooter(C) + "<br><br><span style='font-size:11px;'>If the button doesn't work, paste this into your browser:<br>" + esc(resetUrl) + "</span>"
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "We received a request to reset the password on your Crevio account.",
        "",
        "Reset your password here (expires in " + expiresIn + "):",
        resetUrl,
        "",
        "If you didn't request this, you can safely ignore this email.",
        "",
        "The Crevio Team"
    ].join("\n");

    return {
        subject: "Reset your Crevio password",
        html: html,
        text: text
    };
}

// =========================================================
// 6. OTP CODE (for password reset OR login 2FA)
// =========================================================
function renderOtpCode(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const code = opts.code || "000000";
    const purpose = opts.purpose || "login"; // "login" | "reset"
    const expiresIn = opts.expiresIn || "10 minutes";

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const isLogin = purpose === "login";
    const title = isLogin ? "Your Crevio sign-in code" : "Your Crevio reset code";
    const intro = isLogin
        ? "Someone is trying to sign in to your Crevio account from a new device. Use the code below to confirm it's you."
        : "Use the code below to continue resetting your Crevio password.";

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>" + esc(intro) + "</p>";
    bodyHtml += bigCodeBlock(code, C, FONT);
    bodyHtml += "<p style='margin:8px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>This code expires in <strong>" + esc(expiresIn) + "</strong>. Never share it with anyone — Crevio staff will never ask for it.</p>";
    bodyHtml += alertBanner(
        "If you didn't request this code, someone may be trying to access your account. Contact <strong>security@crevio.indevs.in</strong> immediately.",
        "danger", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "Your Crevio code: " + code + " (expires in " + expiresIn + ")",
        title: title,
        bodyHtml: bodyHtml,
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        intro,
        "",
        "  " + code,
        "",
        "This code expires in " + expiresIn + ". Never share it with anyone.",
        "",
        "If you didn't request this, contact security@crevio.indevs.in immediately.",
        "",
        "The Crevio Team"
    ].join("\n");

    return {
        subject: isLogin ? "Your Crevio sign-in code" : "Your Crevio reset code",
        html: html,
        text: text
    };
}

// =========================================================
// 7. RECOVERY CODE USED
// =========================================================
function renderRecoveryCodeUsed(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const timestamp = opts.timestamp || formatDateTime();
    const ipAddress = opts.ipAddress || "Unknown";
    const remaining = opts.remainingCodes !== undefined ? opts.remainingCodes : null;

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Used", timestamp],
        ["IP address", ipAddress]
    ];
    if (remaining !== null) {
        rows.push(["Codes remaining", String(remaining)]);
    }

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>A <strong>recovery code</strong> was just used to access your Crevio account. Each code can only be used once.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    if (remaining !== null && remaining < 3) {
        bodyHtml += alertBanner(
            "You're running low on recovery codes. Generate a fresh set from your Security settings to avoid getting locked out.",
            "warning", C, FONT
        );
    }
    bodyHtml += alertBanner(
        "<strong>If this wasn't you</strong>, someone has access to your recovery codes. Change your password and generate new recovery codes immediately.",
        "danger", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "A recovery code was used on your Crevio account",
        title: "Recovery code used",
        bodyHtml: bodyHtml,
        ctaText: "Security Settings",
        ctaUrl: appUrl() + "/dashboard/pages/security.html",
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "A recovery code was used to access your Crevio account.",
        "",
        "RECOVERY CODE USE",
        "  Used:       " + timestamp,
        "  IP:         " + ipAddress,
        (remaining !== null ? "  Remaining:  " + remaining : ""),
        "",
        "If this wasn't you, change your password and generate new recovery codes immediately.",
        "",
        "The Crevio Team"
    ].filter(Boolean).join("\n");

    return {
        subject: "A recovery code was used on your Crevio account",
        html: html,
        text: text
    };
}

// =========================================================
// 8. ACCOUNT LOCKED (compromise report)
// =========================================================
function renderAccountLocked(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const timestamp = opts.timestamp || formatDateTime();
    const sessionsRevoked = opts.sessionsRevoked !== undefined ? opts.sessionsRevoked : null;
    const devicesRevoked = opts.devicesRevoked !== undefined ? opts.devicesRevoked : null;

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Locked", timestamp],
        ["Status", "Account secured"]
    ];
    if (sessionsRevoked !== null) rows.push(["Sessions signed out", String(sessionsRevoked)]);
    if (devicesRevoked !== null) rows.push(["Devices revoked", String(devicesRevoked)]);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio account has been secured</strong>. We received a report that your account may have been compromised.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;'><strong>What happens next:</strong></p>";
    bodyHtml += "<ul style='margin:8px 0 0 0;padding-left:20px;font-size:13px;line-height:1.7;color:" + C.TEXT_SECONDARY + ";font-family:" + FONT + ";'>" +
        "<li>Every device has been signed out of your Crevio account</li>" +
        "<li>All trusted devices have been revoked</li>" +
        "<li>Your account is locked and requires a password reset to regain access</li>" +
        "<li>A password reset link has been sent to your email</li>" +
        "</ul>";
    bodyHtml += alertBanner(
        "If you didn't request this lockdown, contact <strong>security@crevio.indevs.in</strong> immediately.",
        "warning", C, FONT
    );

    const html = layout.renderEmail({
        preheader: "Your Crevio account has been secured",
        title: "Your account has been secured",
        bodyHtml: bodyHtml,
        ctaText: "Reset Password",
        ctaUrl: appUrl() + "/admin/pages/reset-password.html",
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio account has been secured.",
        "",
        "ACCOUNT LOCKDOWN",
        "  Locked:  " + timestamp,
        (sessionsRevoked !== null ? "  Sessions signed out:  " + sessionsRevoked : ""),
        (devicesRevoked !== null ? "  Devices revoked:       " + devicesRevoked : ""),
        "",
        "What happens next:",
        "  - Every device is signed out",
        "  - All trusted devices are revoked",
        "  - Account is locked until you reset your password",
        "",
        "Reset your password: " + appUrl() + "/admin/pages/reset-password.html",
        "",
        "The Crevio Team"
    ].filter(Boolean).join("\n");

    return {
        subject: "Your Crevio account has been secured",
        html: html,
        text: text
    };
}


// =========================================================
// 9. ACCOUNT UNLOCKED
// =========================================================
function renderAccountUnlocked(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const timestamp = opts.timestamp || formatDateTime();

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Unlocked", timestamp],
        ["Status", "Account active"]
    ];

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio account has been unlocked</strong> and is ready to use again.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;'>Thanks for going through the security steps. Everything is back to normal.</p>";

    const html = layout.renderEmail({
        preheader: "Your Crevio account has been unlocked",
        title: "Your account is unlocked",
        bodyHtml: bodyHtml,
        ctaText: "Go to Dashboard",
        ctaUrl: appUrl() + "/dashboard/",
        footerNote: defaultFooter(C)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio account has been unlocked and is ready to use.",
        "",
        "Unlocked: " + timestamp,
        "Status:   Account active",
        "",
        "The Crevio Team"
    ].join("\n");

    return {
        subject: "Your Crevio account has been unlocked",
        html: html,
        text: text
    };
}

module.exports = {
    renderNewDeviceSignIn: renderNewDeviceSignIn,
    renderPasswordChanged: renderPasswordChanged,
    renderEmailChanged: renderEmailChanged,
    renderTwoFactorChanged: renderTwoFactorChanged,
    renderPasswordResetLink: renderPasswordResetLink,
    renderOtpCode: renderOtpCode,
    renderRecoveryCodeUsed: renderRecoveryCodeUsed,
    renderAccountLocked: renderAccountLocked,
    renderAccountUnlocked: renderAccountUnlocked
};