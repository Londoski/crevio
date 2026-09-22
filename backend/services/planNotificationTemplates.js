// =========================================================
// CREVIO — PLAN NOTIFICATION TEMPLATES
// File: backend/services/planNotificationTemplates.js
// =========================================================
// One builder for every plan-related in-app notification.
// Rich, plan-aware, CTA-enabled.
// =========================================================

function formatAmount(amountCents, currency) {
    const cur = (currency || "USD").toUpperCase();
    const amt = ((amountCents || 0) / 100).toFixed(2);
    return cur + " " + amt;
}

function appUrl() {
    const u = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000";
    return String(u).replace(/\/+$/, "");
}

function planWord(n) {
    return n + (n === 1 ? "" : "s");
}

function withCtas(base, primary, secondary) {
    return Object.assign({}, base, {
        ctaUrl: primary ? primary.url : null,
        ctaText: primary ? primary.text : null,
        ctaUrl2: secondary ? secondary.url : null,
        ctaText2: secondary ? secondary.text : null
    });
}

function build(eventType, data) {
    data = data || {};
    const planName = data.planName || "Crevio";
    const amountText = formatAmount(data.amount, data.currency);
    const previousPlanName = data.previousPlanName || null;
    const nextPlanName = data.nextPlanName || null;
    const renewalDate = data.renewalDate || null;
    const daysLeft = data.daysLeft || null;

    const manageUrl    = data.manageUrl    || (appUrl() + "/dashboard/pages/billing.html");
    const plansUrl     = data.plansUrl     || (appUrl() + "/dashboard/pages/billing.html#plans");
    const dashboardUrl = data.dashboardUrl || (appUrl() + "/dashboard/");
    const supportUrl   = "mailto:security@crevio.indevs.in";

    switch (eventType) {

        case "payment_successful":
            return withCtas({
                type: "payment",
                title: "Payment successful \uD83C\uDF89",
                message:
                    "Your payment of **" + amountText + "** has been successfully processed.\n\n" +
                    "Your **Crevio " + planName + "** subscription is now active. All " + planName + " features are unlocked and ready to use.\n\n" +
                    "**Plan:** " + planName + "\n" +
                    "**Amount:** " + amountText + "\n" +
                    "**Status:** Paid\n\n" +
                    "Thanks for choosing Crevio " + planName + ". You can manage your subscription anytime from your Billing page."
            },
                { text: "Manage Subscription", url: manageUrl }
            );

        case "plan_activated":
            return withCtas({
                type: "system",
                title: "Welcome to Crevio " + planName,
                message:
                    "Your **Crevio " + planName + "** plan is now active.\n\n" +
                    "You've unlocked the full " + planName + " experience \u2014 every feature included in your plan is ready to use right now.\n\n" +
                    "Jump into your dashboard and start using your new tools."
            },
                { text: "Go to Dashboard", url: dashboardUrl }
            );

        case "plan_upgraded":
            return withCtas({
                type: "system",
                title: "Upgraded to " + planName,
                message:
                    (previousPlanName
                        ? "You've successfully upgraded from **Crevio " + previousPlanName + "** to **Crevio " + planName + "**."
                        : "You're now on **Crevio " + planName + "**.") + "\n\n" +
                    "Your new " + planName + " features are active immediately. Higher limits, advanced tools, and everything in between are ready.\n\n" +
                    (nextPlanName
                        ? "Ready for even more? You can upgrade to **" + nextPlanName + "** anytime."
                        : "")
            },
                { text: "Explore " + planName + " Features", url: dashboardUrl },
                nextPlanName ? { text: "View Plans", url: plansUrl } : null
            );

        case "plan_renewed":
            return withCtas({
                type: "system",
                title: "Subscription renewed",
                message:
                    "Your **Crevio " + planName + "** subscription has been renewed successfully.\n\n" +
                    "Everything continues as-is \u2014 same plan, same features, no interruptions." +
                    (renewalDate ? "\n\n**Next renewal:** " + renewalDate : "") + "\n\n" +
                    "Thanks for sticking with Crevio."
            },
                { text: "Manage Subscription", url: manageUrl }
            );

        case "payment_failed": {
            const state = data.billingState || "retry_pending";
            let stateLine;
            let primary;
            let secondary = null;

            if (state === "retry_pending") {
                stateLine = "We'll automatically retry your payment soon. You don't need to do anything right now.";
                primary = { text: "Update Payment Method", url: manageUrl };
            } else if (state === "grace_period") {
                stateLine = "Your " + planName + " access remains active" +
                    (data.graceUntil ? " until **" + data.graceUntil + "**" : "") +
                    ". Update your payment method to avoid interruption.";
                primary = { text: "Fix Payment", url: manageUrl };
                secondary = { text: "Contact Support", url: supportUrl };
            } else if (state === "paused") {
                stateLine = "Your " + planName + " subscription has been paused because we couldn't process your payment. Update your payment method to restore access immediately.";
                primary = { text: "Reactivate " + planName, url: manageUrl };
                secondary = { text: "Contact Support", url: supportUrl };
            } else if (state === "cancelled") {
                stateLine = "Your " + planName + " subscription has ended. You can resubscribe anytime from your Billing page.";
                primary = { text: "Resubscribe", url: manageUrl };
            } else {
                stateLine = "Please update your payment method to keep your " + planName + " subscription active.";
                primary = { text: "Update Payment Method", url: manageUrl };
            }

            return withCtas({
                type: "alert",
                title: "Payment unsuccessful",
                message:
                    "**Action required:** Your " + amountText + " Crevio " + planName + " payment could not be completed.\n\n" +
                    stateLine + "\n\n" +
                    "**Plan:** " + planName + "\n" +
                    "**Amount:** " + amountText + "\n" +
                    "**Status:** Failed"
            }, primary, secondary);
        }

        case "subscription_cancelled":
            return withCtas({
                type: "system",
                title: "Subscription cancelled",
                message:
                    "Your **Crevio " + planName + "** subscription has been cancelled.\n\n" +
                    (renewalDate
                        ? "You'll keep full " + planName + " access until **" + renewalDate + "**. After that, your account will automatically move to the Free plan."
                        : "Your account will automatically move to the Free plan.") + "\n\n" +
                    "Changed your mind? You can reactivate anytime \u2014 your " + planName + " settings will be waiting."
            },
                { text: "Reactivate " + planName, url: manageUrl },
                { text: "View Plans", url: plansUrl }
            );

        case "refund_completed":
            return withCtas({
                type: "system",
                title: "Refund processed",
                message:
                    "Your refund of **" + amountText + "** has been processed successfully.\n\n" +
                    "The amount will appear back on your original payment method within **5-10 business days**, depending on your bank.\n\n" +
                    "If you don't see it after 10 business days, contact your bank or reach out to our support team."
            },
                { text: "View Billing History", url: manageUrl }
            );

        case "trial_started":
            return withCtas({
                type: "system",
                title: "Your " + planName + " trial has started",
                message:
                    "Your **Crevio " + planName + "** trial is now active.\n\n" +
                    "You have full access to every " + planName + " feature during your trial \u2014 no payment required yet.\n\n" +
                    (renewalDate ? "**Trial ends:** " + renewalDate + "\n\n" : "") +
                    "We'll remind you before it ends so you can decide."
            },
                { text: "Start Exploring", url: dashboardUrl },
                { text: "View Plans", url: plansUrl }
            );

        case "trial_ending_soon": {
            const dayWord = (daysLeft === 1) ? "Day" : "Days";
            const body =
                "Your **Crevio " + planName + " trial** is approaching its end date.\n\n" +
                "You currently have access to " + planName + " features and capabilities. When your trial ends, your account will no longer have access to " + planName + "-only features unless you continue with a " + planName + " plan.\n\n" +
                (renewalDate ? ("**Trial end date:** " + renewalDate + "\n\n") : "") +
                "Review your plan before the trial ends to keep your current " + planName + " experience uninterrupted.";
            return withCtas({
                type: "system",
                title: "Your " + planName + " Trial Ends in " + daysLeft + " " + dayWord,
                message: body
            },
                { text: "Review Plan", url: plansUrl }
            );
        }

        case "free_plan_reminder": {
            const body =
                "Your Crevio account is currently using the **Free plan**, giving you access to the essential tools you need to build and maintain your professional presence.\n\n" +
                "Your workspace and published content will remain available under the Free plan, with access limited to the features included in your current plan.\n\n" +
                "**Current plan:** Free\n\n" +
                "You can explore available plans at any time if you need additional features, greater control, or expanded professional capabilities.";
            return withCtas({
                type: "system",
                title: "You\u2019re Currently on the Free Plan",
                message: body
            },
                { text: "View Plans", url: plansUrl }
            );
        }

        case "plan_active": {
            const body =
                "Your Crevio account is currently on the **" + planName + " plan**, giving you access to advanced tools and features designed for professionals who want greater control over their portfolio and workspace.\n\n" +
                "Your " + planName + " features are currently active and available throughout your subscription period.\n\n" +
                "**Current plan:** " + planName + "\n\n" +
                "Manage your subscription or explore available plan options whenever you\u2019re ready.";
            return withCtas({
                type: "system",
                title: "Your " + planName + " Plan Is Active",
                message: body
            },
                { text: "Manage Plan", url: manageUrl }
            );
        }

case "subscription_expiring":
            return withCtas({
                type: "alert",
                title: "Your " + planName + " Plan Ends in 3 Days",
                message:
                    "Your **Crevio " + planName + "** subscription ends in 3 days.\n\n" +
                    "To keep your " + planName + " features and workspace active without interruption, please ensure your payment method is up to date." +
                    (renewalDate ? ("\n\n**Ends on:** " + renewalDate) : "")
            },
                { text: "Manage Subscription", url: manageUrl }
            );

case "subscription_expired": {
            const graceUntil = data.graceUntil || null;
            return withCtas({
                type: "alert",
                title: "Your " + planName + " Plan Has Expired",
                message:
                    "Your **Crevio " + planName + "** subscription expired" +
                    (renewalDate ? (" on " + renewalDate) : "") + ".\n\n" +
                    "We have given you a **3-day grace period**. Your " + planName + " features remain active" +
                    (graceUntil ? (" until **" + graceUntil + "**") : "") + ".\n\n" +
                    "Update your payment method before the grace period ends to avoid being moved to the Free plan."
            },
                { text: "Update Payment", url: manageUrl },
                { text: "Contact Support", url: "mailto:security@crevio.indevs.in" }
            );
        }

case "subscription_downgraded":
            return withCtas({
                type: "alert",
                title: "You Have Been Moved to the Free Plan",
                message:
                    "Your **Crevio " + planName + "** subscription expired and the 3-day grace period has ended.\n\n" +
                    "Your account has been moved to the **Free plan**. You now have access to Free features only.\n\n" +
                    "Your data has been preserved for 30 days. Upgrade to " + planName + " or Pro anytime to restore full access."
            },
                { text: "Upgrade Plan", url: plansUrl },
                { text: "Contact Support", url: "mailto:security@crevio.indevs.in" }
            );

        case "subscription_data_removal_warning": {
            const daysUntilRemoval = data.daysUntilRemoval || 7;
            return withCtas({
                type: "alert",
                title: "Your Data Will Be Removed in " + daysUntilRemoval + " Days",
                message:
                    "It has been 30 days since your **Crevio " + planName + "** account was moved to the Free plan.\n\n" +
                    "Unless you upgrade within **" + daysUntilRemoval + " days**, your " + planName + "-tier data (extra projects, custom domain, and other plan-specific content) will be permanently removed.\n\n" +
                    "Upgrade now to keep everything."
            },
                { text: "Upgrade Now", url: plansUrl },
                { text: "Contact Support", url: "mailto:security@crevio.indevs.in" }
            );
        }

                default:
            return withCtas({
                type: "system",
                title: "Crevio update",
                message: data.fallbackMessage || "You have a new notification."
            }, null, null);
    }
}

module.exports = { build: build, formatAmount: formatAmount };