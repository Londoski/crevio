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
        ,
            ctaUrl: notifContent.ctaUrl || null,
            ctaText: notifContent.ctaText || null,
            ctaUrl2: notifContent.ctaUrl2 || null,
            ctaText2: notifContent.ctaText2 || null
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
        // Reset grace-period state when user changes plans
        if (isUpgrade) {
            try {
                db.prepare("UPDATE subscriptions SET grace_ends_at = NULL, downgraded_at = NULL, data_removal_warned_at = NULL WHERE user_id = ? AND plan != 'free'").run(userId);
                db.prepare("DELETE FROM subscription_reminders_sent WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id = ?)").run(userId);
            } catch (e) { /* silent */ }
        }

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
        ,
            ctaUrl: notifContent.ctaUrl || null,
            ctaText: notifContent.ctaText || null,
            ctaUrl2: notifContent.ctaUrl2 || null,
            ctaText2: notifContent.ctaText2 || null
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
async function onPaymentFailed(opts) {
    opts = opts || {};
    const userId = opts.userId;
    const userEmail = opts.userEmail;
    const amount = opts.amount || 0;
    const currency = opts.currency || "USD";
    const planId = String(opts.planId || "pro").toLowerCase();
    const billingState = opts.billingState || "retry_pending";
    const graceUntil = opts.graceUntil || null;

    try {
        const cfg = PLANS.get(planId);
        const planName = cfg.name;
        const amt = (amount / 100).toFixed(2);
        const cur = String(currency).toUpperCase();

        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build("payment_failed", {
            planName: planName,
            amount: amount,
            currency: currency,
            billingState: billingState,
            graceUntil: graceUntil
        });

        notificationService.create({
            userId: userId,
            type: notifContent.type || "alert",
            title: notifContent.title,
            message: notifContent.message,
            ctaUrl: notifContent.ctaUrl || null,
            ctaText: notifContent.ctaText || null,
            ctaUrl2: notifContent.ctaUrl2 || null,
            ctaText2: notifContent.ctaText2 || null
        });

        if (userEmail) {
            const updateLink = opts.updateUrl || (appUrl() + "/dashboard/pages/billing.html");
            emailService.send({
                userId: userId,
                to: userEmail,
                subject: "Action required: Crevio payment did not go through",
                text:
                    "Hi," + "\n\n" +
                    "We could not process your Crevio " + planName + " payment of " + cur + " " + amt + "." + "\n\n" +
                    "Update your payment method to keep your subscription active:" + "\n\n" +
                    "    " + updateLink + "\n\n" +
                    "The Crevio Team",
                category: "plan_payment_failed"
            }).catch(function () {});
        }
    } catch (e) { console.error("[planNotification] onPaymentFailed failed:", e.message); }
}
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
        ,
            ctaUrl: require("./planNotificationTemplates").build("plan_renewed", { planName: cfg.name, renewalDate: nextRenewalDate }).ctaUrl,
            ctaText: "Manage Subscription"
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
        ,
            ctaUrl: require("./planNotificationTemplates").build("subscription_cancelled", { planName: cfg.name, renewalDate: accessEnds }).ctaUrl,
            ctaText: "Reactivate " + cfg.name,
            ctaUrl2: require("./planNotificationTemplates").build("subscription_cancelled", { planName: cfg.name }).ctaUrl2,
            ctaText2: "View Plans"
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
        ,
            ctaUrl: require("./planNotificationTemplates").build("refund_completed", {}).ctaUrl,
            ctaText: "Manage Subscription"
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
        ,
            ctaUrl: require("./planNotificationTemplates").build("trial_started", { planName: cfg.name }).ctaUrl,
            ctaText: "Start Exploring",
            ctaUrl2: require("./planNotificationTemplates").build("trial_started", { planName: cfg.name }).ctaUrl2,
            ctaText2: "View Plans"
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
        ,
            ctaUrl: opts.upgradeUrl || null,
            ctaText: "Continue with " + cfg.name,
            ctaUrl2: opts.plansUrl || null,
            ctaText2: "View Plans"
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

async function onSubscriptionExpiring(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "pro").toLowerCase();
    const renewalDate = opts.renewalDate || null;
    try {
        const cfg = PLANS.get(planId);
        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build("subscription_expiring", { planName: cfg.name, renewalDate: renewalDate });
        notificationService.create({
            userId: userId, type: notifContent.type, title: notifContent.title, message: notifContent.message,
            ctaUrl: notifContent.ctaUrl, ctaText: notifContent.ctaText,
            ctaUrl2: notifContent.ctaUrl2, ctaText2: notifContent.ctaText2
        });
    } catch (e) { console.error("[planNotification] onSubscriptionExpiring failed:", e.message); }
}

async function onSubscriptionExpired(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "pro").toLowerCase();
    const graceUntil = opts.graceUntil || null;
    const renewalDate = opts.renewalDate || null;
    try {
        const cfg = PLANS.get(planId);
        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build("subscription_expired", { planName: cfg.name, graceUntil: graceUntil, renewalDate: renewalDate });
        notificationService.create({
            userId: userId, type: notifContent.type, title: notifContent.title, message: notifContent.message,
            ctaUrl: notifContent.ctaUrl, ctaText: notifContent.ctaText,
            ctaUrl2: notifContent.ctaUrl2, ctaText2: notifContent.ctaText2
        });
    } catch (e) { console.error("[planNotification] onSubscriptionExpired failed:", e.message); }
}

async function onSubscriptionDowngraded(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "pro").toLowerCase();
    try {
        const cfg = PLANS.get(planId);
        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build("subscription_downgraded", { planName: cfg.name });
        notificationService.create({
            userId: userId, type: notifContent.type, title: notifContent.title, message: notifContent.message,
            ctaUrl: notifContent.ctaUrl, ctaText: notifContent.ctaText,
            ctaUrl2: notifContent.ctaUrl2, ctaText2: notifContent.ctaText2
        });
    } catch (e) { console.error("[planNotification] onSubscriptionDowngraded failed:", e.message); }
}

async function onSubscriptionDataRemovalWarning(opts) {
    opts = opts || {};
    const userId = opts.userId, userEmail = opts.userEmail;
    const planId = String(opts.planId || "pro").toLowerCase();
    const daysUntilRemoval = opts.daysUntilRemoval || 7;
    try {
        const cfg = PLANS.get(planId);
        const notifyTpl = require("./planNotificationTemplates");
        const notifContent = notifyTpl.build("subscription_data_removal_warning", { planName: cfg.name, daysUntilRemoval: daysUntilRemoval });
        notificationService.create({
            userId: userId, type: notifContent.type, title: notifContent.title, message: notifContent.message,
            ctaUrl: notifContent.ctaUrl, ctaText: notifContent.ctaText,
            ctaUrl2: notifContent.ctaUrl2, ctaText2: notifContent.ctaText2
        });
    } catch (e) { console.error("[planNotification] onSubscriptionDataRemovalWarning failed:", e.message); }
}

module.exports = {
    onSignup,
    onPlanChanged,
    onSubscriptionRenewed,
    onSubscriptionCancelled,
    onRefundProcessed,
    onTrialStarted,
    onTrialEndingSoon,
    onSubscriptionExpiring,
    onSubscriptionExpired,
    onSubscriptionDowngraded,
    onSubscriptionDataRemovalWarning,
    onPaymentSucceeded,
    onPaymentFailed,
    onSubscriptionExpiringSoon
};
