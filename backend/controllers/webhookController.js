// =========================================================
// CREVIO — WEBHOOK CONTROLLER
// =========================================================

const stripeService = require("../services/stripeService");

const handleStripeWebhook = async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            return res.status(400).send('Webhook signature missing.');
        }

        const event = await stripeService.handleWebhookEvent(req.body, signature);
        res.status(200).json({ received: true, type: event.type });

    } catch (error) {
        console.error("Webhook error:", error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};

module.exports = {
    handleStripeWebhook
};