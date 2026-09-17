// =========================================================
// CREVIO — WEBHOOK CONTROLLER
// File: backend/controllers/webhookController.js
// =========================================================

const db = require("../../database/db");

// POST /api/webhooks/stripe
exports.stripeWebhook = (req, res) => {
    try {
        // In production: verify signature using stripe.webhooks.constructEvent
        console.log("📥 Stripe webhook:", req.body?.type);

        const event = req.body;
        if (!event || !event.type) {
            return res.status(400).json({ success: false, message: "Invalid webhook" });
        }

        // Handle common events
        switch (event.type) {
            case "checkout.session.completed":
                console.log("Payment completed:", event.data?.object?.id);
                break;
            case "customer.subscription.deleted":
                console.log("Subscription cancelled:", event.data?.object?.id);
                break;
            case "invoice.payment_failed":
                console.log("Payment failed:", event.data?.object?.id);
                break;
            default:
                console.log("Unhandled event type:", event.type);
        }

        res.json({ received: true });
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(500).json({ success: false, message: "Webhook failed", error: err.message });
    }
};

// POST /api/webhooks/paystack
exports.paystackWebhook = (req, res) => {
    try {
        console.log("📥 Paystack webhook:", req.body?.event);
        res.json({ received: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Webhook failed", error: err.message });
    }
};