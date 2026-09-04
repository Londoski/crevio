// =========================================================
// CREVIO — PAYMENT MODEL
// =========================================================

const db = require("../../database/db");

const paymentModel = {
    // Create payment record
    create(data) {
        const { user_id, subscription_id, provider, provider_transaction_id,
                amount, currency, status, payment_date } = data;

        const stmt = db.prepare(`
            INSERT INTO payments (
                user_id, subscription_id, provider, provider_transaction_id,
                amount, currency, status, payment_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            user_id,
            subscription_id || null,
            provider || null,
            provider_transaction_id || null,
            amount || 0,
            currency || 'USD',
            status || 'pending',
            payment_date || new Date().toISOString()
        );
        return this.findById(result.lastInsertRowid);
    },

    findById(id) {
        return db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id);
    },

    // Get all payments for a user
    findByUserId(userId, limit = 50) {
        return db.prepare(`
            SELECT * FROM payments
            WHERE user_id = ?
            ORDER BY payment_date DESC
            LIMIT ?
        `).all(userId, limit);
    },

    // Update payment status
    updateStatus(id, status) {
        const stmt = db.prepare(`
            UPDATE payments
            SET status = ?
            WHERE id = ?
        `);
        stmt.run(status, id);
        return this.findById(id);
    },

    // Get by provider transaction ID (idempotency)
    findByTransactionId(provider, transactionId) {
        return db.prepare(`
            SELECT * FROM payments
            WHERE provider = ? AND provider_transaction_id = ?
        `).get(provider, transactionId);
    }
};

module.exports = paymentModel;