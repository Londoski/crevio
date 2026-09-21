// =========================================================
// CREVIO — TEMPLATE: PAYMENT CONFIRMATION
// File: backend/emails/templates/paymentConfirmation.js
// =========================================================
const crypto = require("crypto");
const layout = require("../layout");
const plans = require("../../../config/plans");

function generateTransactionId(userId, amount, currency) {
    const seed = String(userId) + "|" + String(amount) + "|" + String(currency) + "|" + Date.now();
    const hash = crypto.createHash("sha256").update(seed).digest("hex").substring(0, 8).toUpperCase();
    return "CRV-" + hash;
}

function pickDisplayFeatures(planId) {
    const cfg = plans.get(planId);
    if (!cfg || !cfg.features) return [];
    return cfg.features.filter(function (f) {
        return !/^Everything in /i.test(f);
    });
}

function formatAmount(amountCents, currency) {
    const cur = (currency || "USD").toUpperCase();
    const amt = ((amountCents || 0) / 100).toFixed(2);
    return cur + " " + amt;
}

function formatDate(d) {
    const dt = d || new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[dt.getMonth()] + " " + dt.getDate() + ", " + dt.getFullYear();
}

function render(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const planId = String(opts.planId || "pro").toLowerCase();
    const cfg = plans.get(planId);
    const planName = opts.planName || cfg.name;
    const amount = opts.amount || 0;
    const currency = opts.currency || "USD";
    const interval = opts.interval || cfg.interval || "month";
    const transactionId = opts.transactionId || generateTransactionId(opts.userId, amount, currency);
    const date = formatDate(opts.date ? new Date(opts.date) : new Date());
    const manageUrl = opts.manageUrl || "http://localhost:3000/dashboard/pages/billing.html";
    const features = pickDisplayFeatures(planId);

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    // ---- Payment box rows ----
    const rows = [
        ["Plan", planName],
        ["Amount paid", formatAmount(amount, currency)],
        ["Billing period", interval.charAt(0).toUpperCase() + interval.slice(1) + "ly"],
        ["Payment date", date],
        ["Transaction ID", transactionId]
    ];

    // ---- Build the payment box as a flat 2-column table ----
    const labelCell = "padding:11px 22px;font-size:13px;color:" + C.TEXT_MUTED + ";font-family:" + FONT + ";text-align:left;vertical-align:middle;";
    const valueCell = "padding:11px 22px;font-size:13px;color:" + C.TEXT_PRIMARY + ";font-weight:600;font-family:" + FONT + ";text-align:right;vertical-align:middle;white-space:nowrap;";

    let paymentBox = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' " +
        "style='background-color:#F8FAFC;border:1px solid " + C.BORDER + ";border-radius:12px;margin:20px 0;width:100%;'>";

    // Header row
    paymentBox += "<tr><td colspan='2' style='padding:16px 22px 4px 22px;text-align:left;'>" +
        "<div style='font-size:11px;font-weight:700;color:" + C.TEXT_MUTED + ";letter-spacing:0.08em;font-family:" + FONT + ";'>PAYMENT</div>" +
        "</td></tr>";

    // Data rows
    rows.forEach(function (r, i) {
        const borderStyle = i === rows.length - 1 ? "" : "border-bottom:1px solid " + C.BORDER + ";";
        paymentBox += "<tr>";
        paymentBox += "<td width='55%' align='left' valign='middle' style='" + labelCell + borderStyle + "'>" + esc(r[0]) + "</td>";
        paymentBox += "<td width='45%' align='right' valign='middle' style='" + valueCell + borderStyle + "'>" + esc(r[1]) + "</td>";
        paymentBox += "</tr>";
    });

    // Status row (last, no bottom border)
    paymentBox += "<tr>";
    paymentBox += "<td width='55%' align='left' valign='middle' style='" + labelCell + "'>Status</td>";
    paymentBox += "<td width='45%' align='right' valign='middle' style='padding:11px 22px;text-align:right;vertical-align:middle;'>" +
        "<span style='display:inline-block;padding:3px 10px;background-color:#DCFCE7;color:#166534;border-radius:999px;font-size:11px;font-weight:700;font-family:" + FONT + ";'>PAID</span>" +
        "</td>";
    paymentBox += "</tr>";

    paymentBox += "</table>";

    // ---- Features block ----
    let featuresBox = "";
    if (features.length) {
        featuresBox = "<div style='margin:24px 0 8px 0;'>" +
            "<div style='font-size:11px;font-weight:700;color:" + C.TEXT_MUTED + ";letter-spacing:0.08em;font-family:" + FONT + ";margin-bottom:10px;'>YOUR " + esc(planName.toUpperCase()) + " ACCESS INCLUDES</div>";
        featuresBox += "<ul style='margin:0;padding-left:20px;font-size:13px;line-height:1.7;color:" + C.TEXT_SECONDARY + ";font-family:" + FONT + ";'>";
        features.forEach(function (f) {
            featuresBox += "<li>" + esc(f) + "</li>";
        });
        featuresBox += "</ul></div>";
    }

    // ---- Body HTML ----
    const bodyHtml = [
        "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>",
        "<p style='margin:0 0 8px 0;'>Your payment has been successfully received. Thank you for choosing <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(planName) + "</strong>.</p>",
        paymentBox,
        "<p style='margin:8px 0 0 0;'>Your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(planName) + "</strong> subscription is now active. You can continue building, managing, and presenting your professional work with Crevio.</p>",
        featuresBox,
        "<p style='margin:12px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>Your subscription will renew automatically according to your billing cycle.</p>"
    ].join("");

    // ---- Full HTML ----
    const html = layout.renderEmail({
        preheader: "Payment of " + formatAmount(amount, currency) + " confirmed for Crevio " + planName,
        title: "Payment confirmed",
        bodyHtml: bodyHtml,
        ctaText: "Manage Subscription",
        ctaUrl: manageUrl,
        footerNote: "Need help? Contact <a href='mailto:security@crevio.indevs.in' style='color:" + C.TEXT_SECONDARY + ";text-decoration:underline;'>Crevio Support</a>.<br>If you did not make this payment, please contact us immediately.<br><br><strong style='color:" + C.TEXT_SECONDARY + ";'>The Crevio Team</strong><br>" + layout.brandTagline
    });

    // ---- Plain text fallback ----
    const text = [
        "Hi " + firstName + ",",
        "",
        "Your payment has been successfully received. Thank you for choosing Crevio " + planName + ".",
        "",
        "PAYMENT",
        "  Plan:            " + planName,
        "  Amount paid:     " + formatAmount(amount, currency),
        "  Billing period:  " + interval.charAt(0).toUpperCase() + interval.slice(1) + "ly",
        "  Payment date:    " + date,
        "  Transaction ID:  " + transactionId,
        "  Status:          PAID",
        "",
        "Your Crevio " + planName + " subscription is now active.",
        "",
        "Your " + planName + " access includes:",
        features.map(function (f) { return "  - " + f; }).join("\n"),
        "",
        "Manage your subscription: " + manageUrl,
        "",
        "Need help? Contact security@crevio.indevs.in",
        "If you did not make this payment, please contact us immediately.",
        "",
        "The Crevio Team"
    ].join("\n");

    const subject = "Payment confirmed — Welcome to Crevio " + planName;

    return { subject: subject, html: html, text: text, transactionId: transactionId };
}

module.exports = { render: render, generateTransactionId: generateTransactionId };