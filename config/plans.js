// =========================================================
// CREVIO — PLAN DEFINITIONS
// File: config/plans.js
// Single source of truth for plans, capabilities, limits.
// Extend by adding a new key + rules. Never hardcode in
// controllers or frontend — always call entitlementService.
// =========================================================

const PLANS = {
    free: {
        id: "free",
        name: "Free",
        tagline: "Start building your professional presence.",
        price: 0,
        priceLabel: "Free forever",
        interval: null,
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
        tagline: "Take your professional workspace further.",
        price: 19,
        priceLabel: "$19/month",
        interval: "month",
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
        tagline: "Unlock the full power of Crevio.",
        price: 49,
        priceLabel: "$49/month",
        interval: "month",
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

// Sentinel for unlimited values
const UNLIMITED = -1;

// Technical safety caps (server-side, not a subscription restriction)
const TECHNICAL_CAPS = {
    message_length: 10000
};

function get(planId) {
    return PLANS[planId] || PLANS.free;
}

function listAll() {
    return ["free", "pro", "business"].map(function (id) { return PLANS[id]; });
}

module.exports = { PLANS, UNLIMITED, TECHNICAL_CAPS, get, listAll };
