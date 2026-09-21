// =========================================================
// CREVIO — BRAND CONSTANTS
// File: backend/emails/brand.js
// =========================================================
// OFFICIAL CREVIO WORDMARK + TAGLINE
//
// DO NOT CHANGE without explicit instruction from the
// Crevio owner. This file is the single source of truth
// for the brand wordmark, colors, and tagline.
//
// Locked by: phase-brand-wordmark
// =========================================================

// ---------- Brand colors ----------
const BRAND_BLUE  = "#2563EB";     // Official Crevio blue (the i-dot + ring)
const BRAND_DARK  = "#0F172A";     // Header background
const BRAND_WHITE = "#FFFFFF";     // Text on dark backgrounds

// ---------- Tagline ----------
const TAGLINE = "A platform that actively helps your work find opportunities.";

// ---------- Wordmark path (relative to server root) ----------
const WORDMARK_PATH = "/dashboard/assets/crevio-wordmark.png";

function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

// ---------- Wordmark HTML ----------
// Returns an <img> tag pointing at the hosted logo.
// Email clients serve images reliably; custom fonts do not.
function wordmarkHtml(opts) {
    opts = opts || {};
    const height = opts.height || 34;
    const align  = opts.align  || "center";
    const alt    = opts.alt    || "Crevio";
    const src    = appUrl() + WORDMARK_PATH;
    return [
        "<div style='text-align:", align, ";'>",
        "<img src='", src, "' alt='", alt, "' ",
        "style='height:", height, "px;width:auto;display:inline-block;border:0;outline:none;text-decoration:none;' />",
        "</div>"
    ].join("");
}

module.exports = {
    BRAND_BLUE: BRAND_BLUE,
    BRAND_DARK: BRAND_DARK,
    BRAND_WHITE: BRAND_WHITE,
    TAGLINE: TAGLINE,
    WORDMARK_PATH: WORDMARK_PATH,
    appUrl: appUrl,
    wordmarkHtml: wordmarkHtml
};
