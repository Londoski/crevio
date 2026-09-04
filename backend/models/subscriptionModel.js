// =========================================================
// CREVIO — SUBSCRIPTION MODEL
// =========================================================

const db = require("../../database/db");

const subscriptionModel = {
    // Get subscription by user ID
    findByUserId(userId) {
        return db.prepare(`
            SELECT * FROM subscriptions
            WHERE user_id = ?
        `).get(userId);
    },

    // Find by provider subscription ID (for webhooks)
    findByProviderSubscriptionId(provider, subscriptionId) {
        return db.prepare(`
            SELECT * FROM subscriptions
            WHERE provider = ? AND provider_subscription_id = ?
        `).get(provider, subscriptionId);
    },

    // Create or update subscription
    upsert(data) {
        const { user_id, plan, status, provider, provider_customer_id, provider_subscription_id,
                current_period_start, current_period_end, cancel_at_period_end, canceled_at } = data;

        const existing = this.findByUserId(user_id);

        if (existing) {
            const stmt = db.prepare(`
                UPDATE subscriptions
                SET plan = ?,
                    status = ?,
                    provider = ?,
                    provider_customer_id = ?,
                    provider_subscription_id = ?,
                    current_period_start = ?,
                    current_period_end = ?,
                    cancel_at_period_end = ?,
                    canceled_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `);
            stmt.run(
                plan || 'free',
                status || 'active',
                provider || null,
                provider_customer_id || null,
                provider_subscription_id || null,
                current_period_start || null,
                current_period_end || null,
                cancel_at_period_end ? 1 : 0,
                canceled_at || null,
                user_id
            );
            return this.findByUserId(user_id);
        }

        // Create new
        const stmt = db.prepare(`
            INSERT INTO subscriptions (
                user_id, plan, status, provider,
                provider_customer_id, provider_subscription_id,
                current_period_start, current_period_end,
                cancel_at_period_end, canceled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            user_id,
            plan || 'free',
            status || 'active',
            provider || null,
            provider_customer_id || null,
            provider_subscription_id || null,
            current_period_start || null,
            current_period_end || null,
            cancel_at_period_end ? 1 : 0,
            canceled_at || null
        );
        return this.findByUserId(user_id);
    },

    // Update plan
    updatePlan(userId, plan) {
        const stmt = db.prepare(`
            UPDATE subscriptions
            SET plan = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        stmt.run(plan, userId);
        return this.findByUserId(userId);
    },

    // Cancel subscription (at period end)
    cancelAtPeriodEnd(userId) {
        const stmt = db.prepare(`
            UPDATE subscriptions
            SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        stmt.run(userId);
        return this.findByUserId(userId);
    },

    // Reactivate subscription (remove cancel flag)
    reactivate(userId) {
        const stmt = db.prepare(`
            UPDATE subscriptions
            SET cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);
        stmt.run(userId);
        return this.findByUserId(userId);
    },

    // Get all subscriptions (admin)
    getAll(limit = 100) {
        return db.prepare(`
            SELECT s.*, u.username, u.email
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC
            LIMIT ?
        `).all(limit);
    }
};

module.exports = subscriptionModel;