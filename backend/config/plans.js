// =========================================================
// CREVIO — PLAN CONSTANTS
// =========================================================

const PLANS = {
    FREE: 'free',
    CREATOR: 'creator',
    BUSINESS: 'business'
};

const PLAN_CONFIG = {
    [PLANS.FREE]: {
        id: PLANS.FREE,
        label: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        projects: { max: 5 },
        media: { max: 50 },
        storage: { maxBytes: 1 * 1024 * 1024 * 1024 },
        bot: { monthlyLimit: 20 },
        features: {
            customDomain: false,
            removeBranding: false,
            advancedAnalytics: false,
            teamWorkspace: false,
            customThemes: false,
            seoControls: false,
            prioritySupport: false
        }
    },
    [PLANS.CREATOR]: {
        id: PLANS.CREATOR,
        label: 'Creator',
        price: 3,
        currency: 'USD',
        interval: 'month',
        projects: { max: null },
        media: { max: null },
        storage: { maxBytes: 25 * 1024 * 1024 * 1024 },
        bot: { monthlyLimit: 200 },
        features: {
            customDomain: true,
            removeBranding: true,
            advancedAnalytics: true,
            teamWorkspace: false,
            customThemes: true,
            seoControls: true,
            prioritySupport: true
        }
    },
    [PLANS.BUSINESS]: {
        id: PLANS.BUSINESS,
        label: 'Business',
        price: 10,
        currency: 'USD',
        interval: 'month',
        projects: { max: null },
        media: { max: null },
        storage: { maxBytes: 100 * 1024 * 1024 * 1024 },
        bot: { monthlyLimit: 1000 },
        features: {
            customDomain: true,
            removeBranding: true,
            advancedAnalytics: true,
            teamWorkspace: true,
            customThemes: true,
            seoControls: true,
            prioritySupport: true
        }
    }
};

function getPlan(planId) {
    return PLAN_CONFIG[planId] || PLAN_CONFIG[PLANS.FREE];
}

function getAllPlans() {
    return Object.values(PLAN_CONFIG);
}

module.exports = {
    PLANS,
    PLAN_CONFIG,
    getPlan,
    getAllPlans
};