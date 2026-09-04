// =========================================================
// CREVIO — SOCIAL CONTROLLER
// =========================================================

const socialModel = require("../models/socialModel");
const userModel = require("../models/userModel");

// ---- ACCOUNT CRUD ----

// Get all accounts for the authenticated user
const getAccounts = (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = socialModel.getAccounts(userId);
        res.json({ success: true, accounts });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ success: false, message: 'Unable to load accounts.' });
    }
};

// Create a new social account
const createAccount = (req, res) => {
    try {
        const userId = req.user.id;
        const { platform, username, display_name, profile_url, cta_label, display_order, is_visible } = req.body;

        // Validate
        if (!platform || !profile_url) {
            return res.status(400).json({ success: false, message: 'Platform and profile URL are required.' });
        }

        const account = socialModel.createAccount(userId, {
            platform,
            username,
            display_name,
            profile_url,
            cta_label,
            display_order,
            is_visible
        });
        res.json({ success: true, account });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ success: false, message: 'Unable to create account.' });
    }
};

// Update an account
const updateAccount = (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = parseInt(req.params.id);
        const updates = req.body;

        // Check if account exists and belongs to user
        const existing = socialModel.getAccountById(accountId, userId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Account not found.' });
        }

        const updated = socialModel.updateAccount(accountId, userId, updates);
        res.json({ success: true, account: updated });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ success: false, message: 'Unable to update account.' });
    }
};

// Delete an account
const deleteAccount = (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = parseInt(req.params.id);

        const existing = socialModel.getAccountById(accountId, userId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Account not found.' });
        }

        socialModel.deleteAccount(accountId, userId);
        res.json({ success: true, message: 'Account deleted.' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete account.' });
    }
};

// Reorder accounts (bulk update display_order)
const reorderAccounts = (req, res) => {
    try {
        const userId = req.user.id;
        const { orderedIds } = req.body; // array of account IDs in new order
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ success: false, message: 'orderedIds must be an array.' });
        }
        const updateStmt = db.prepare(`UPDATE social_accounts SET display_order = ? WHERE id = ? AND user_id = ?`);
        const updateMany = db.transaction((ids) => {
            ids.forEach((id, index) => {
                updateStmt.run(index, id, userId);
            });
        });
        updateMany(orderedIds);
        const accounts = socialModel.getAccounts(userId);
        res.json({ success: true, accounts });
    } catch (error) {
        console.error('Reorder accounts error:', error);
        res.status(500).json({ success: false, message: 'Unable to reorder accounts.' });
    }
};

// ---- ANALYTICS ----

// Get overview stats
const getOverviewStats = (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const stats = socialModel.getAccountStats(userId, days);

        // Get previous period for comparison (same length, offset)
        const prevStats = socialModel.getAccountStats(userId, days * 2);
        // We'll compute changes in the frontend for simplicity, but we can also compute here.

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get overview stats error:', error);
        res.status(500).json({ success: false, message: 'Unable to load stats.' });
    }
};

// Get top performing pages
const getTopPages = (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;
        const days = parseInt(req.query.days) || 30;
        const pages = socialModel.getTopPages(userId, limit, days);
        res.json({ success: true, pages });
    } catch (error) {
        console.error('Get top pages error:', error);
        res.status(500).json({ success: false, message: 'Unable to load top pages.' });
    }
};

// Get clicks over time (for chart)
const getClicksOverTime = (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const platform = req.query.platform || null;
        const data = socialModel.getClicksOverTime(userId, days, platform);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get clicks over time error:', error);
        res.status(500).json({ success: false, message: 'Unable to load chart data.' });
    }
};

// Get traffic sources
const getTrafficSources = (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const sources = socialModel.getTrafficSources(userId, days);
        res.json({ success: true, sources });
    } catch (error) {
        console.error('Get traffic sources error:', error);
        res.status(500).json({ success: false, message: 'Unable to load traffic sources.' });
    }
};

// Get CTA performance
const getCTAPerformance = (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const data = socialModel.getCTAPerformance(userId, days);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get CTA performance error:', error);
        res.status(500).json({ success: false, message: 'Unable to load CTA performance.' });
    }
};

// ---- TRACKING (REDIRECT) ----

// Record a social click and redirect
const trackRedirect = (req, res) => {
    try {
        const { id } = req.params; // social_account_id
        if (!id) {
            return res.status(400).send('Invalid request.');
        }

        // Get the account (no auth needed for public)
        const account = db.prepare(`SELECT * FROM social_accounts WHERE id = ? AND is_visible = 1`).get(id);
        if (!account) {
            return res.status(404).send('Account not found.');
        }

        // Gather click data
        const visitor_id = req.cookies?.crevio_visitor || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        const referrer = req.headers['referer'] || null;
        const ip = req.ip || null;

        // Determine device category
        let device = 'desktop';
        if (userAgent && /mobile|android|iphone/i.test(userAgent)) device = 'mobile';
        else if (userAgent && /tablet|ipad/i.test(userAgent)) device = 'tablet';

        // Determine browser (simplified)
        let browser = 'unknown';
        if (userAgent) {
            if (userAgent.includes('Chrome')) browser = 'Chrome';
            else if (userAgent.includes('Firefox')) browser = 'Firefox';
            else if (userAgent.includes('Safari')) browser = 'Safari';
            else if (userAgent.includes('Edge')) browser = 'Edge';
        }

        // Find portfolio_id and project_id from referrer (if possible)
        let portfolio_id = null, project_id = null, page_url = null, cta_location = null;
        if (referrer) {
            page_url = referrer;
            // Try to extract project id from URL if it matches /project.html?id=...
            const projectMatch = referrer.match(/[?&]id=(\d+)/);
            if (projectMatch) {
                project_id = parseInt(projectMatch[1]);
            }
            // Check if it's a portfolio page (we'll just store the URL)
            // We could also lookup portfolio by domain but for simplicity we store URL.
        }

        // Record the click
        socialModel.recordClick({
            social_account_id: account.id,
            portfolio_id,
            project_id,
            page_url,
            cta_location: 'Unknown', // we could pass a parameter
            visitor_id: visitor_id || null,
            device_category: device,
            browser,
            referrer,
            ip_address: ip,
            user_agent: userAgent
        });

        // Redirect to the profile URL
        return res.redirect(account.profile_url);

    } catch (error) {
        console.error('Track redirect error:', error);
        // Still redirect to the account URL even if tracking fails
        const account = db.prepare(`SELECT profile_url FROM social_accounts WHERE id = ?`).get(req.params.id);
        if (account && account.profile_url) {
            return res.redirect(account.profile_url);
        }
        return res.status(500).send('Unable to redirect.');
    }
};
async function loadSocialLinks(username) {
    const res = await fetch(`/api/public/${username}/social`);
    const data = await res.json();
    if (data.success && data.accounts) {
        const container = document.getElementById('socialLinks');
        let html = '';
        data.accounts.forEach(acc => {
            html += `
                <a href="/api/social/track/${acc.id}" target="_blank" rel="noopener">
                    ${acc.display_name || acc.platform}
                </a>
            `;
        });
        container.innerHTML = html;
    }
}
module.exports = {
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    getOverviewStats,
    getTopPages,
    getClicksOverTime,
    getTrafficSources,
    getCTAPerformance,
    trackRedirect
};