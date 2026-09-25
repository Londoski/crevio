// =========================================================
// CREVIO — ENTITLEMENT SERVICE
// File: backend/services/entitlementService.js
// Central place to answer: what plan, what can they do,
// what are the limits. Nothing else should branch on
// plan names directly.
// =========================================================
const PLANS = require("../../config/plans");
const db = require("../../database/db");

// ---------- plan resolution ----------
function getUserPlan(userId) {
    if (!userId) return "free";

    try {
        const sub = db.prepare(
            "SELECT plan, status FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
        ).get(userId);
        if (sub && sub.plan && PLANS.PLANS[sub.plan]) {
            // Only honor active/trialing subscriptions
            if (!sub.status || sub.status === "active" || sub.status === "trialing") {
                return sub.plan;
            }
        }
    } catch (e) {}

    try {
        const u = db.prepare("SELECT plan FROM users WHERE id = ?").get(userId);
        if (u && u.plan && PLANS.PLANS[u.plan]) return u.plan;
    } catch (e) {}

    return "free";
}

function getPlanConfig(planId) {
    return PLANS.get(planId);
}

function getConfigFor(userId) {
    return PLANS.get(getUserPlan(userId));
}

// ---------- capability checks ----------
function can(userId, capability) {
    const cfg = getConfigFor(userId);
    return !!(cfg.capabilities && cfg.capabilities[capability]);
}

function cannot(userId, capability) {
    return !can(userId, capability);
}

// ---------- limits ----------
function limitFor(userId, limitKey) {
    const cfg = getConfigFor(userId);
    if (!cfg.limits || cfg.limits[limitKey] === undefined) return 0;
    return cfg.limits[limitKey];
}

function isUnlimited(value) {
    return value === PLANS.UNLIMITED;
}

function isOverLimit(userId, limitKey, currentValue) {
    const max = limitFor(userId, limitKey);
    if (isUnlimited(max)) return false;
    return currentValue > max;
}

// ---------- full entitlements snapshot (for frontend) ----------
function getEntitlements(userId) {
    const planId = getUserPlan(userId);
    const cfg = getPlanConfig(planId);

    // Build an upgrade target with its name for frontend CTA
    let upgradeTarget = null;
    if (cfg.upgradeTo && PLANS.PLANS[cfg.upgradeTo]) {
        const next = PLANS.PLANS[cfg.upgradeTo];
        upgradeTarget = {
            id: next.id,
            name: next.name,
            tagline: next.tagline,
            price: next.price,
            priceLabel: next.priceLabel
        };
    }

    return {
        planId: planId,
        plan: {
            id: cfg.id,
            name: cfg.name,
            tagline: cfg.tagline,
            price: cfg.price,
            priceLabel: cfg.priceLabel,
            interval: cfg.interval
        },
        upgradeTo: upgradeTarget,
        capabilities: cfg.capabilities,
        limits: cfg.limits,
        features: cfg.features
    };
}

// ---------- pricing comparison (for /billing page) ----------
function getAllPlansPublic() {
    return PLANS.listAll().map(function (p) {
        return {
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            price: p.price,
            priceMonthly: p.priceMonthly,
            priceAnnual: p.priceAnnual,
            priceLabel: p.priceLabel,
            priceLabelMonthly: p.priceLabelMonthly,
            priceLabelAnnual: p.priceLabelAnnual,
            interval: p.interval,
            currency: p.currency,
            features: p.features
        };
    });
}

// =========================================================
// TEMPLATE TIERS (Phase 1D)
// Single source of truth for which plan unlocks which template.
// To move a template between tiers, edit one line here.
// =========================================================
const TEMPLATE_TIERS = {
    minimal:   "free",
    cinematic: "pro",
    editorial: "business"
};

const PLAN_RANK = { free: 0, pro: 1, business: 2 };

function templatesForPlan(plan) {
    const rank = PLAN_RANK[String(plan || "free").toLowerCase()];
    const safeRank = (rank === undefined) ? 0 : rank;
    return Object.keys(TEMPLATE_TIERS).filter(function (slug) {
        const need = PLAN_RANK[TEMPLATE_TIERS[slug]];
        const safeNeed = (need === undefined) ? 99 : need;
        return safeNeed <= safeRank;
    });
}

function planForTemplate(slug) {
    return TEMPLATE_TIERS[slug] || "business";
}

function canUseTemplate(plan, slug) {
    const rank = PLAN_RANK[String(plan || "free").toLowerCase()];
    const safeRank = (rank === undefined) ? 0 : rank;
    const need = PLAN_RANK[TEMPLATE_TIERS[slug]];
    const safeNeed = (need === undefined) ? 99 : need;
    return safeRank >= safeNeed;
}

module.exports = {
    getUserPlan,
    getPlanConfig,
    getConfigFor,
    can,
    cannot,
    limitFor,
    isUnlimited,
    isOverLimit,
    getEntitlements,
    getAllPlansPublic,
    templatesForPlan,
    planForTemplate,
    canUseTemplate,
    TEMPLATE_TIERS,
    UNLIMITED: PLANS.UNLIMITED,
    TECHNICAL_CAPS: PLANS.TECHNICAL_CAPS
};