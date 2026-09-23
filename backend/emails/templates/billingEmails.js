// =========================================================
// CREVIO — BILLING EMAIL TEMPLATES
// File: backend/emails/templates/billingEmails.js
// All billing lifecycle emails share the same shell + brand.
// Each render* function returns { subject, html, text }.
// =========================================================
const layout = require("../layout");
const plans = require("../../../config/plans");

// ---------- helpers ----------
function formatAmount(amountCents, currency) {
    const cur = (currency || "USD").toUpperCase();
    const amt = ((amountCents || 0) / 100).toFixed(2);
    return cur + " " + amt;
}

function formatDate(d) {
    const dt = d ? new Date(d) : new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[dt.getMonth()] + " " + dt.getDate() + ", " + dt.getFullYear();
}

function planRank(planId) {
    const order = { free: 0, pro: 1, business: 2 };
    return order[planId] !== undefined ? order[planId] : 0;
}

function pickDisplayFeatures(planId) {
    const cfg = plans.get(planId);
    if (!cfg || !cfg.features) return [];
    return cfg.features.filter(function (f) {
        return !/^Everything in /i.test(f);
    });
}

function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

// ---------- shared blocks ----------
function detailsCard(rows, C, FONT, esc) {
    const labelCell = "padding:11px 22px;font-size:13px;color:" + C.TEXT_MUTED + ";font-family:" + FONT + ";text-align:left;vertical-align:middle;";
    const valueCell = "padding:11px 22px;font-size:13px;color:" + C.TEXT_PRIMARY + ";font-weight:600;font-family:" + FONT + ";text-align:right;vertical-align:middle;white-space:nowrap;";

    let h = "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' " +
        "style='background-color:#F8FAFC;border:1px solid " + C.BORDER + ";border-radius:12px;margin:20px 0;width:100%;'>";

    rows.forEach(function (r, i) {
        const borderStyle = i === rows.length - 1 ? "" : "border-bottom:1px solid " + C.BORDER + ";";
        h += "<tr>";
        h += "<td width='55%' align='left' valign='middle' style='" + labelCell + borderStyle + "'>" + esc(r[0]) + "</td>";
        h += "<td width='45%' align='right' valign='middle' style='" + valueCell + borderStyle + "'>" + esc(r[1]) + "</td>";
        h += "</tr>";
    });

    h += "</table>";
    return h;
}

function featuresList(planId, C, FONT, esc) {
    const features = pickDisplayFeatures(planId);
    if (!features.length) return "";
    const cfg = plans.get(planId);
    let h = "<div style='margin:20px 0 8px 0;'>";
    h += "<div style='font-size:11px;font-weight:700;color:" + C.TEXT_MUTED + ";letter-spacing:0.08em;font-family:" + FONT + ";margin-bottom:10px;'>YOUR " + esc(cfg.name.toUpperCase()) + " ACCESS INCLUDES</div>";
    h += "<ul style='margin:0;padding-left:20px;font-size:13px;line-height:1.7;color:" + C.TEXT_SECONDARY + ";font-family:" + FONT + ";'>";
    features.forEach(function (f) { h += "<li>" + esc(f) + "</li>"; });
    h += "</ul></div>";
    return h;
}

function defaultFooter(C, tagline) {
    return "Need help? Contact <a href='mailto:security@crevio.indevs.in' style='color:" + C.TEXT_SECONDARY + ";text-decoration:underline;'>Crevio Support</a>.<br><br><strong style='color:" + C.TEXT_SECONDARY + ";'>The Crevio Team</strong><br>" + tagline;
}

// =========================================================
// 1. PLAN CHANGED — upgrade or downgrade
// =========================================================
function renderPlanChanged(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const fromPlanId = String(opts.fromPlanId || "free").toLowerCase();
    const toPlanId = String(opts.toPlanId || "pro").toLowerCase();
    const fromCfg = plans.get(fromPlanId);
    const toCfg = plans.get(toPlanId);
    const isUpgrade = planRank(toPlanId) > planRank(fromPlanId);
    const manageUrl = opts.manageUrl || (appUrl() + "/dashboard/pages/billing.html");
    const nextCfg = toCfg.upgradeTo ? plans.get(toCfg.upgradeTo) : null;

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Previous plan", fromCfg.name],
        ["New plan", toCfg.name],
        ["Price", toCfg.priceLabel || "Free"],
        ["Effective", "Immediately"]
    ];

    const title = isUpgrade
        ? ("Welcome to Crevio " + toCfg.name)
        : ("Your plan is now " + toCfg.name);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    if (isUpgrade) {
        bodyHtml += "<p style='margin:0 0 8px 0;'>You've successfully upgraded from <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(fromCfg.name) + "</strong> to <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(toCfg.name) + "</strong>. Your new features are ready to use right now.</p>";
    } else {
        bodyHtml += "<p style='margin:0 0 8px 0;'>Your plan has changed from <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(fromCfg.name) + "</strong> to <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(toCfg.name) + "</strong>. Here's what you have now.</p>";
    }
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += featuresList(toPlanId, C, FONT, esc);

    if (isUpgrade && nextCfg) {
        bodyHtml += "<p style='margin:12px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>Ready for more? You can upgrade to <strong>" + esc(nextCfg.name) + "</strong> anytime from your Billing page.</p>";
    } else if (!isUpgrade && nextCfg) {
        bodyHtml += "<p style='margin:12px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>You can upgrade again anytime to <strong>" + esc(nextCfg.name) + "</strong>.</p>";
    }

    const html = layout.renderEmail({
        preheader: isUpgrade ? ("You're now on Crevio " + toCfg.name) : ("Your plan is now " + toCfg.name),
        title: title,
        bodyHtml: bodyHtml,
        ctaText: "Manage Subscription",
        ctaUrl: manageUrl,
        footerNote: defaultFooter(C, layout.brandTagline)
    });

    const text = [
        "Hi " + firstName + ",",
        "",
        isUpgrade
            ? ("You've upgraded from Crevio " + fromCfg.name + " to Crevio " + toCfg.name + ".")
            : ("Your plan has changed from Crevio " + fromCfg.name + " to Crevio " + toCfg.name + "."),
        "",
        "PLAN",
        "  Previous:  " + fromCfg.name,
        "  New:       " + toCfg.name,
        "  Price:     " + (toCfg.priceLabel || "Free"),
        "  Effective: Immediately",
        "",
        "Manage your subscription: " + manageUrl,
        "",
        "The Crevio Team"
    ].join("\n");

    const subject = isUpgrade
        ? ("Welcome to Crevio " + toCfg.name)
        : ("Your Crevio plan is now " + toCfg.name);

    return { subject: subject, html: html, text: text };
}

// =========================================================
// 2. SUBSCRIPTION RENEWED
// =========================================================
function renderSubscriptionRenewed(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const planId = String(opts.planId || "pro").toLowerCase();
    const cfg = plans.get(planId);
    const amount = opts.amount || 0;
    const currency = opts.currency || "USD";
    const nextRenewal = opts.nextRenewalDate || null;
    const manageUrl = opts.manageUrl || (appUrl() + "/dashboard/pages/billing.html");

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Plan", cfg.name],
        ["Amount charged", formatAmount(amount, currency)],
        ["Status", "Paid"]
    ];
    if (nextRenewal) rows.push(["Next renewal", nextRenewal]);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(cfg.name) + "</strong> subscription has been renewed successfully.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>Thanks for continuing with Crevio. Your subscription will keep auto-renewing on the same cycle unless you cancel.</p>";

    const html = layout.renderEmail({
        preheader: "Your Crevio " + cfg.name + " subscription renewed",
        title: "Subscription renewed",
        bodyHtml: bodyHtml,
        ctaText: "Manage Subscription",
        ctaUrl: manageUrl,
        footerNote: defaultFooter(C, layout.brandTagline)
    });

    const textLines = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio " + cfg.name + " subscription has been renewed successfully.",
        "",
        "RENEWAL",
        "  Plan:          " + cfg.name,
        "  Amount:        " + formatAmount(amount, currency),
        "  Status:        Paid"
    ];
    if (nextRenewal) textLines.push("  Next renewal:  " + nextRenewal);
    textLines.push("");
    textLines.push("Manage your subscription: " + manageUrl);
    textLines.push("");
    textLines.push("The Crevio Team");

    return {
        subject: "Your Crevio " + cfg.name + " subscription renewed",
        html: html,
        text: textLines.join("\n")
    };
}

// =========================================================
// 3. SUBSCRIPTION CANCELLED
// =========================================================
function renderSubscriptionCancelled(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const planId = String(opts.planId || "pro").toLowerCase();
    const cfg = plans.get(planId);
    const accessEnds = opts.accessEnds || null;
    const reactivateUrl = opts.reactivateUrl || (appUrl() + "/dashboard/pages/billing.html");

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Plan", cfg.name],
        ["Status", "Cancelled"]
    ];
    if (accessEnds) rows.push(["Access ends", accessEnds]);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(cfg.name) + "</strong> subscription has been cancelled.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    if (accessEnds) {
        bodyHtml += "<p style='margin:8px 0 0 0;'>You'll keep full access to your " + esc(cfg.name) + " features until <strong style='color:" + C.TEXT_PRIMARY + ";'>" + esc(accessEnds) + "</strong>. After that, your account will move to the Free plan automatically.</p>";
    } else {
        bodyHtml += "<p style='margin:8px 0 0 0;'>Your account will move to the Free plan automatically.</p>";
    }
    bodyHtml += "<p style='margin:12px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>Changed your mind? You can resubscribe anytime from your Billing page.</p>";

    const html = layout.renderEmail({
        preheader: "Your Crevio " + cfg.name + " subscription has been cancelled",
        title: "Subscription cancelled",
        bodyHtml: bodyHtml,
        ctaText: "Reactivate Subscription",
        ctaUrl: reactivateUrl,
        footerNote: defaultFooter(C, layout.brandTagline)
    });

    const textLines = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio " + cfg.name + " subscription has been cancelled.",
        "",
        "CANCELLATION",
        "  Plan:        " + cfg.name,
        "  Status:      Cancelled"
    ];
    if (accessEnds) textLines.push("  Access ends: " + accessEnds);
    textLines.push("");
    textLines.push("Resubscribe anytime: " + reactivateUrl);
    textLines.push("");
    textLines.push("The Crevio Team");

    return {
        subject: "Your Crevio " + cfg.name + " subscription cancelled",
        html: html,
        text: textLines.join("\n")
    };
}

// =========================================================
// 4. REFUND PROCESSED
// =========================================================
function renderRefundProcessed(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const amount = opts.amount || 0;
    const currency = opts.currency || "USD";
    const planName = opts.planName || "Crevio";
    const transactionId = opts.transactionId || null;
    const refundDate = formatDate(opts.date);
    const manageUrl = opts.manageUrl || (appUrl() + "/dashboard/pages/billing.html");

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Plan", planName],
        ["Amount refunded", formatAmount(amount, currency)],
        ["Refund date", refundDate],
        ["Status", "Processed"]
    ];
    if (transactionId) rows.push(["Transaction ID", transactionId]);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your refund has been successfully processed. The amount will appear back on your original payment method within <strong>5-10 business days</strong>, depending on your bank.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += "<p style='margin:8px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>If you don't see the refund after 10 business days, please contact your bank or reach out to our support team.</p>";

    const html = layout.renderEmail({
        preheader: "Your refund of " + formatAmount(amount, currency) + " has been processed",
        title: "Refund processed",
        bodyHtml: bodyHtml,
        ctaText: "View Subscription",
        ctaUrl: manageUrl,
        footerNote: defaultFooter(C, layout.brandTagline)
    });

    const textLines = [
        "Hi " + firstName + ",",
        "",
        "Your refund of " + formatAmount(amount, currency) + " has been successfully processed.",
        "",
        "REFUND",
        "  Plan:            " + planName,
        "  Amount refunded: " + formatAmount(amount, currency),
        "  Refund date:     " + refundDate,
        "  Status:          Processed"
    ];
    if (transactionId) textLines.push("  Transaction ID:  " + transactionId);
    textLines.push("");
    textLines.push("Funds will appear on your statement within 5-10 business days.");
    textLines.push("");
    textLines.push("The Crevio Team");

    return {
        subject: "Your refund of " + formatAmount(amount, currency) + " has been processed",
        html: html,
        text: textLines.join("\n")
    };
}

// =========================================================
// 5. TRIAL STARTED
// =========================================================
function renderTrialStarted(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const planId = String(opts.planId || "business").toLowerCase();
    const cfg = plans.get(planId);
    const trialEnds = opts.trialEnds || null;
    const manageUrl = opts.manageUrl || (appUrl() + "/dashboard/pages/billing.html");

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Trial plan", cfg.name],
        ["Cost during trial", "Free"]
    ];
    if (trialEnds) rows.push(["Trial ends", trialEnds]);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(cfg.name) + "</strong> trial has started. You have full access to every " + esc(cfg.name) + " feature during your trial — no payment required yet.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    bodyHtml += featuresList(planId, C, FONT, esc);
    bodyHtml += "<p style='margin:12px 0 0 0;font-size:13px;color:" + C.TEXT_MUTED + ";'>We'll remind you before your trial ends. Cancel anytime from your Billing page if it's not for you.</p>";

    const html = layout.renderEmail({
        preheader: "Your Crevio " + cfg.name + " trial has started",
        title: "Your trial has started",
        bodyHtml: bodyHtml,
        ctaText: "Explore Features",
        ctaUrl: appUrl() + "/dashboard/",
        footerNote: defaultFooter(C, layout.brandTagline)
    });

    const textLines = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio " + cfg.name + " trial has started.",
        "",
        "TRIAL",
        "  Plan:              " + cfg.name,
        "  Cost during trial: Free"
    ];
    if (trialEnds) textLines.push("  Trial ends:        " + trialEnds);
    textLines.push("");
    textLines.push("Manage your subscription: " + manageUrl);
    textLines.push("");
    textLines.push("The Crevio Team");

    return {
        subject: "Your Crevio " + cfg.name + " trial has started",
        html: html,
        text: textLines.join("\n")
    };
}

// =========================================================
// 6. TRIAL ENDING SOON
// =========================================================
function renderTrialEndingSoon(opts) {
    opts = opts || {};
    const firstName = opts.firstName || "there";
    const planId = String(opts.planId || "business").toLowerCase();
    const cfg = plans.get(planId);
    const daysLeft = opts.daysLeft || 3;
    const trialEnds = opts.trialEnds || null;
    const priceLabel = cfg.priceLabel || "";
    const manageUrl = opts.manageUrl || (appUrl() + "/dashboard/pages/billing.html");

    const C = layout.COLORS;
    const FONT = layout.FONT;
    const esc = layout.escapeHtml;

    const rows = [
        ["Trial plan", cfg.name],
        ["Days left", String(daysLeft)]
    ];
    if (trialEnds) rows.push(["Trial ends", trialEnds]);
    if (priceLabel) rows.push(["After trial", priceLabel]);

    let bodyHtml = "";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Hi " + esc(firstName) + ",</p>";
    bodyHtml += "<p style='margin:0 0 8px 0;'>Heads up — your <strong style='color:" + C.TEXT_PRIMARY + ";'>Crevio " + esc(cfg.name) + "</strong> trial ends in <strong>" + daysLeft + " day" + (daysLeft === 1 ? "" : "s") + "</strong>.</p>";
    bodyHtml += detailsCard(rows, C, FONT, esc);
    if (priceLabel) {
        bodyHtml += "<p style='margin:8px 0 0 0;'>After your trial, you'll be charged <strong style='color:" + C.TEXT_PRIMARY + ";'>" + esc(priceLabel) + "</strong> to continue on " + esc(cfg.name) + ". You can cancel anytime before then with no charge.</p>";
    } else {
        bodyHtml += "<p style='margin:8px 0 0 0;'>You can cancel anytime before then with no charge.</p>";
    }

    const html = layout.renderEmail({
        preheader: "Your Crevio " + cfg.name + " trial ends in " + daysLeft + " day" + (daysLeft === 1 ? "" : "s"),
        title: "Your trial ends soon",
        bodyHtml: bodyHtml,
        ctaText: "Manage Subscription",
        ctaUrl: manageUrl,
        footerNote: defaultFooter(C, layout.brandTagline)
    });

    const textLines = [
        "Hi " + firstName + ",",
        "",
        "Your Crevio " + cfg.name + " trial ends in " + daysLeft + " day" + (daysLeft === 1 ? "" : "s") + ".",
        "",
        "TRIAL",
        "  Plan:       " + cfg.name,
        "  Days left:  " + daysLeft
    ];
    if (trialEnds) textLines.push("  Trial ends: " + trialEnds);
    if (priceLabel) textLines.push("  After:      " + priceLabel);
    textLines.push("");
    textLines.push("Manage your subscription: " + manageUrl);
    textLines.push("");
    textLines.push("The Crevio Team");

    return {
        subject: "Your Crevio " + cfg.name + " trial ends in " + daysLeft + " day" + (daysLeft === 1 ? "" : "s"),
        html: html,
        text: textLines.join("\n")
    };
}

module.exports = {
    renderPlanChanged: renderPlanChanged,
    renderSubscriptionRenewed: renderSubscriptionRenewed,
    renderSubscriptionCancelled: renderSubscriptionCancelled,
    renderRefundProcessed: renderRefundProcessed,
    renderTrialStarted: renderTrialStarted,
    renderTrialEndingSoon: renderTrialEndingSoon
};