// =========================================================
// CREVIO — PAYSTACK CONFIG
// File: config/paystack.js
// Maps (plan + cycle) → Paystack plan code.
// =========================================================
// Amounts live on Paystack's side (source of truth).
// This file only holds the plan codes + helpers.
// =========================================================

const API_BASE = "https://api.paystack.co";

function getSecretKey() {
    return process.env.PAYSTACK_SECRET_KEY || null;
}

function getPublicKey() {
    return process.env.PAYSTACK_PUBLIC_KEY || null;
}

const PLANS = {
    pro: {
        displayName: "Crevio Pro",
        monthly: process.env.PAYSTACK_PLAN_PRO_MONTHLY || null,
        annual:  process.env.PAYSTACK_PLAN_PRO_ANNUAL || null
    },
    business: {
        displayName: "Crevio Business",
        monthly: process.env.PAYSTACK_PLAN_BUSINESS_MONTHLY || null,
        annual:  process.env.PAYSTACK_PLAN_BUSINESS_ANNUAL || null
    }
};

// Returns the plan code for a given (planId, cycle) pair.
// cycle is "monthly" or "annual".
function getPlanCode(planId, cycle) {
    const p = PLANS[planId];
    if (!p) return null;
    const c = String(cycle || "monthly").toLowerCase();
    return c === "annual" ? p.annual : p.monthly;
}

// Convenience: full config object for a (plan, cycle).
function get(planId, cycle) {
    const p = PLANS[planId];
    if (!p) return null;
    const c = String(cycle || "monthly").toLowerCase();
    return {
        displayName: p.displayName,
        planCode: c === "annual" ? p.annual : p.monthly,
        cycle: c
    };
}

function isConfigured() {
    return !!(
        getSecretKey() &&
        PLANS.pro.monthly && PLANS.pro.annual &&
        PLANS.business.monthly && PLANS.business.annual
    );
}

module.exports = {
    API_BASE: API_BASE,
    PLANS: PLANS,
    getSecretKey: getSecretKey,
    getPublicKey: getPublicKey,
    getPlanCode: getPlanCode,
    get: get,
    isConfigured: isConfigured
};