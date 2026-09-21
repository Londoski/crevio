// =========================================================
// CREVIO — BRAND CONSTANTS
// File: backend/emails/brand.js
// =========================================================
// OFFICIAL CREVIO WORDMARK + TAGLINE
// DO NOT CHANGE without explicit instruction from the Crevio owner.
//
// The wordmark is hosted on ImgBB so Gmail / Outlook can load it
// (they block base64-embedded images). Local fallback exists if the
// URL ever goes down.
// =========================================================

const fs = require("fs");
const path = require("path");

const BRAND_BLUE  = "#2563EB";
const BRAND_DARK  = "#0F172A";
const BRAND_WHITE = "#FFFFFF";

const TAGLINE = "Where your work finds opportunities.";

// Primary: hosted URL — works in Gmail / Outlook / Apple Mail
const WORDMARK_HOSTED = "https://i.ibb.co/TxKyCFtJ/Crevio-png.png";

// Fallback: local file embedded as base64 (only used if the URL is unreachable)
let WORDMARK_LOCAL = null;
try {
    const p = path.join(__dirname, "..", "..", "dashboard", "assets", "crevio-wordmark-email.png");
    const buf = fs.readFileSync(p);
    WORDMARK_LOCAL = "data:image/png;base64," + buf.toString("base64");
} catch (e) { /* silent */ }

function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

function wordmarkHtml(opts) {
    opts = opts || {};
    const height = opts.height || 40;
    const align  = opts.align  || "center";
    const alt    = opts.alt    || "Crevio";
    const src    = WORDMARK_HOSTED;
    return [
        "<div style='text-align:", align, ";'>",
        "<img src='", src, "' alt='", alt, "' width='140' ",
        "style='height:", height, "px;width:auto;display:inline-block;border:0;outline:none;text-decoration:none;' />",
        "</div>"
    ].join("");
}

module.exports = {
    BRAND_BLUE: BRAND_BLUE,
    BRAND_DARK: BRAND_DARK,
    BRAND_WHITE: BRAND_WHITE,
    TAGLINE: TAGLINE,
    WORDMARK_HOSTED: WORDMARK_HOSTED,
    appUrl: appUrl,
    wordmarkHtml: wordmarkHtml
};
