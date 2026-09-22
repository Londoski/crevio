// =========================================================
// CREVIO — PLAN DEFINITIONS
// File: config/plans.js
// Single source of truth for plans, pricing, capabilities.
// =========================================================
// Prices are stored in the smallest currency unit:
//   NGN uses kobo (1 Naira = 100 kobo)
//   ₦5,000    = 500000 kobo
//   ₦50,000   = 5000000 kobo
// =========================================================

const CURRENCY = "NGN";
const CURRENCY_SYMBOL = "\u20A6"; // ₦

const PLANS = {
    free: {
        id: "free",
        name: "Free",
        tagline: "Get started.",
        priceMonthly: 0,
        priceAnnual: 0,
        price: 0,                    // backward compat
        priceLabel: "Free forever",
        priceLabelMonthly: "Free",
        priceLabelAnnual: "Free",
        interval: null,
        currency: CURRENCY,
        upgradeTo: "pro",

        capabilities: {
            "portfolio.public": true,
            "portfolio.custom_domain": false,
            "portfolio.remove_branding": false,
            "portfolio.advanced_customization": false,
            "portfolio.advanced_templates": false,
            "analytics.basic": true,
            "analytics.advanced": false,
            "bot.basic": true,
            "bot.advanced": false,
            "ai.basic": true,
            "ai.advanced": false,
            "ai.full": false,
            "messages.basic": true,
            "messages.advanced": false,
            "messages.unlimited_length": false,
            "messages.emoji.basic": true,
            "messages.emoji.premium_packs": false,
            "messages.emoji.full_library": false,
            "messages.reactions.basic": true,
            "messages.reactions.premium_packs": false,
            "messages.reactions.full_library": false,
            "security.standard": true,
            "security.advanced": false,
            "security.full": false,
            "opportunities.discover": false,
            "opportunities.outreach": false,
            "calls.client": false
        },

        limits: {
            projects: 3,
            services: 2,
            skills: 5,
            media: 10,
            "messages.max_length": 100,
            "messages.max_pins": 1,
            "messages.max_daily": 50
        },

        features: [
            "Professional profile",
            "Public portfolio",
            "Up to 3 projects",
            "Up to 2 services",
            "Up to 5 skills",
            "Up to 10 media files",
            "Basic portfolio customization",
            "Basic analytics",
            "Messages (up to 100 characters)",
            "1 pinned message per chat",
            "Basic Crevio Bot",
            "Basic AI assistance",
            "Standard account protection",
            "Standard 2FA"
        ]
    },

    pro: {
        id: "pro",
        name: "Pro",
        tagline: "Build professionally.",
        priceMonthly: 500000,        // ₦5,000
        priceAnnual: 5000000,        // ₦50,000
        price: 500000,               // backward compat (monthly)
        priceLabel: "\u20A65,000/month",
        priceLabelMonthly: "\u20A65,000/month",
        priceLabelAnnual: "\u20A650,000/year",
        interval: "month",
        currency: CURRENCY,
        upgradeTo: "business",

        capabilities: {
            "portfolio.public": true,
            "portfolio.custom_domain": true,
            "portfolio.remove_branding": true,
            "portfolio.advanced_customization": true,
            "portfolio.advanced_templates": true,
            "analytics.basic": true,
            "analytics.advanced": true,
            "bot.basic": true,
            "bot.advanced": true,
            "ai.basic": true,
            "ai.advanced": true,
            "ai.full": false,
            "messages.basic": true,
            "messages.advanced": true,
            "messages.unlimited_length": false,
            "messages.emoji.basic": true,
            "messages.emoji.premium_packs": true,
            "messages.emoji.full_library": false,
            "messages.reactions.basic": true,
            "messages.reactions.premium_packs": true,
            "messages.reactions.full_library": false,
            "security.standard": true,
            "security.advanced": true,
            "security.full": false,
            "opportunities.discover": false,
            "opportunities.outreach": false,
            "calls.client": false
        },

        limits: {
            projects: 25,
            services: 10,
            skills: 25,
            media: 200,
            "messages.max_length": 500,
            "messages.max_pins": 3,
            "messages.max_daily": 500
        },

        features: [
            "Everything in Free",
            "Up to 25 projects",
            "Up to 10 services",
            "Up to 25 skills",
            "Up to 200 media files",
            "Advanced portfolio customization",
            "Advanced templates",
            "Custom domain",
            "Remove Crevio branding",
            "Advanced analytics",
            "Advanced Crevio Bot",
            "Advanced AI features",
            "Messages up to 500 characters",
            "Up to 3 pinned messages per chat",
            "Advanced account security",
            "Advanced 2FA"
        ]
    },

    business: {
        id: "business",
        name: "Business",
        tagline: "Full professional control.",
        priceMonthly: 2000000,       // ₦20,000
        priceAnnual: 20000000,       // ₦200,000
        price: 2000000,              // backward compat (monthly)
        priceLabel: "\u20A620,000/month",
        priceLabelMonthly: "\u20A620,000/month",
        priceLabelAnnual: "\u20A6200,000/year",
        interval: "month",
        currency: CURRENCY,
        upgradeTo: null,

        capabilities: {
            "portfolio.public": true,
            "portfolio.custom_domain": true,
            "portfolio.remove_branding": true,
            "portfolio.advanced_customization": true,
            "portfolio.advanced_templates": true,
            "analytics.basic": true,
            "analytics.advanced": true,
            "bot.basic": true,
            "bot.advanced": true,
            "ai.basic": true,
            "ai.advanced": true,
            "ai.full": true,
            "messages.basic": true,
            "messages.advanced": true,
            "messages.unlimited_length": true,
            "messages.emoji.basic": true,
            "messages.emoji.premium_packs": true,
            "messages.emoji.full_library": true,
            "messages.reactions.basic": true,
            "messages.reactions.premium_packs": true,
            "messages.reactions.full_library": true,
            "security.standard": true,
            "security.advanced": true,
            "security.full": true,
            "opportunities.discover": true,
            "opportunities.outreach": true,
            "calls.client": true
        },

        limits: {
            projects: -1,
            services: -1,
            skills: -1,
            media: -1,
            "messages.max_length": -1,
            "messages.max_pins": 3,
            "messages.max_daily": -1
        },

        features: [
            "Everything in Pro",
            "Unlimited projects",
            "Unlimited services",
            "Unlimited skills",
            "Unlimited media",
            "Full portfolio customization",
            "Full Crevio Bot",
            "Maximum AI capabilities",
            "Unlimited message length (technical cap applies)",
            "Full emoji library",
            "Full reactions",
            "Advanced security suite",
            "AI Job Hunt (coming soon)",
            "Opportunity Discovery (coming soon)",
            "Client calling (coming soon)",
            "Team collaboration (coming soon)"
        ]
    }
};

const UNLIMITED = -1;

const TECHNICAL_CAPS = {
    message_length: 10000
};

// ---------- format helpers ----------
// Formats a kobo amount as a display string.
// 500000 → "₦5,000.00"
function formatKobo(amountKobo, currency) {
    const cur = (currency || CURRENCY).toUpperCase();
    const symbol = cur === "NGN" ? CURRENCY_SYMBOL : (cur === "USD" ? "$" : cur + " ");
    const major = (Number(amountKobo) || 0) / 100;
    const withSeparators = major.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return symbol + withSeparators;
}

function get(planId) {
    return PLANS[planId] || PLANS.free;
}

function listAll() {
    return ["free", "pro", "business"].map(function (id) { return PLANS[id]; });
}

module.exports = {
    PLANS: PLANS,
    UNLIMITED: UNLIMITED,
    TECHNICAL_CAPS: TECHNICAL_CAPS,
    CURRENCY: CURRENCY,
    CURRENCY_SYMBOL: CURRENCY_SYMBOL,
    formatKobo: formatKobo,
    get: get,
    listAll: listAll
};