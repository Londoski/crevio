// =========================================================
// CREVIO — PLAN NOTIFICATION SERVICE
// File: backend/services/planNotificationService.js
// Fires notification + queued email on plan lifecycle
// events. Called by authController.register, webhooks, or
// any future upgrade flow. Never invoked from the frontend.
// =========================================================
const PLANS = require("../../config/plans");
const notificationService = require("./notificationService");
const emailService = require("./emailService");

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
async function onPlanChanged({ userId, userEmail, fromPlan, toPlan }) {
    try {
        const from = PLANS.get(fromPlan);
        const to = PLANS.get(toPlan);
        const next = to.upgradeTo ? PLANS.get(to.upgradeTo) : null;

        const isUpgrade = planRank(toPlan) > planRank(fromPlan);
        const isDowngrade = planRank(toPlan) < planRank(fromPlan);

        let title, message;

        if (isUpgrade) {
            title = "Welcome to " + to.name;
            message =
                "**You're now on Crevio " + to.name + "**\n\n" +
                "Here's what you have:\n\n" +
                planFeaturesText(toPlan) + "\n\n";
            if (next) {
                message +=
                    "### Ready for even more?\n\n" +
                    "Upgrade to **" + next.name + "** (" + next.priceLabel + ") for:\n\n" +
                    planFeaturesText(next.id);
            }
        } else if (isDowngrade) {
            title = "You're on " + to.name;
            message =
                "**Your plan is now " + to.name + ".**\n\n" +
                "Here's what you have:\n\n" +
                planFeaturesText(toPlan) + "\n\n" +
                (to.upgradeTo
                    ? ("You can upgrade again anytime to " + PLANS.get(to.upgradeTo).name + " from the Billing page.")
                    : "");
        } else {
            title = "Your plan changed";
            message = "Your subscription is now on **" + to.name + "**.";
        }

        notificationService.create({
            userId: userId,
            type: "system",
            title: title,
            message: message,
            entityType: null,
            entityId: null
        });

        if (userEmail) {
            const subject = isUpgrade
                ? ("Welcome to Crevio " + to.name)
                : (isDowngrade ? ("Your Crevio plan is now " + to.name) : "Your Crevio plan changed");

            const text =
                "Hi,\n\n" +
                (isUpgrade
                    ? ("You've upgraded from " + from.name + " to " + to.name + ".\n\n")
                    : (isDowngrade
                        ? ("Your plan has changed from " + from.name + " to " + to.name + ".\n\n")
                        : ("Your Crevio plan is now " + to.name + ".\n\n"))) +
                "What you have now:\n\n" +
                planFeaturesText(toPlan) + "\n\n" +
                (next ? ("Upgrade to " + next.name + " anytime: " + appUrl() + "/dashboard/pages/billing.html\n\n") : "") +
                "The Crevio Team";

            emailService.send({
                userId: userId,
                to: userEmail,
                subject: subject,
                text: text,
                category: isUpgrade ? "plan_upgraded" : (isDowngrade ? "plan_downgraded" : "plan_changed")
            }).catch(function () {});
        }
    } catch (e) { console.error("[planNotification] onPlanChanged failed:", e.message); }
}

// =========================================================
// onPaymentSucceeded
// =========================================================
async function onPaymentSucceeded({ userId, userEmail, amount, currency, invoiceUrl, planName }) {
    try {
        const amt = ((amount || 0) / 100).toFixed(2);
        const cur = (currency || "USD").toUpperCase();

        notificationService.create({
            userId: userId,
            type: "payment",
            title: "Payment received",
            message: "**Payment received** for " + (planName ? "Crevio " + planName : "your Crevio subscription") + ".\n\n" +
                     "**Amount:** " + cur + " " + amt + "\n\n" +
                     (invoiceUrl ? ("You can view the invoice here: " + invoiceUrl) : "")
        });

        if (userEmail) {
            emailService.send({
                userId: userId,
                to: userEmail,
                subject: "Payment confirmation — Crevio",
                text:
                    "Hi,\n\n" +
                    "We received your payment of " + cur + " " + amt + " for " + (planName ? "Crevio " + planName : "your Crevio subscription") + ".\n\n" +
                    (invoiceUrl ? ("View your invoice: " + invoiceUrl + "\n\n") : "") +
                    "Thank you for being a Crevio customer.\n\n" +
                    "The Crevio Team",
                category: "plan_payment_succeeded"
            }).catch(function () {});
        }
    } catch (e) { console.error("[planNotification] onPaymentSucceeded failed:", e.message); }
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

module.exports = {
    onSignup,
    onPlanChanged,
    onPaymentSucceeded,
    onPaymentFailed,
    onSubscriptionExpiringSoon
};
