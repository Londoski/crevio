// =========================================================
// CREVIO — PAYSTACK WEBHOOK HANDLER
// File: backend/services/paystackWebhookHandler.js
// =========================================================
// Receives Paystack webhook events, verifies HMAC signature,
// then routes to the correct action:
//   charge.success              → activate plan + fire onPaymentSucceeded
//   subscription.create         → store Paystack sub codes
//   subscription.not_renew      → mark cancel_at_period_end
//   subscription.disable        → fire onSubscriptionCancelled
//   invoice.payment_failed      → fire onPaymentFailed (grace state)
//   invoice.update (paid)       → fire onSubscriptionRenewed
//
// IMPORTANT: webhook route must be mounted with express.raw()
// before express.json() — Paystack signs the RAW body.
// =========================================================
const crypto = require("crypto");
const db = require("../../database/db");
const config = require("../../config/paystack");
const paystackService = require("./paystackService");
const planNotificationService = require("./planNotificationService");
const planNotificationTemplates = require("./planNotificationTemplates");
const PLANS = require("../../config/plans");

function log(level, msg, extra) {
    const tag = "[paystack:webhook]";
    if (level === "error") console.error(tag, msg, extra || "");
    else console.log(tag, msg, extra || "");
}

// ---------- helpers ----------
function getUserById(userId) {
    try { return db.prepare("SELECT id, email, display_name FROM users WHERE id = ?").get(userId); }
    catch (e) { return null; }
}

// ---------- idempotency + payment recording ----------
function ensureWebhookEvents() {
    try {
        db.prepare(
            "CREATE TABLE IF NOT EXISTS webhook_events (" +
            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "  event_type TEXT NOT NULL," +
            "  event_key TEXT NOT NULL," +
            "  received_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
            "  processed_at DATETIME," +
            "  UNIQUE(event_type, event_key)" +
            ")"
        ).run();
    } catch (e) {}
}

function eventKey(event) {
    const d = event.data || {};
    return String(d.id || d.reference || d.subscription_code || d.invoice_code || (JSON.stringify(d).substring(0, 100)));
}

function claimEvent(eventType, key) {
    ensureWebhookEvents();
    try {
        const r = db.prepare("INSERT OR IGNORE INTO webhook_events (event_type, event_key) VALUES (?, ?)").run(eventType, key);
        return r.changes > 0;
    } catch (e) {
        log("error", "claimEvent failed: " + e.message);
        return true;
    }
}

function markProcessed(eventType, key) {
    try {
        db.prepare("UPDATE webhook_events SET processed_at = CURRENT_TIMESTAMP WHERE event_type = ? AND event_key = ?").run(eventType, key);
    } catch (e) {}
}

// Amounts in Paystack come as kobo (smallest unit). The payments schema
// stores naira (DECIMAL(10,2)), so we divide by 100 here.
function recordPayment(userId, opts) {
    opts = opts || {};
    try {
        const kobo = Number(opts.amountKobo) || 0;
        const naira = kobo / 100;
        const sub = getSubscriptionByUserId(userId);
        db.prepare(
            "INSERT INTO payments (user_id, subscription_id, provider, provider_transaction_id, amount, currency, status, payment_date) " +
            "VALUES (?, ?, 'paystack', ?, ?, ?, ?, CURRENT_TIMESTAMP)"
        ).run(
            userId,
            sub ? sub.id : null,
            opts.transactionId || null,
            naira,
            (opts.currency || "NGN").toUpperCase(),
            opts.status || "succeeded"
        );
        return true;
    } catch (e) {
        log("error", "recordPayment failed: " + e.message);
        return false;
    }
}

function getSubscriptionByUserId(userId) {
    try { return db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId); }
    catch (e) { return null; }
}

function upsertSubscriptionForPlan(userId, planId, cycle, providerRefs) {
    providerRefs = providerRefs || {};
    const interval = cycle === "annual" ? "annual" : "monthly";
    // Period end set by the caller from Paystack data
    const periodEnd = providerRefs.periodEnd || null;
    const subscriptionCode = providerRefs.subscriptionCode || null;
    const emailToken = providerRefs.emailToken || null;

    try {
        const existing = db.prepare("SELECT id, plan FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId);
        if (existing) {
            db.prepare(
                "UPDATE subscriptions SET plan = ?, status = 'active', " +
                "provider = 'paystack', provider_subscription_id = ?, " +
                "previous_plan = COALESCE(previous_plan, plan), " +
                "billing_interval = ?, current_period_end = ?, " +
                "paystack_subscription_code = ?, paystack_email_token = ?, " +
                "cancel_at_period_end = 0, canceled_at = NULL, " +
                "grace_ends_at = NULL, downgraded_at = NULL, " +
                "data_removal_warned_at = NULL, updated_at = CURRENT_TIMESTAMP " +
                "WHERE id = ?"
            ).run(planId, subscriptionCode, interval, periodEnd, subscriptionCode, emailToken, existing.id);
        } else {
            db.prepare(
                "INSERT INTO subscriptions " +
                "(user_id, plan, status, provider, provider_subscription_id, " +
                "billing_interval, current_period_end, " +
                "paystack_subscription_code, paystack_email_token) " +
                "VALUES (?, ?, 'active', 'paystack', ?, ?, ?, ?, ?)"
            ).run(userId, planId, subscriptionCode, interval, periodEnd, subscriptionCode, emailToken);
        }
        db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(planId, userId);
        return true;
    } catch (e) {
        log("error", "upsertSubscriptionForPlan failed: " + e.message);
        return false;
    }
}

// =========================================================
// Event handlers
// =========================================================

async function handleChargeSuccess(event) {
    const data = event.data || {};
    const userId = (data.metadata && Number(data.metadata.user_id)) || null;
    const planId = (data.metadata && data.metadata.plan_id) || null;
    const cycle = (data.metadata && data.metadata.cycle) || "monthly";

    if (!userId || !planId) {
        log("error", "charge.success missing metadata (user_id/plan_id)", data.metadata);
        return;
    }

    const user = getUserById(userId);
    if (!user) { log("error", "charge.success — user not found: " + userId); return; }

    const amountKobo = Number(data.amount) || 0;
    const currency = data.currency || "NGN";

    // Paystack stores current period end on the subscription object;
    // for one-time charges we approximate by interval.
    let periodEnd = null;
    try {
        if (data.subscription_code) {
            const subResp = await paystackService.fetchSubscription(data.subscription_code);
            if (subResp.success && subResp.subscription && subResp.subscription.next_payment_date) {
                periodEnd = new Date(subResp.subscription.next_payment_date)
                    .toISOString().replace("T", " ").substring(0, 19);
            }
        }
    } catch (e) { /* fallback below */ }

    if (!periodEnd) {
        const days = cycle === "annual" ? 365 : 30;
        periodEnd = new Date(Date.now() + days * 86400000)
            .toISOString().replace("T", " ").substring(0, 19);
    }

    const planCfg = PLANS.get(planId);
    const ok = upsertSubscriptionForPlan(userId, planId, cycle, {
        periodEnd: periodEnd,
        subscriptionCode: data.subscription_code || null,
        emailToken: data.email_token || null
    });
    if (!ok) return;

    // Record the payment (naira in DB)
    recordPayment(userId, {
        amountKobo: amountKobo,
        currency: currency,
        transactionId: data.reference || data.id || null,
        status: "succeeded"
    });

    // Fire the notification + email (already built in Wave 1)
    try {
        await planNotificationService.onPaymentSucceeded({
            userId: userId,
            userEmail: user.email,
            amount: amountKobo,
            currency: currency,
            planId: planId,
            planName: planCfg.name,
            interval: cycle
        });
        log("info", "onPaymentSucceeded fired for user " + userId + " → " + planId + " (" + cycle + ")");
    } catch (e) {
        log("error", "onPaymentSucceeded failed: " + e.message);
    }
}

async function handleSubscriptionCreate(event) {
    const data = event.data || {};
    const userId = (data.metadata && Number(data.metadata.user_id)) || null;
    const planId = (data.metadata && data.metadata.plan_id) || null;
    const cycle = (data.metadata && data.metadata.cycle) || "monthly";

    if (!userId) { log("error", "subscription.create missing user_id"); return; }

    try {
        db.prepare(
            "UPDATE subscriptions SET provider_subscription_id = ?, " +
            "paystack_subscription_code = ?, paystack_email_token = ?, " +
            "billing_interval = ?, updated_at = CURRENT_TIMESTAMP " +
            "WHERE user_id = ?"
        ).run(
            data.subscription_code || null,
            data.subscription_code || null,
            data.email_token || null,
            cycle,
            userId
        );
        log("info", "subscription.create stored for user " + userId);
    } catch (e) {
        log("error", "subscription.create failed: " + e.message);
    }
}

async function handleSubscriptionNotRenew(event) {
    const data = event.data || {};
    const userId = (data.metadata && Number(data.metadata.user_id)) || null;
    if (!userId) { log("error", "subscription.not_renew missing user_id"); return; }

    try {
        db.prepare(
            "UPDATE subscriptions SET cancel_at_period_end = 1, " +
            "updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
        ).run(userId);
        log("info", "subscription.not_renew for user " + userId);
    } catch (e) {
        log("error", "subscription.not_renew failed: " + e.message);
    }
}

async function handleSubscriptionDisable(event) {
    const data = event.data || {};
    const userId = (data.metadata && Number(data.metadata.user_id)) || null;
    if (!userId) { log("error", "subscription.disable missing user_id"); return; }

    const user = getUserById(userId);
    const sub = getSubscriptionByUserId(userId);
    if (!sub) { log("error", "subscription.disable — no sub for user " + userId); return; }

    const planId = sub.plan || "pro";

    // If user already cancelled via our /api/billing/cancel endpoint,
    // the notification has already fired. Only sync the status flag.
    if (sub.cancel_at_period_end === 1) {
        log("info", "subscription.disable for user " + userId + " — already handled by cancel endpoint");
        try {
            db.prepare(
                "UPDATE subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
            ).run(userId);
        } catch (e) {}
        return;
    }

    // External disable (Paystack dashboard, admin action) — mark + notify
    try {
        db.prepare(
            "UPDATE subscriptions SET cancel_at_period_end = 1, status = 'cancelled', " +
            "canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
        ).run(userId);

        if (user) {
            await planNotificationService.onSubscriptionCancelled({
                userId: userId,
                userEmail: user.email,
                planId: planId,
                accessEnds: sub.current_period_end || null
            });
            log("info", "onSubscriptionCancelled (external) fired for user " + userId);
        }
    } catch (e) {
        log("error", "subscription.disable failed: " + e.message);
    }
}

async function handleInvoicePaymentFailed(event) {
    const data = event.data || {};
    // invoice.payment_failed — data.subscription is the sub code, metadata carries user
    const userId = (data.metadata && Number(data.metadata.user_id)) || null;
    const sub = userId ? getSubscriptionByUserId(userId) : null;
    if (!userId || !sub) { log("error", "invoice.payment_failed missing user/sub"); return; }

    const user = getUserById(userId);
    const planId = sub.plan || "pro";

    // Determine state — if we're inside grace, tell the user. Otherwise default to retry_pending.
    let billingState = "retry_pending";
    let graceUntil = null;
    if (sub.grace_ends_at) {
        billingState = "grace_period";
        graceUntil = sub.grace_ends_at;
    } else {
        // Start a 3-day grace
        const graceEnd = new Date(Date.now() + 3 * 86400000)
            .toISOString().replace("T", " ").substring(0, 19);
        try {
            db.prepare("UPDATE subscriptions SET grace_ends_at = ? WHERE id = ?").run(graceEnd, sub.id);
        } catch (e) {}
        billingState = "grace_period";
        graceUntil = graceEnd;
    }

    try {
        await planNotificationService.onPaymentFailed({
            userId: userId,
            userEmail: user ? user.email : null,
            amount: Number(data.amount) || 0,
            currency: data.currency || "NGN",
            planId: planId,
            billingState: billingState,
            graceUntil: graceUntil
        });
        log("info", "onPaymentFailed fired for user " + userId + " (" + billingState + ")");
    } catch (e) {
        log("error", "onPaymentFailed failed: " + e.message);
    }
}

async function handleInvoicePaymentSucceeded(event) {
    const data = event.data || {};
    const userId = (data.metadata && Number(data.metadata.user_id)) || null;
    const sub = userId ? getSubscriptionByUserId(userId) : null;
    if (!userId || !sub) { log("error", "invoice.payment_succeeded missing user/sub"); return; }

    const user = getUserById(userId);
    const planId = sub.plan || "pro";
    const cycle = sub.billing_interval || "monthly";

    const nextRenewalDate = data.subscription && data.subscription.next_payment_date
        ? new Date(data.subscription.next_payment_date).toISOString().replace("T", " ").substring(0, 10)
        : null;

    // Clear grace state on successful renewal
    try {
        const periodEnd = new Date(Date.now() + (cycle === "annual" ? 365 : 30) * 86400000)
            .toISOString().replace("T", " ").substring(0, 19);
        db.prepare(
            "UPDATE subscriptions SET current_period_end = ?, " +
            "grace_ends_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(periodEnd, sub.id);
    } catch (e) {}

    try {
        recordPayment(userId, {
            amountKobo: Number(data.amount) || 0,
            currency: data.currency || "NGN",
            transactionId: data.reference || data.id || null,
            status: "renewed"
        });

        await planNotificationService.onSubscriptionRenewed({
            userId: userId,
            userEmail: user ? user.email : null,
            planId: planId,
            amount: Number(data.amount) || 0,
            currency: data.currency || "NGN",
            nextRenewalDate: nextRenewalDate
        });
        log("info", "onSubscriptionRenewed fired for user " + userId);
    } catch (e) {
        log("error", "onSubscriptionRenewed failed: " + e.message);
    }
}

// =========================================================
// Main handler — mounted as express route
// =========================================================
async function handle(req, res) {
    // 1. Verify signature
    const signature = req.headers["x-paystack-signature"];
    const rawBody = req.body; // Buffer (from express.raw)

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
        log("error", "webhook received non-buffer body — check express.raw mount order");
        return res.status(400).send("invalid body");
    }

    const sk = config.getSecretKey();
    if (!sk) {
        log("error", "no secret key configured");
        return res.status(500).send("not configured");
    }

    const expectedHash = crypto.createHmac("sha512", sk).update(rawBody).digest("hex");
    if (expectedHash !== signature) {
        log("error", "signature mismatch");
        return res.status(401).send("invalid signature");
    }

    // 2. Parse event
    let event;
    try { event = JSON.parse(rawBody.toString("utf8")); }
    catch (e) { log("error", "json parse failed"); return res.status(400).send("bad json"); }

    const eventType = event.event;
    log("info", "received: " + eventType);

    // 3. ACK immediately — Paystack expects a fast 200
    res.status(200).send("ok");

    // 4. Process asynchronously
    setImmediate(async function () {
        // Idempotency: skip duplicate events (Paystack retries on failure)
        const _key = eventKey(event);
        if (!claimEvent(eventType, _key)) {
            log("info", "duplicate event ignored: " + eventType + " / " + _key);
            return;
        }
        try {
            switch (eventType) {
                case "charge.success":            await handleChargeSuccess(event); break;
                case "subscription.create":       await handleSubscriptionCreate(event); break;
                case "subscription.not_renew":    await handleSubscriptionNotRenew(event); break;
                case "subscription.disable":      await handleSubscriptionDisable(event); break;
                case "invoice.payment_failed":    await handleInvoicePaymentFailed(event); break;
                case "invoice.payment_succeeded":
                case "invoice.update":            await handleInvoicePaymentSucceeded(event); break;
                default:
                    log("info", "unhandled event: " + eventType);
            }
        } catch (e) {
            log("error", "handler crashed for " + eventType + ": " + e.message);
        }
    
        markProcessed(eventType, _key);
    });
}

module.exports = { handle: handle };