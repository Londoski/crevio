// =========================================================
// CREVIO — BILLING CONTROLLER
// File: backend/controllers/billingController.js
// =========================================================

const db = require("../../database/db");

function safeCount(sql, ...params) {
    try { return db.prepare(sql).get(...params)?.c || 0; }
    catch (e) { return 0; }
}

// GET /api/billing/plan
exports.getPlan = (req, res) => {
    try {
        let plan = null;
        try {
            plan = db.prepare(
                "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
            ).get(req.user.id);
        } catch (e) { /* ignore */ }

        if (!plan) {
            return res.json({
                success: true,
                plan: {
                    name: "Free Plan",
                    description: "Basic features to get you started",
                    price: 0,
                    interval: "mo",
                    status: "Active"
                }
            });
        }

        res.json({
            success: true,
            plan: {
                name:        plan.plan_name || plan.name || (plan.plan ? (plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1) + " Plan") : "Free Plan"),
                description: plan.description || "Your current plan",
                price:       plan.price || 0,
                interval:    plan.interval || "mo",
                status:      plan.status || "active"
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/billing/usage
exports.getUsage = (req, res) => {
    try {
        const userId = req.user.id;
        res.json({
            success: true,
            usage: {
                projects_used: safeCount("SELECT COUNT(*) AS c FROM projects WHERE user_id = ?", userId),
                projects_limit: 10,
                media_used:    safeCount("SELECT COUNT(*) AS c FROM project_media WHERE user_id = ?", userId),
                media_limit:   50,
                services_used: safeCount("SELECT COUNT(*) AS c FROM services WHERE user_id = ?", userId),
                services_limit: 5,
                messages_used: safeCount("SELECT COUNT(*) AS c FROM creator_skills WHERE user_id = ?", userId),
                messages_limit: 100
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/billing/payments
exports.getPayments = (req, res) => {
    try {
        let payments = [];
        try {
            payments = db.prepare(
                "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
            ).all(req.user.id);
        } catch (e) {
            try {
                payments = db.prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 50").all();
            } catch (e2) {
                payments = [];
            }
        }
        res.json({ success: true, payments });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/billing/payments/:id/invoice
exports.getInvoice = (req, res) => {
    try {
        const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
        if (!payment) return res.status(404).send("Not found");

        const text = `
CREVIO — INVOICE

Invoice #: ${payment.id}
Date: ${payment.created_at || "N/A"}
Amount: $${(((payment.amount || 0) / 100).toFixed(2))}
Status: ${payment.status || "unknown"}
Description: ${payment.description || "Subscription"}

Thank you for your business.
        `.trim();

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="invoice-${payment.id}.txt"`);
        res.send(text);
    } catch (err) {
        res.status(500).send("Failed: " + err.message);
    }
};

// =========================================================
// Entitlements — appended by P2 Phase 2
// =========================================================
exports.getEntitlements = (req, res) => {
    try {
        const ent = require("../services/entitlementService");
        const snapshot = ent.getEntitlements(req.user.id);
        const allPlans = ent.getAllPlansPublic();
        return res.json({ success: true, entitlements: snapshot, plans: allPlans });
    } catch (e) {
        console.error("[billing] getEntitlements failed:", e.message);
        return res.status(500).json({ success: false, message: "Could not load entitlements" });
    }
};
// =========================================================
// DEV-ONLY endpoints — replace with real Stripe when ready
// Gated by DEV_MODE=true in .env, or non-production NODE_ENV
// =========================================================
function devAllowed() {
    if (process.env.DEV_MODE === 'true') return true;
    if ((process.env.NODE_ENV || 'development') !== 'production') return true;
    return false;
}

function devGuard(req, res) {
    if (!devAllowed()) {
        res.status(404).json({ success: false, message: 'Not found' });
        return false;
    }
    return true;
}

exports.devChangePlan = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id);
        const toPlan = String(req.body.plan || '').toLowerCase();
        if (!userId || !['free','pro','business'].includes(toPlan)) {
            return res.status(400).json({ success: false, message: 'user_id and plan (free|pro|business) required' });
        }

        const sub = db.prepare('SELECT id, plan FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
        const fromPlan = sub ? sub.plan : 'free';
        if (fromPlan === toPlan) {
            return res.json({ success: true, message: 'already on ' + toPlan, changed: false });
        }

        if (sub) {
            db.prepare('UPDATE subscriptions SET plan = ?, previous_plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(toPlan, fromPlan, sub.id);
        } else {
            db.prepare('INSERT INTO subscriptions (user_id, plan, status) VALUES (?, ?, \'active\')').run(userId, toPlan);
        }
        try { db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(toPlan, userId); } catch (e) {}

        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        const planNotificationService = require('../services/planNotificationService');
        await planNotificationService.onPlanChanged({
            userId: userId,
            userEmail: userRow ? userRow.email : null,
            fromPlan: fromPlan,
            toPlan: toPlan
        });

        res.json({ success: true, changed: true, from: fromPlan, to: toPlan });
    } catch (e) {
        console.error('[devChangePlan]', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.devPaymentSucceeded = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id);
        const amount = Number(req.body.amount || 1900);
        const currency = String(req.body.currency || 'USD');
        const planName = String(req.body.plan_name || 'Pro');
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });

        const planNotificationService = require('../services/planNotificationService');
        await planNotificationService.onPaymentSucceeded({
            userId: userId,
            userEmail: userRow.email,
            amount: amount,
            currency: currency,
            invoiceUrl: null,
            planName: planName
        });

        res.json({ success: true });
    } catch (e) {
        console.error('[devPaymentSucceeded]', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.devPaymentFailed = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id);
        const amount = Number(req.body.amount || 1900);
        const currency = String(req.body.currency || 'USD');
        const planName = String(req.body.plan_name || 'Pro');
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });

        const planNotificationService = require('../services/planNotificationService');
        await planNotificationService.onPaymentFailed({
            userId: userId,
            userEmail: userRow.email,
            amount: amount,
            currency: currency,
            updateUrl: null,
            planName: planName
        });

        res.json({ success: true });
    } catch (e) {
        console.error('[devPaymentFailed]', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.devRunExpiryCheck = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const cron = require('../services/subscriptionCronService');
        const result = await cron.runExpiryCheck();
        res.json({ success: true, result: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
// =========================================================
// DEV-ONLY: test remaining billing lifecycle emails
// =========================================================
exports.devSubscriptionRenewed = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id || 1);
        const planId = String(req.body.plan || 'pro').toLowerCase();
        const amount = Number(req.body.amount || 1900);
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });
        const pns = require('../services/planNotificationService');
        await pns.onSubscriptionRenewed({
            userId: userId, userEmail: userRow.email,
            planId: planId, amount: amount, currency: 'USD',
            nextRenewalDate: req.body.next_renewal || null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.devSubscriptionCancelled = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id || 1);
        const planId = String(req.body.plan || 'pro').toLowerCase();
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });
        const pns = require('../services/planNotificationService');
        await pns.onSubscriptionCancelled({
            userId: userId, userEmail: userRow.email,
            planId: planId,
            accessEnds: req.body.access_ends || null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.devRefundProcessed = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id || 1);
        const amount = Number(req.body.amount || 1900);
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });
        const pns = require('../services/planNotificationService');
        await pns.onRefundProcessed({
            userId: userId, userEmail: userRow.email,
            amount: amount, currency: 'USD',
            planName: req.body.plan_name || 'Pro',
            transactionId: req.body.transaction_id || null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.devTrialStarted = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id || 1);
        const planId = String(req.body.plan || 'business').toLowerCase();
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });
        const pns = require('../services/planNotificationService');
        await pns.onTrialStarted({
            userId: userId, userEmail: userRow.email,
            planId: planId,
            trialEnds: req.body.trial_ends || null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.devTrialEndingSoon = async (req, res) => {
    if (!devGuard(req, res)) return;
    try {
        const userId = Number(req.body.user_id || 1);
        const planId = String(req.body.plan || 'business').toLowerCase();
        const daysLeft = Number(req.body.days_left || 3);
        const userRow = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
        if (!userRow) return res.status(404).json({ success: false, message: 'user not found' });
        const pns = require('../services/planNotificationService');
        await pns.onTrialEndingSoon({
            userId: userId, userEmail: userRow.email,
            planId: planId, daysLeft: daysLeft,
            trialEnds: req.body.trial_ends || null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// =========================================================
// PAYSTACK INTEGRATION — checkout + portal + webhook
// =========================================================
const paystackConfig = require("../../config/paystack");
const paystackService = require("../services/paystackService");

// POST /api/billing/checkout
// Body: { plan: "pro" | "business", cycle: "monthly" | "annual" }
// Returns: { success, authorizationUrl, reference }
exports.checkout = async (req, res) => {
    try {
        const planId = String((req.body && req.body.plan) || "").toLowerCase();
        const cycle = String((req.body && req.body.cycle) || "monthly").toLowerCase();

        if (planId !== "pro" && planId !== "business") {
            return res.status(400).json({ success: false, message: "Invalid plan (must be 'pro' or 'business')" });
        }
        if (cycle !== "monthly" && cycle !== "annual") {
            return res.status(400).json({ success: false, message: "Invalid cycle (must be 'monthly' or 'annual')" });
        }

        if (!paystackConfig.isConfigured()) {
            return res.status(500).json({ success: false, message: "Paystack not configured. Check .env." });
        }

        const user = db.prepare("SELECT id, email, display_name FROM users WHERE id = ?").get(req.user.id);
        if (!user || !user.email) {
            return res.status(400).json({ success: false, message: "User has no email" });
        }

        const planCode = paystackConfig.getPlanCode(planId, cycle);
        if (!planCode) {
            return res.status(500).json({ success: false, message: "Plan code missing for " + planId + "/" + cycle });
        }

        const appUrl = (process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
        const callbackUrl = appUrl + "/dashboard/pages/billing.html?paystack=callback";

        const init = await paystackService.initializeTransaction({
            email: user.email,
            planCode: planCode,
            callbackUrl: callbackUrl,
            metadata: {
                user_id: user.id,
                plan_id: planId,
                cycle: cycle,
                plan_name: paystackConfig.PLANS[planId].displayName
            }
        });

        if (!init.success) {
            console.error("[billing:checkout] Paystack init failed:", init.reason);
            return res.status(500).json({ success: false, message: "Could not create checkout: " + init.reason });
        }

        res.json({
            success: true,
            authorizationUrl: init.authorizationUrl,
            accessCode: init.accessCode,
            reference: init.reference
        });
    } catch (e) {
        console.error("[billing:checkout] crashed:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

// GET /api/billing/verify/:reference
// Called by the frontend after Paystack redirects back.
// Confirms the payment succeeded and returns the updated plan.
exports.verifyCheckout = async (req, res) => {
    try {
        const reference = String(req.params.reference || "").trim();
        if (!reference) return res.status(400).json({ success: false, message: "reference required" });

        const v = await paystackService.verifyTransaction(reference);
        if (!v.success) return res.status(400).json({ success: false, message: v.reason });

        const tx = v.transaction;
        const txStatus = tx.status; // "success" | "failed" | "abandoned"
        const userId = (tx.metadata && Number(tx.metadata.user_id)) || null;

        if (txStatus !== "success") {
            return res.json({ success: false, status: txStatus, message: "Payment not successful" });
        }
        if (userId && userId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Reference does not belong to you" });
        }

        const planId = (tx.metadata && tx.metadata.plan_id) || null;
        const cycle = (tx.metadata && tx.metadata.cycle) || "monthly";
        const fresh = db.prepare("SELECT plan FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(req.user.id);

        res.json({
            success: true,
            status: "success",
            plan: fresh ? fresh.plan : null,
            planId: planId,
            cycle: cycle,
            reference: reference
        });
    } catch (e) {
        console.error("[billing:verify] crashed:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /api/billing/portal
// Returns a Paystack manage-subscription link (email token generated by Paystack).
exports.portal = async (req, res) => {
    try {
        const sub = db.prepare(
            "SELECT paystack_subscription_code, paystack_email_token FROM subscriptions " +
            "WHERE user_id = ? AND provider = 'paystack' ORDER BY id DESC LIMIT 1"
        ).get(req.user.id);

        if (!sub || !sub.paystack_subscription_code || !sub.paystack_email_token) {
            return res.status(400).json({ success: false, message: "No active Paystack subscription" });
        }

        // Paystack exposes a hosted "manage subscription" page at:
        const manageUrl = "https://paystack.com/manage-subscription?subscription=" +
            encodeURIComponent(sub.paystack_subscription_code) +
            "&token=" + encodeURIComponent(sub.paystack_email_token);

        res.json({ success: true, manageUrl: manageUrl });
    } catch (e) {
        console.error("[billing:portal] crashed:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
};

// =========================================================
// Webhook endpoint — MUST be mounted with express.raw()
// =========================================================
exports.paystackWebhook = (req, res) => {
    try {
        const handler = require("../services/paystackWebhookHandler");
        handler.handle(req, res);
    } catch (e) {
        console.error("[billing:webhook] crashed:", e.message);
        res.status(500).send("webhook error");
    }
};