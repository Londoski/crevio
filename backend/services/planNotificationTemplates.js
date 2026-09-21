// =========================================================
// CREVIO — PLAN NOTIFICATION TEMPLATES
// File: backend/services/planNotificationTemplates.js
// =========================================================
// One builder for every plan-related in-app notification.
// No hardcoded plan, amount, or date — everything comes
// from the caller's data object.
//
// Usage:
//   const c = require('./planNotificationTemplates').build('payment_successful', {
//       planName: 'Pro', amount: 1900, currency: 'USD'
//   });
//   notificationService.create({ userId, type: c.type, title: c.title, message: c.message });
//
// Supported event types:
//   payment_successful     plan_activated       plan_upgraded
//   plan_renewed           payment_failed       subscription_cancelled
//   refund_completed       trial_started        trial_ending_soon
// =========================================================

function formatAmount(amountCents, currency) {
    const cur = (currency || "USD").toUpperCase();
    const amt = ((amountCents || 0) / 100).toFixed(2);
    return cur + " " + amt;
}

function build(eventType, data) {
    data = data || {};
    const planName = data.planName || "Crevio";
    const amountText = formatAmount(data.amount, data.currency);
    const previousPlanName = data.previousPlanName || null;
    const renewalDate = data.renewalDate || null;
    const daysLeft = data.daysLeft || null;

    switch (eventType) {

        case "payment_successful":
            return {
                type: "payment",
                title: "Payment successful \uD83C\uDF89",
                message:
                    "Your payment of **" + amountText + "** has been successfully processed.\n\n" +
                    "Your **Crevio " + planName + "** subscription is now active and your account has been upgraded.\n\n" +
                    "**Plan:** " + planName + "\n" +
                    "**Amount:** " + amountText + "\n" +
                    "**Status:** Paid\n\n" +
                    "Your " + planName + " features are ready to use.\n\n" +
                    "Welcome to Crevio " + planName + "."
            };

        case "plan_activated":
            return {
                type: "system",
                title: "Welcome to Crevio " + planName,
                message:
                    "Your **Crevio " + planName + "** plan is now active.\n\n" +
                    "Your features are ready to use.\n\n" +
                    "Welcome to Crevio."
            };

        case "plan_upgraded":
            return {
                type: "system",
                title: "Upgraded to " + planName,
                message:
                    (previousPlanName
                        ? ("You\u2019ve upgraded from **Crevio " + previousPlanName + "** to **Crevio " + planName + "**.\n\n")
                        : ("You\u2019re now on **Crevio " + planName + "**.\n\n")) +
                    "Your new features are ready to use."
            };

        case "plan_renewed":
            return {
                type: "system",
                title: "Subscription renewed",
                message:
                    "Your **Crevio " + planName + "** subscription has been renewed." +
                    (renewalDate ? ("\n\n**Next renewal:** " + renewalDate) : "")
            };

        case "payment_failed": {
            const state = data.billingState || "retry_pending";
            let stateLine;
            if (state === "retry_pending") {
                stateLine = "We\u2019ll automatically retry your payment. You don\u2019t need to do anything right now.";
            } else if (state === "grace_period") {
                stateLine = "Your " + planName + " access remains active" +
                    (data.graceUntil ? (" until **" + data.graceUntil + "**") : "") +
                    ". Update your payment method to avoid interruption.";
            } else if (state === "paused") {
                stateLine = "Your " + planName + " subscription has been paused because we couldn\u2019t process your payment. Update your payment method to restore access.";
            } else if (state === "cancelled") {
                stateLine = "Your " + planName + " subscription has ended. You can resubscribe anytime from your Billing page.";
            } else {
                stateLine = "Please update your payment method to keep your " + planName + " subscription active.";
            }
            return {
                type: "alert",
                title: "Payment unsuccessful",
                message:
                    "**Action required:** Your " + amountText + " Crevio " + planName + " payment could not be completed.\n\n" +
                    stateLine + "\n\n" +
                    "**Plan:** " + planName + "\n" +
                    "**Amount:** " + amountText + "\n" +
                    "**Status:** Failed",
                ctaUrl: data.billingUrl || null,
                ctaText: "Fix Payment"
            };
        }

        case "subscription_cancelled":
            return {
                type: "system",
                title: "Subscription cancelled",
                message:
                    "Your **Crevio " + planName + "** subscription has been cancelled." +
                    (renewalDate ? ("\n\nYour access continues until **" + renewalDate + "**.") : "")
            };

        case "refund_completed":
            return {
                type: "system",
                title: "Refund processed",
                message:
                    "Your refund of **" + amountText + "** has been processed.\n\n" +
                    "You\u2019ll see it on your statement within 5-10 business days."
            };

        case "trial_started":
            return {
                type: "system",
                title: "Your trial has started",
                message:
                    "Your **Crevio " + planName + "** trial has started." +
                    (renewalDate ? ("\n\n**Trial ends:** " + renewalDate) : "")
            };

        case "trial_ending_soon":
            return {
                type: "system",
                title: "Trial ending soon",
                message:
                    "Your **Crevio " + planName + "** trial ends" +
                    (daysLeft ? (" in **" + daysLeft + " day(s)**") : " soon") + "." +
                    (renewalDate ? ("\n\n**Ends:** " + renewalDate) : "")
            };

        default:
            return {
                type: "system",
                title: "Crevio update",
                message: data.fallbackMessage || "You have a new notification."
            };
    }
}

module.exports = { build: build, formatAmount: formatAmount };
