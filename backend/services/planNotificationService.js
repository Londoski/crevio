// =========================================================
// CREVIO — PLAN NOTIFICATION SERVICE
// File: backend/services/planNotificationService.js
// Fires notification + queued email on plan lifecycle
// events. Called by authController.register, webhooks, or
// any future upgrade flow. Never invoked from the frontend.
// =========================================================
const PLANS = require("../../config/plans");
const db = require("../../database/db");
const notificationService = require("./notificationService");
const emailService = require("./emailService");
const billingEmails = require("../emails/templates/billingEmails");

function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

function planFeaturesText(planId) {
    const cfg = PLANS.get(planId);
    if (!cfg || !cfg.features || !cfg.features.length) return "";
    return cfg.features.map(function (f) { return "- " + f; }).join("\n");
}

// =========================================================
// onSignup — welcome message with upgrade CTA (Free)
// =========================================================
async function onSignup({ userId, userEmail, userName }) {
    try {
        const cfg = PLANS.get("free");
        const next = cfg.upgradeTo ? PLANS.get(cfg.upgradeTo) : null;

        let message =
            "**Welcome to Crevio" + (userName ? ", " + userName : "") + "**\n\n" +
            "You're on the **Free** plan. Here's what you have:\n\n" +
            planFeaturesText("free") + "\n\n";

        if (next) {
            message +=
                "### Ready to do more?\n\n" +
                "Upgrade to **" + next.name + "** for:" +
                "\n\n" + planFeaturesText(next.id);
        }

        notificationService.create({
            userId: userId,
            type: "system",
            title: "Welcome to Crevio",
            message: message,
            entityType: null,
            entityId: null
        });

        if (userEmail) {
            const subject = "Welcome to Crevio — you're on the Free plan";
            const text =
                "Hi" + (userName ? " " + userName : "") + ",\n\n" +
                "Welcome to Crevio. You're on the Free plan.\n\n" +
                "What you have:\n\n" +
                planFeaturesText("free") + "\n\n" +
                (next
                    ? ("Want more? Upgrade to " + next.name + " (" + next.priceLabel + "):\n\n" + planFeaturesText(next.id) + "\n\n")
                    : "") +
                "Manage your plan at " + appUrl() + "/dashboard/pages/billing.html\n\n" +
                "If you have any questions, just reply to this email.\n\n" +
                "The Crevio Team";

            emailService.send({
                userId: userId,
                to: userEmail,
                subject: subject,
                text: text,
                category: "plan_welcome_free"
            }).catch(function () {});
        }
    } catch (e) { console.error("[planNotification] onSignup failed:", e.message); }
}

// =========================================================
// onPlanChanged — upgrade / downgrade / change
// =========================================================
async function onPlanChanged(opts) {
    opts = opts || {};
    const userId = opts.userId;
    const userEmail = opts.userEmail;
    const fromPlan = opts.fromPlan;
    const toPlan = opts.toPlan;
    const firstName = opts.firstName || null;

    try {
        const fromCfg = PLANS.get(fromPlan);
        const toCfg = PLANS.get(toPlan);
        const isUpgrade = planRank(toPlan) > planRank(fromPlan);

        // First name lookup
        let resolvedName = firstName;
        if (!resolvedName && userId) {
            try {
                const u = db.prepare("SELECT display_name, username, email FROM users WHERE id = ?").get(userId);
                if (u) {
                    let raw = u.display_name || u.username || (u.email ? u.email.split("@")[0] : null);
                    if (raw) {
                        raw = String(raw).trim().split(/\s+/)[0];
                        resolvedName = raw.charAt(0).toUpperCase() + raw.slice(1);
                    }
                }
            } catch (e) { /* silent */ }
        }

        // In-app notification
        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build(isUpgrade ? "plan_upgraded" : "plan_activated", {
            planName: toCfg.name,
            previousPlanName: fromCfg.name
        });
        notificationService.create({
            userId: userId,
            type: notifContent.type,
            title: notifContent.title,
            message: notifContent.message
        });

        // HTML email
        if (userEmail) {
            const rendered = billingEmails.renderPlanChanged({
                firstName: resolvedName,
                fromPlanId: fromPlan,
                toPlanId: toPlan
            });
            emailService.send({
                userId: userId,
                to: userEmail,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                category: isUpgrade ? "plan_upgraded" : "plan_downgraded"
            }).catch(function () {});
        }
    } catch (e) {
        console.error("[planNotification] onPlanChanged failed:", e.message);
    }
}
async function onPaymentSucceeded(opts) {
    opts = opts || {};
    const userId = opts.userId;
    const userEmail = opts.userEmail;
    const amount = opts.amount || 0;
    const currency = opts.currency || "USD";
    const planId = opts.planId || "pro";
    const planName = opts.planName;
    const interval = opts.interval;
    let firstName = opts.firstName || null;
        
                // If caller didn't pass a name, look it up from the user record
                if (!firstName && userId) {
                    try {
                        const u = db.prepare("SELECT display_name, username, email FROM users WHERE id = ?").get(userId);
                        if (u) {
                            let raw = u.display_name || u.username || (u.email ? u.email.split("@")[0] : null);
                            if (raw) {
                                // Take first word, capitalize it
                                raw = String(raw).trim().split(/\s+/)[0];
                                firstName = raw.charAt(0).toUpperCase() + raw.slice(1);
                            }
                        }
                    } catch (e) { /* silent */ }
                }

    try {
        const amt = (amount / 100).toFixed(2);
        const cur = String(currency).toUpperCase();
        const displayPlan = planName || (PLANS.get(planId) ? PLANS.get(planId).name : "Crevio");

        // In-app notification (unchanged structure)
        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build("payment_successful", {
            planName: displayPlan,
            amount: amount,
            currency: currency
        });
        notificationService.create({
            userId: userId,
            type: notifContent.type,
            title: notifContent.title,
            message: notifContent.message
        });

        if (!userEmail) return;

        // Premium HTML email
        const tpl = require("../emails/templates/paymentConfirmation");
        const rendered = tpl.render({
            firstName: firstName,
            userId: userId,
            planId: planId,
            planName: displayPlan,
            amount: amount,
            currency: currency,
            interval: interval
        });

        emailService.send({
            userId: userId,
            to: userEmail,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            category: "plan_payment_succeeded"
        }).catch(function () {});
    } catch (e) {
        console.error("[planNotification] onPaymentSucceeded failed:", e.message);
    }
}

// =========================================================
// onPaymentFailed
// =========================================================
async function onPaymentFailed({ userId, userEmail, amount, currency, updateUrl, planName }) {
    try {
        const amt = ((amount || 0) / 100).toFixed(2);
        const cur = (currency || "USD").toUpperCase();
        const updateLink = updateUrl || (appUrl() + "/dashboard/pages/billing.html");

        notificationService.create({
            userId: userId,
            type: "alert",
            title: "Payment failed",
            message: "**Action required:** We couldn't process your Crevio payment.\n\n" +
                     "**Amount:** " + cur + " " + amt + "\n\n" +
                     "Please update your payment method to keep your subscription active."
        });

        if (userEmail) {
            emailService.send({
                userId: userId,
                to: userEmail,
                subject: "Action required: Crevio payment didn't go through",
                text:
                    "Hi,\n\n" +
                    "We tried to process your Crevio subscription payment of " + cur + " " + amt + " but it didn't go through.\n\n" +
                    "To keep your subscription active, please update your payment method:\n\n" +
                    "    " + updateLink + "\n\n" +
                    "If you need help, just reply to this email.\n\n" +
                    "The Crevio Team",
                category: "plan_payment_failed"
            }).catch(function () {});
        }
    } catch (e) { console.error("[planNotification] onPaymentFailed failed:", e.message); }
}

// =========================================================
// onSubscriptionExpiringSoon
// =========================================================
async function onSubscriptionExpiringSoon({ userId, userEmail, planName, daysLeft, renewDate }) {
    try {
        notificationService.create({
            userId: userId,
            type: "system",
            title: "Your " + (planName || "subscription") + " renews soon",
            message: "**Heads up:** Your Crevio " + (planName || "subscription") + " renews in " + daysLeft + " day(s)" +
                     (renewDate ? (" on " + renewDate) : "") + "."
        });

        if (userEmail) {
            emailService.send({
                userId: userId,
                to: userEmail,
                subject: "Your Crevio " + (planName || "subscription") + " renews in " + daysLeft + " days",
                text:
                    "Hi,\n\n" +
                    "Your Crevio " + (planName || "subscription") + " will renew in " + daysLeft + " day(s)" +
                    (renewDate ? (" on " + renewDate) : "") + ".\n\n" +
                    "Manage your subscription anytime: " + appUrl() + "/dashboard/pages/billing.html\n\n" +
                    "The Crevio Team",
                category: "plan_expiring_soon"
            }).catch(function () {});
        }
    } catch (e) { console.error("[planNotification] onSubscriptionExpiringSoon failed:", e.message); }
}

// ---------- helpers ----------
function planRank(planId) {
    const order = { free: 0, pro: 1, business: 2 };
    return order[planId] !== undefined ? order[planId] : 0;
}


// =========================================================
// Additional billing lifecycle notifications
// =========================================================

function resolveFirstName(userId, firstName) {
    let name = firstName;
    if (!name && userId) {
        try {
            const u = db.prepare("SELECT display_name, username, email FROM users WHERE id = ?").get(userId);
            if (u) {
                let raw = u.display_name || u.username || (u.email ? u.email.split("@")[0] : null);
                if (raw) {
                    raw = String(raw).trim().split(/\s+/)[0];
                    name = raw.charAt(0).toUpperCase() + raw.slice(1);
                }
            }
        } catch (e) { /* silent */ }
    }
    return name;
}

async function onSubscriptionRenewed(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "pro").toLowerCase();
    const amount = opts.amount || 0, currency = opts.currency || "USD";
    const nextRenewalDate = opts.nextRenewalDate || null;
    try {
        const name = resolveFirstName(userId, opts.firstName);
        const cfg = PLANS.get(planId);
        notificationService.create({
            userId: userId,
            type: "system",
            title: "Subscription renewed",
            message: "Your **Crevio " + cfg.name + "** subscription has been renewed."
        });
        if (!userEmail) return;
        const rendered = billingEmails.renderSubscriptionRenewed({
            firstName: name, planId: planId, amount: amount, currency: currency,
            nextRenewalDate: nextRenewalDate
        });
        emailService.send({
            userId: userId, to: userEmail,
            subject: rendered.subject, html: rendered.html, text: rendered.text,
            category: "plan_renewed"
        }).catch(function () {});
    } catch (e) { console.error("[planNotification] onSubscriptionRenewed failed:", e.message); }
}

async function onSubscriptionCancelled(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "pro").toLowerCase();
    const accessEnds = opts.accessEnds || null;
    try {
        const name = resolveFirstName(userId, opts.firstName);
        const cfg = PLANS.get(planId);
        notificationService.create({
            userId: userId,
            type: "system",
            title: "Subscription cancelled",
            message: "Your **Crevio " + cfg.name + "** subscription has been cancelled." +
                (accessEnds ? ("\n\nAccess continues until **" + accessEnds + "**.") : "")
        });
        if (!userEmail) return;
        const rendered = billingEmails.renderSubscriptionCancelled({
            firstName: name, planId: planId, accessEnds: accessEnds
        });
        emailService.send({
            userId: userId, to: userEmail,
            subject: rendered.subject, html: rendered.html, text: rendered.text,
            category: "plan_cancelled"
        }).catch(function () {});
    } catch (e) { console.error("[planNotification] onSubscriptionCancelled failed:", e.message); }
}

async function onRefundProcessed(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const amount = opts.amount || 0, currency = opts.currency || "USD";
    const planName = opts.planName || "Crevio";
    const transactionId = opts.transactionId || null;
    const date = opts.date || null;
    try {
        const name = resolveFirstName(userId, opts.firstName);
        const amt = (amount / 100).toFixed(2);
        notificationService.create({
            userId: userId,
            type: "system",
            title: "Refund processed",
            message: "Your refund of **" + String(currency).toUpperCase() + " " + amt + "** has been processed."
        });
        if (!userEmail) return;
        const rendered = billingEmails.renderRefundProcessed({
            firstName: name, amount: amount, currency: currency,
            planName: planName, transactionId: transactionId, date: date
        });
        emailService.send({
            userId: userId, to: userEmail,
            subject: rendered.subject, html: rendered.html, text: rendered.text,
            category: "plan_refund_processed"
        }).catch(function () {});
    } catch (e) { console.error("[planNotification] onRefundProcessed failed:", e.message); }
}

async function onTrialStarted(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "business").toLowerCase();
    const trialEnds = opts.trialEnds || null;
    try {
        const name = resolveFirstName(userId, opts.firstName);
        const cfg = PLANS.get(planId);
        notificationService.create({
            userId: userId,
            type: "system",
            title: "Your " + cfg.name + " trial has started",
            message: "Your **Crevio " + cfg.name + "** trial has started." +
                (trialEnds ? ("\n\n**Trial ends:** " + trialEnds) : "")
        });
        if (!userEmail) return;
        const rendered = billingEmails.renderTrialStarted({
            firstName: name, planId: planId, trialEnds: trialEnds
        });
        emailService.send({
            userId: userId, to: userEmail,
            subject: rendered.subject, html: rendered.html, text: rendered.text,
            category: "plan_trial_started"
        }).catch(function () {});
    } catch (e) { console.error("[planNotification] onTrialStarted failed:", e.message); }
}

async function onTrialEndingSoon(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "business").toLowerCase();
    const daysLeft = opts.daysLeft || 3;
    const trialEnds = opts.trialEnds || null;
    try {
        const name = resolveFirstName(userId, opts.firstName);
        const cfg = PLANS.get(planId);
        notificationService.create({
            userId: userId,
            type: "system",
            title: "Trial ending soon",
            message: "Your **Crevio " + cfg.name + "** trial ends in **" + daysLeft + " day(s)**." +
                (trialEnds ? ("\n\n**Ends:** " + trialEnds) : "")
        });
        if (!userEmail) return;
        const rendered = billingEmails.renderTrialEndingSoon({
            firstName: name, planId: planId, daysLeft: daysLeft, trialEnds: trialEnds
        });
        emailService.send({
            userId: userId, to: userEmail,
            subject: rendered.subject, html: rendered.html, text: rendered.text,
            category: "plan_trial_ending_soon"
        }).catch(function () {});
    } catch (e) { console.error("[planNotification] onTrialEndingSoon failed:", e.message); }
}

module.exports = {
    onSignup,
    onPlanChanged,
    onSubscriptionRenewed,
    onSubscriptionCancelled,
    onRefundProcessed,
    onTrialStarted,
    onTrialEndingSoon,
    onPaymentSucceeded,
    onPaymentFailed,
    onSubscriptionExpiringSoon
};
