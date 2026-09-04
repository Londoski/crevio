// =========================================================
// CREVIO — USAGE SERVICE
// =========================================================

const db = require("../../database/db");
const { getPlan } = require("../config/plans");

// ----- PROJECT COUNT -----
function countProjects(userId) {
    const result = db.prepare(`
        SELECT COUNT(*) AS count FROM projects WHERE user_id = ?
    `).get(userId);
    return result.count || 0;
}

// ----- MEDIA COUNT -----
function countMedia(userId) {
    const result = db.prepare(`
        SELECT COUNT(*) AS count
        FROM project_media pm
        JOIN projects p ON pm.project_id = p.id
        WHERE p.user_id = ?
    `).get(userId);
    return result.count || 0;
}

// ----- STORAGE USAGE -----
function calculateStorageUsed(userId) {
    const mediaCount = countMedia(userId);
    return mediaCount * 2 * 1024 * 1024;
}

// ----- BOT USAGE (placeholder) -----
function getBotUsage(userId, periodStart) {
    return 0;
}

// ----- CHECK IF USER CAN CREATE PROJECT -----
function canCreateProject(userId) {
    const subscription = db.prepare(`
        SELECT plan FROM subscriptions WHERE user_id = ?
    `).get(userId);

    const planId = subscription?.plan || 'free';
    const plan = getPlan(planId);
    const maxProjects = plan.projects.max;

    if (maxProjects === null) {
        return { allowed: true };
    }

    const current = countProjects(userId);
    const allowed = current < maxProjects;

    return {
        allowed,
        current,
        max: maxProjects,
        plan: planId
    };
}

// ----- CHECK IF USER CAN UPLOAD MEDIA -----
function canUploadMedia(userId) {
    const subscription = db.prepare(`
        SELECT plan FROM subscriptions WHERE user_id = ?
    `).get(userId);

    const planId = subscription?.plan || 'free';
    const plan = getPlan(planId);
    const maxMedia = plan.media.max;

    if (maxMedia === null) {
        return { allowed: true };
    }

    const current = countMedia(userId);
    const allowed = current < maxMedia;

    return {
        allowed,
        current,
        max: maxMedia,
        plan: planId
    };
}

// ----- CHECK IF USER HAS STORAGE SPACE -----
function hasStorageSpace(userId, fileSize) {
    const subscription = db.prepare(`
        SELECT plan FROM subscriptions WHERE user_id = ?
    `).get(userId);

    const planId = subscription?.plan || 'free';
    const plan = getPlan(planId);
    const maxBytes = plan.storage.maxBytes;

    const used = calculateStorageUsed(userId);
    const available = maxBytes - used;

    return {
        allowed: available >= fileSize,
        used,
        max: maxBytes,
        available,
        plan: planId
    };
}

// ----- GET USER ENTITLEMENTS -----
function getUserEntitlements(userId) {
    const subscription = db.prepare(`
        SELECT plan FROM subscriptions WHERE user_id = ?
    `).get(userId);

    const planId = subscription?.plan || 'free';
    const plan = getPlan(planId);

    const projectCount = countProjects(userId);
    const mediaCount = countMedia(userId);
    const storageUsed = calculateStorageUsed(userId);

    return {
        plan: planId,
        limits: {
            projects: {
                max: plan.projects.max,
                used: projectCount
            },
            media: {
                max: plan.media.max,
                used: mediaCount
            },
            storage: {
                maxBytes: plan.storage.maxBytes,
                usedBytes: storageUsed
            },
            bot: {
                monthlyLimit: plan.bot.monthlyLimit,
                used: 0
            }
        },
        features: plan.features,
        planLabel: plan.label,
        price: plan.price
    };
}

module.exports = {
    countProjects,
    countMedia,
    calculateStorageUsed,
    getBotUsage,
    canCreateProject,
    canUploadMedia,
    hasStorageSpace,
    getUserEntitlements
};