// =========================================================
// CREVIO — EMAIL LAYOUT
// File: backend/emails/layout.js
// Shared HTML shell for all Crevio emails.
// Table-based, inline-styled — works in Gmail, Outlook, Apple Mail.
// =========================================================

const brand = require("./brand");

const BRAND_DARK = "#0F172A";
const BRAND_ACCENT = "#2563EB";
const BG_OUTER = "#F1F5F9";
const BG_CARD = "#FFFFFF";
const BORDER = "#E2E8F0";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#475569";
const TEXT_MUTED = "#94A3B8";

// Arial / Helvetica — guaranteed sans-serif in every email client
const FONT = "Arial,Helvetica,sans-serif";

function renderEmail(opts) {
    opts = opts || {};
    const preheader = opts.preheader || "";
    const title = opts.title || "";
    const bodyHtml = opts.bodyHtml || "";
    const ctaText = opts.ctaText || null;
    const ctaUrl = opts.ctaUrl || null;
    const footerNote = opts.footerNote || "";

    const cta = ctaText && ctaUrl
        ? "<tr><td style='padding:20px 40px 4px 40px;text-align:center;'>" +
            "<a href='" + ctaUrl + "' style='display:inline-block;padding:10px 22px;" +
            "background-color:" + BRAND_ACCENT + ";color:#FFFFFF;text-decoration:none;" +
            "border-radius:8px;font-size:13px;font-weight:600;font-family:" + FONT + ";'>" +
            ctaText + "</a></td></tr>"
        : "";

    return [
        "<!DOCTYPE html>",
        "<html><head><meta charset='UTF-8'>",
        "<meta name='viewport' content='width=device-width,initial-scale=1.0'>",
        "<meta name='x-apple-disable-message-reformatting'>",
        "<title>" + title + "</title>",
        "<style>body,table,td,tr,p,div,li,ul,ol,span,a,h1,h2,h3,h4,h5,h6,strong,em,small{font-family:" + FONT + " !important;}</style>",
        "</head>",
        "<body style='margin:0;padding:0;background-color:" + BG_OUTER + ";font-family:" + FONT + ";'>",
        "<div style='display:none;max-height:0;overflow:hidden;opacity:0;'>" + preheader + "</div>",
        "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color:" + BG_OUTER + ";padding:24px 12px;'>",
        "<tr><td align='center'>",
        "<table role='presentation' width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;width:100%;background-color:" + BG_CARD + ";border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06);'>",
        "<tr><td style='background-color:" + BRAND_DARK + ";padding:36px 40px 28px 40px;text-align:center;line-height:1.2;'>",
        brand.wordmarkHtml({ height: 44 }),
        "<div style='color:#94A3B8;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-top:12px;font-family:" + FONT + ";'>" + brand.TAGLINE + "</div>",
        "</td></tr>",
        "<tr><td style='padding:36px 40px 8px 40px;'>",
        "<div style='font-size:22px;font-weight:700;color:" + TEXT_PRIMARY + ";font-family:" + FONT + ";line-height:1.3;'>" + title + "</div>",
        "</td></tr>",
        "<tr><td style='padding:8px 40px 0 40px;font-size:14px;line-height:1.6;color:" + TEXT_SECONDARY + ";font-family:" + FONT + ";'>" + bodyHtml + "</td></tr>",
        cta,
        "<tr><td style='padding:32px 40px 24px 40px;border-top:1px solid " + BORDER + ";'>",
        "<div style='font-size:12px;line-height:1.6;color:" + TEXT_MUTED + ";font-family:" + FONT + ";text-align:center;'>" + footerNote + "</div>",
        "</td></tr>",
        "</table>",
        "<div style='font-size:11px;color:" + TEXT_MUTED + ";margin-top:16px;text-align:center;font-family:" + FONT + ";'>© Crevio — crevio.indevs.in</div>",
        "</td></tr></table></body></html>"
    ].join("\n");
}

function escapeHtml(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

module.exports = {
    renderEmail: renderEmail,
    escapeHtml: escapeHtml,
    COLORS: {
        BRAND_DARK: BRAND_DARK,
        BRAND_ACCENT: BRAND_ACCENT,
        BORDER: BORDER,
        TEXT_PRIMARY: TEXT_PRIMARY,
        TEXT_SECONDARY: TEXT_SECONDARY,
        TEXT_MUTED: TEXT_MUTED,
        BG_OUTER: BG_OUTER,
        BG_CARD: BG_CARD
    },
    FONT: FONT,
        brandTagline: brand.TAGLINE
};