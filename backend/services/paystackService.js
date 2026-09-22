// =========================================================
// CREVIO — PAYSTACK SERVICE
// File: backend/services/paystackService.js
// =========================================================
// Wraps every Paystack API call Crevio needs:
//   • initializeTransaction — one-time or first-of-subscription
//   • verifyTransaction     — after redirect
//   • fetchSubscription     — inspect sub state
//   • cancelSubscription    — disable from Crevio side
//   • verifyWebhookSignature — HMAC-SHA512 check
// No SDK — uses Node 18+ built-in fetch.
// =========================================================
const crypto = require("crypto");
const config = require("../../config/paystack");

// ---------- helpers ----------
async function request(method, endpoint, body) {
    const sk = config.getSecretKey();
    if (!sk) return { success: false, reason: "paystack_not_configured" };

    const url = config.API_BASE + endpoint;
    const opts = {
        method: method,
        headers: {
            "Authorization": "Bearer " + sk,
            "Content-Type": "application/json"
        }
    };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(url, opts);
        const data = await res.json().catch(function () { return null; });
        if (!res.ok || !data || data.status === false) {
            return {
                success: false,
                reason: (data && data.message) || ("HTTP " + res.status),
                status: res.status,
                data: data
            };
        }
        return { success: true, data: data.data };
    } catch (e) {
        return { success: false, reason: e.message };
    }
}

// =========================================================
// 1. Initialize a transaction (checkout)
// =========================================================
// amountKobo required for one-time; omit if using plan only
// (Paystack uses the plan's amount when plan is present).
async function initializeTransaction(opts) {
    opts = opts || {};
    const email = opts.email;
    const planCode = opts.planCode || null;
    const amountKobo = Number(opts.amountKobo) || null;
    const callbackUrl = opts.callbackUrl || null;
    const metadata = opts.metadata || {};
    const reference = opts.reference || ("CREVIO_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10));

    if (!email) return { success: false, reason: "email_required" };
    if (!planCode && !amountKobo) return { success: false, reason: "plan_or_amount_required" };

    const body = { email: email, reference: reference, metadata: metadata };
    if (planCode) body.plan = planCode;
    if (amountKobo) body.amount = amountKobo;
    if (callbackUrl) body.callback_url = callbackUrl;

    const r = await request("POST", "/transaction/initialize", body);
    if (!r.success) return r;

    return {
        success: true,
        authorizationUrl: r.data.authorization_url,
        accessCode: r.data.access_code,
        reference: r.data.reference
    };
}

// =========================================================
// 2. Verify a transaction by reference
// =========================================================
async function verifyTransaction(reference) {
    if (!reference) return { success: false, reason: "reference_required" };
    const r = await request("GET", "/transaction/verify/" + encodeURIComponent(reference));
    if (!r.success) return r;
    return { success: true, transaction: r.data };
}

// =========================================================
// 3. Fetch a subscription
// =========================================================
async function fetchSubscription(subscriptionCode) {
    if (!subscriptionCode) return { success: false, reason: "subscription_code_required" };
    const r = await request("GET", "/subscription/" + encodeURIComponent(subscriptionCode));
    if (!r.success) return r;
    return { success: true, subscription: r.data };
}

// =========================================================
// 4. Cancel a subscription
// =========================================================
async function cancelSubscription(subscriptionCode, emailToken) {
    if (!subscriptionCode || !emailToken) {
        return { success: false, reason: "subscription_code_and_email_token_required" };
    }
    const r = await request("POST", "/subscription/disable", {
        code: subscriptionCode,
        token: emailToken
    });
    if (!r.success) return r;
    return { success: true };
}

// =========================================================
// 5. Verify webhook signature (HMAC-SHA512 with secret key)
// =========================================================
function verifyWebhookSignature(rawBody, signature) {
    const sk = config.getSecretKey();
    if (!sk || !signature) return false;
    try {
        const hash = crypto
            .createHmac("sha512", sk)
            .update(rawBody)
            .digest("hex");
        return hash === signature;
    } catch (e) {
        return false;
    }
}

module.exports = {
    initializeTransaction: initializeTransaction,
    verifyTransaction: verifyTransaction,
    fetchSubscription: fetchSubscription,
    cancelSubscription: cancelSubscription,
    verifyWebhookSignature: verifyWebhookSignature
};