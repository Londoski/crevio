// =========================================================
// CREVIO — BILLING CONTROLLER
// =========================================================

const subscriptionModel = require("../models/subscriptionModel");
const paymentModel = require("../models/paymentModel");
const usageService = require("../services/usageService");
const userModel = require("../models/userModel");
const stripeService = require("../services/stripeService");
const { getPlan, getAllPlans, PLANS } = require("../config/plans");

// ----- GET BILLING STATUS -----
const getBillingStatus = (req, res) => {
    try {
        const userId = req.user.id;
        const entitlements = usageService.getUserEntitlements(userId);
        const subscription = subscriptionModel.findByUserId(userId);
        const payments = paymentModel.findByUserId(userId, 10);

        res.json({
            success: true,
            billing: {
                subscription: {
                    plan: entitlements.plan,
                    planLabel: entitlements.planLabel,
                    status: subscription?.status || 'active',
                    current_period_end: subscription?.current_period_end || null,
                    cancel_at_period_end: subscription?.cancel_at_period_end === 1,
                    price: entitlements.price
                },
                limits: entitlements.limits,
                features: entitlements.features,
                payments
            }
        });
    } catch (error) {
        console.error("Get billing status error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load billing information."
        });
    }
};

// ----- GET ALL PLANS -----
const getPlans = (req, res) => {
    try {
        const plans = getAllPlans();
        res.json({
            success: true,
            plans
        });
    } catch (error) {
        console.error("Get plans error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load plans."
        });
    }
};

// ----- UPGRADE PLAN (Stripe checkout) -----
const upgradePlan = async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.user.id;

        if (!planId || !Object.values(PLANS).includes(planId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan selection."
            });
        }

        const currentSubscription = subscriptionModel.findByUserId(userId);
        const currentPlan = currentSubscription?.plan || PLANS.FREE;

        if (currentPlan === planId) {
            return res.status(400).json({
                success: false,
                message: "You are already on this plan."
            });
        }

        if (planId === PLANS.FREE) {
            return res.status(400).json({
                success: false,
                message: "Downgrading to Free is not supported via checkout. Please cancel your subscription and contact support."
            });
        }

        const user = userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const session = await stripeService.createCheckoutSession(
            userId,
            planId,
            user.email,
            user.display_name || user.username
        );

        res.json({
            success: true,
            message: "Checkout session created.",
            checkout_url: session.url,
            session_id: session.sessionId
        });

    } catch (error) {
        console.error("Upgrade plan error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Unable to process plan change."
        });
    }
};

// ----- CANCEL SUBSCRIPTION -----
const cancelSubscription = (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = subscriptionModel.findByUserId(userId);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found."
            });
        }

        if (subscription.plan === PLANS.FREE) {
            return res.status(400).json({
                success: false,
                message: "Free plan cannot be cancelled."
            });
        }

        subscriptionModel.cancelAtPeriodEnd(userId);

        res.json({
            success: true,
            message: "Subscription will be cancelled at the end of the billing period.",
            cancel_at_period_end: true
        });
    } catch (error) {
        console.error("Cancel subscription error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to cancel subscription."
        });
    }
};

// ----- REACTIVATE SUBSCRIPTION -----
const reactivateSubscription = (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = subscriptionModel.findByUserId(userId);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "No subscription found."
            });
        }

        if (subscription.plan === PLANS.FREE) {
            return res.status(400).json({
                success: false,
                message: "Cannot reactivate free plan."
            });
        }

        subscriptionModel.reactivate(userId);

        res.json({
            success: true,
            message: "Subscription reactivated.",
            cancel_at_period_end: false
        });
    } catch (error) {
        console.error("Reactivate subscription error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to reactivate subscription."
        });
    }
};

// ----- GET PAYMENT HISTORY -----
const getPaymentHistory = (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const payments = paymentModel.findByUserId(userId, limit);

        res.json({
            success: true,
            count: payments.length,
            payments
        });
    } catch (error) {
        console.error("Get payment history error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load payment history."
        });
    }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
    getBillingStatus,
    getPlans,
    upgradePlan,
    cancelSubscription,
    reactivateSubscription,
    getPaymentHistory
};