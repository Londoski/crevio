// =========================================================
// CREVIO — BILLING CONTROLLER
// File: backend/controllers/billingController.js
// =========================================================

const db = require("../../database/db");

function safeCount(sql, ...params) {
    try { return db.prepare(sql).get(...params)?.c || 0; }
    catch (e) { return 0; }
}

// GET /api/billing/plan
exports.getPlan = (req, res) => {
    try {
        let plan = null;
        try {
            plan = db.prepare(
                "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
            ).get(req.user.id);
        } catch (e) { /* ignore */ }

        if (!plan) {
            return res.json({
                success: true,
                plan: {
                    name: "Free Plan",
                    description: "Basic features to get you started",
                    price: 0,
                    interval: "mo",
                    status: "Active"
                }
            });
        }

        res.json({
            success: true,
            plan: {
                name:        plan.plan_name || plan.name || (plan.plan ? (plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1) + " Plan") : "Free Plan"),
                description: plan.description || "Your current plan",
                price:       plan.price || 0,
                interval:    plan.interval || "mo",
                status:      plan.status || "active"
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/billing/usage
exports.getUsage = (req, res) => {
    try {
        const userId = req.user.id;
        res.json({
            success: true,
            usage: {
                projects_used: safeCount("SELECT COUNT(*) AS c FROM projects WHERE user_id = ?", userId),
                projects_limit: 10,
                media_used:    safeCount("SELECT COUNT(*) AS c FROM project_media WHERE user_id = ?", userId),
                media_limit:   50,
                services_used: safeCount("SELECT COUNT(*) AS c FROM services WHERE user_id = ?", userId),
                services_limit: 5,
                messages_used: safeCount("SELECT COUNT(*) AS c FROM creator_skills WHERE user_id = ?", userId),
                messages_limit: 100
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/billing/payments
exports.getPayments = (req, res) => {
    try {
        let payments = [];
        try {
            payments = db.prepare(
                "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
            ).all(req.user.id);
        } catch (e) {
            try {
                payments = db.prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 50").all();
            } catch (e2) {
                payments = [];
            }
        }
        res.json({ success: true, payments });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// GET /api/billing/payments/:id/invoice
exports.getInvoice = (req, res) => {
    try {
        const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
        if (!payment) return res.status(404).send("Not found");

        const text = `
CREVIO — INVOICE

Invoice #: ${payment.id}
Date: ${payment.created_at || "N/A"}
Amount: $${(((payment.amount || 0) / 100).toFixed(2))}
Status: ${payment.status || "unknown"}
Description: ${payment.description || "Subscription"}

Thank you for your business.
        `.trim();

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="invoice-${payment.id}.txt"`);
        res.send(text);
    } catch (err) {
        res.status(500).send("Failed: " + err.message);
    }
};

// =========================================================
// Entitlements — appended by P2 Phase 2
// =========================================================
exports.getEntitlements = (req, res) => {
    try {
        const ent = require("../services/entitlementService");
        const snapshot = ent.getEntitlements(req.user.id);
        const allPlans = ent.getAllPlansPublic();
        return res.json({ success: true, entitlements: snapshot, plans: allPlans });
    } catch (e) {
        console.error("[billing] getEntitlements failed:", e.message);
        return res.status(500).json({ success: false, message: "Could not load entitlements" });
    }
};
