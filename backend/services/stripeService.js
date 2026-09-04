// =========================================================
// CREVIO — STRIPE SERVICE
// =========================================================

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const subscriptionModel = require('../models/subscriptionModel');
const paymentModel = require('../models/paymentModel');

// ----- Plan ID mapping (Stripe price IDs) -----
// In production, you need to create products and prices in Stripe dashboard.
// For test mode, you can use these price IDs from your Stripe test environment.
// For now, we'll create prices on the fly, but it's better to pre-create them.
// We'll use the plan ID as the lookup key.

const PLAN_PRICE_IDS = {
    creator: process.env.STRIPE_PRICE_CREATOR,  // e.g., price_1...
    business: process.env.STRIPE_PRICE_BUSINESS
};

// ----- Create a Stripe customer if not exists -----
async function getOrCreateCustomer(userId, email, name) {
    let subscription = subscriptionModel.findByUserId(userId);
    if (subscription && subscription.provider_customer_id) {
        return subscription.provider_customer_id;
    }

    const customer = await stripe.customers.create({
        email,
        name: name || email,
        metadata: { userId: String(userId) }
    });

    // Update subscription with customer ID
    subscriptionModel.upsert({
        user_id: userId,
        provider_customer_id: customer.id
    });

    return customer.id;
}

// ----- Create a checkout session -----
async function createCheckoutSession(userId, planId, email, name) {
    const customerId = await getOrCreateCustomer(userId, email, name);

    const priceId = PLAN_PRICE_IDS[planId];
    if (!priceId) {
        throw new Error(`No Stripe price ID found for plan: ${planId}`);
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
            price: priceId,
            quantity: 1,
        }],
        mode: 'subscription',
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
        metadata: {
            userId: String(userId),
            plan: planId
        },
        subscription_data: {
            metadata: {
                userId: String(userId),
                plan: planId
            }
        }
    });

    return { sessionId: session.id, url: session.url };
}

// ----- Handle webhook event -----
async function handleWebhookEvent(rawBody, signature) {
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`✅ Stripe webhook: ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = parseInt(session.metadata.userId);
            const plan = session.metadata.plan;
            const subscriptionId = session.subscription;

            // Get subscription details from Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

            await subscriptionModel.upsert({
                user_id: userId,
                plan: plan,
                status: 'active',
                provider: 'stripe',
                provider_customer_id: session.customer,
                provider_subscription_id: subscriptionId,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: stripeSubscription.cancel_at_period_end ? 1 : 0
            });

            // Record payment
            await paymentModel.create({
                user_id: userId,
                subscription_id: null, // we don't have internal subscription id yet
                provider: 'stripe',
                provider_transaction_id: session.payment_intent || session.id,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency || 'usd',
                status: 'paid',
                payment_date: new Date().toISOString()
            });

            break;
        }

        case 'invoice.paid': {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;

            // Find user by subscription ID
            const subscription = subscriptionModel.findByProviderSubscriptionId('stripe', subscriptionId);
            if (!subscription) break;

            // Update payment record
            await paymentModel.create({
                user_id: subscription.user_id,
                subscription_id: subscription.id,
                provider: 'stripe',
                provider_transaction_id: invoice.payment_intent || invoice.id,
                amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
                currency: invoice.currency || 'usd',
                status: 'paid',
                payment_date: new Date(invoice.created * 1000).toISOString()
            });

            // Renew subscription period
            const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            await subscriptionModel.upsert({
                user_id: subscription.user_id,
                plan: subscription.plan,
                status: 'active',
                provider: 'stripe',
                provider_customer_id: subscription.provider_customer_id,
                provider_subscription_id: subscriptionId,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: stripeSubscription.cancel_at_period_end ? 1 : 0
            });

            break;
        }

        case 'customer.subscription.updated': {
            const stripeSubscription = event.data.object;
            const subscriptionId = stripeSubscription.id;

            const subscription = subscriptionModel.findByProviderSubscriptionId('stripe', subscriptionId);
            if (!subscription) break;

            // Update status
            let status = 'active';
            if (stripeSubscription.status === 'canceled') status = 'canceled';
            else if (stripeSubscription.status === 'past_due') status = 'past_due';
            else if (stripeSubscription.status === 'incomplete') status = 'incomplete';

            // Check if plan changed
            // For simplicity, we'll just update the plan from the subscription's items
            const items = stripeSubscription.items.data;
            const priceId = items[0]?.price?.id;
            // We need to map priceId back to plan. We'll assume we have a mapping.
            // For now, we'll use the plan from metadata or lookup.
            const plan = stripeSubscription.metadata?.plan || subscription.plan;

            await subscriptionModel.upsert({
                user_id: subscription.user_id,
                plan: plan,
                status: status,
                provider: 'stripe',
                provider_customer_id: subscription.provider_customer_id,
                provider_subscription_id: subscriptionId,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: stripeSubscription.cancel_at_period_end ? 1 : 0
            });

            break;
        }

        case 'customer.subscription.deleted': {
            const stripeSubscription = event.data.object;
            const subscriptionId = stripeSubscription.id;

            const subscription = subscriptionModel.findByProviderSubscriptionId('stripe', subscriptionId);
            if (!subscription) break;

            // Set plan to free and status to canceled
            await subscriptionModel.upsert({
                user_id: subscription.user_id,
                plan: 'free',
                status: 'canceled',
                provider: 'stripe',
                provider_customer_id: subscription.provider_customer_id,
                provider_subscription_id: subscriptionId,
                canceled_at: new Date().toISOString()
            });

            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return event;
}

module.exports = {
    getOrCreateCustomer,
    createCheckoutSession,
    handleWebhookEvent
};