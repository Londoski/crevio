// =========================================================
// CREVIO — SOCIAL MODEL
// =========================================================

const db = require("../../database/db");

const socialModel = {

    // ---- ACCOUNTS ----

    // Get all accounts for a user
    getAccounts(userId) {
        return db.prepare(`
            SELECT * FROM social_accounts
            WHERE user_id = ?
            ORDER BY display_order, created_at
        `).all(userId);
    },

    // Get a single account by ID
    getAccountById(id, userId) {
        return db.prepare(`
            SELECT * FROM social_accounts
            WHERE id = ? AND user_id = ?
        `).get(id, userId);
    },

    // Create a new social account
    createAccount(userId, data) {
        const { platform, username, display_name, profile_url, cta_label, display_order, is_visible } = data;
        const stmt = db.prepare(`
            INSERT INTO social_accounts (
                user_id, platform, username, display_name, profile_url, cta_label, display_order, is_visible
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            userId,
            platform,
            username || null,
            display_name || null,
            profile_url,
            cta_label || null,
            display_order || 0,
            is_visible !== undefined ? (is_visible ? 1 : 0) : 1
        );
        return this.getAccountById(result.lastInsertRowid, userId);
    },

    // Update an existing account
    updateAccount(id, userId, data) {
        const fields = [];
        const values = [];
        if (data.platform !== undefined) { fields.push('platform = ?'); values.push(data.platform); }
        if (data.username !== undefined) { fields.push('username = ?'); values.push(data.username); }
        if (data.display_name !== undefined) { fields.push('display_name = ?'); values.push(data.display_name); }
        if (data.profile_url !== undefined) { fields.push('profile_url = ?'); values.push(data.profile_url); }
        if (data.cta_label !== undefined) { fields.push('cta_label = ?'); values.push(data.cta_label); }
        if (data.display_order !== undefined) { fields.push('display_order = ?'); values.push(data.display_order); }
        if (data.is_visible !== undefined) { fields.push('is_visible = ?'); values.push(data.is_visible ? 1 : 0); }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        values.push(userId);
        const sql = `UPDATE social_accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
        db.prepare(sql).run(...values);
        return this.getAccountById(id, userId);
    },

    // Delete an account
    deleteAccount(id, userId) {
        // Delete associated click events first (optional – cascade will handle)
        db.prepare(`DELETE FROM social_accounts WHERE id = ? AND user_id = ?`).run(id, userId);
    },

    // ---- CLICK EVENTS ----

    // Record a social click event
    recordClick(data) {
        const {
            social_account_id,
            portfolio_id,
            project_id,
            page_url,
            cta_location,
            visitor_id,
            device_category,
            browser,
            referrer,
            ip_address,
            user_agent
        } = data;

        const stmt = db.prepare(`
            INSERT INTO social_click_events (
                social_account_id, portfolio_id, project_id, page_url, cta_location,
                visitor_id, device_category, browser, referrer, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            social_account_id,
            portfolio_id || null,
            project_id || null,
            page_url || null,
            cta_location || null,
            visitor_id || null,
            device_category || null,
            browser || null,
            referrer || null,
            ip_address || null,
            user_agent || null
        );
    },

    // ---- ANALYTICS ----

    // Get account stats for overview
    getAccountStats(userId, days = 30) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const accounts = this.getAccounts(userId);
        const accountIds = accounts.map(a => a.id);
        if (accountIds.length === 0) {
            return { totalClicks: 0, uniqueVisitors: 0, returningVisitors: 0, accounts: [] };
        }
        const placeholders = accountIds.map(() => '?').join(',');
        // Total clicks
        const totalClicksResult = db.prepare(`
            SELECT COUNT(*) as count FROM social_click_events
            WHERE social_account_id IN (${placeholders}) AND created_at >= ?
        `).get(...accountIds, cutoff);
        const totalClicks = totalClicksResult?.count || 0;

        // Unique visitors (using visitor_id column – we need to store a unique identifier)
        const uniqueVisitorsResult = db.prepare(`
            SELECT COUNT(DISTINCT visitor_id) as count FROM social_click_events
            WHERE social_account_id IN (${placeholders}) AND created_at >= ?
        `).get(...accountIds, cutoff);
        const uniqueVisitors = uniqueVisitorsResult?.count || 0;

        // Returning visitors (visitors with more than one click)
        const returningVisitorsResult = db.prepare(`
            SELECT COUNT(*) as count FROM (
                SELECT visitor_id FROM social_click_events
                WHERE social_account_id IN (${placeholders}) AND created_at >= ?
                GROUP BY visitor_id HAVING COUNT(*) > 1
            )
        `).get(...accountIds, cutoff);
        const returningVisitors = returningVisitorsResult?.count || 0;

        // Per-account stats
        const accountStats = accounts.map(acc => {
            const clicks = db.prepare(`
                SELECT COUNT(*) as count FROM social_click_events
                WHERE social_account_id = ? AND created_at >= ?
            `).get(acc.id, cutoff)?.count || 0;
            return { ...acc, clicks };
        });

        return {
            totalClicks,
            uniqueVisitors,
            returningVisitors,
            accounts: accountStats
        };
    },

    // Get top performing pages
    getTopPages(userId, limit = 5, days = 30) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const accountIds = this.getAccounts(userId).map(a => a.id);
        if (accountIds.length === 0) return [];
        const placeholders = accountIds.map(() => '?').join(',');
        return db.prepare(`
            SELECT
                page_url as page,
                COUNT(*) as clicks,
                COUNT(DISTINCT visitor_id) as visitors
            FROM social_click_events
            WHERE social_account_id IN (${placeholders}) AND created_at >= ? AND page_url IS NOT NULL
            GROUP BY page_url
            ORDER BY clicks DESC
            LIMIT ?
        `).all(...accountIds, cutoff, limit);
    },

    // Get clicks over time (for line chart)
    getClicksOverTime(userId, days = 30, platform = null) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        let sql = `
            SELECT date(created_at) as date, COUNT(*) as clicks
            FROM social_click_events e
            JOIN social_accounts a ON e.social_account_id = a.id
            WHERE a.user_id = ? AND e.created_at >= ?
        `;
        const params = [userId, cutoff];
        if (platform) {
            sql += ` AND a.platform = ?`;
            params.push(platform);
        }
        sql += ` GROUP BY date(created_at) ORDER BY date ASC`;
        return db.prepare(sql).all(...params);
    },

    // Get traffic sources (referrer domains)
    getTrafficSources(userId, days = 30) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const accountIds = this.getAccounts(userId).map(a => a.id);
        if (accountIds.length === 0) return [];
        const placeholders = accountIds.map(() => '?').join(',');
        return db.prepare(`
            SELECT
                CASE
                    WHEN referrer LIKE '%instagram.com%' THEN 'Instagram'
                    WHEN referrer LIKE '%tiktok.com%' THEN 'TikTok'
                    WHEN referrer LIKE '%youtube.com%' THEN 'YouTube'
                    WHEN referrer LIKE '%linkedin.com%' THEN 'LinkedIn'
                    WHEN referrer LIKE '%google.%' THEN 'Google'
                    ELSE 'Direct / Other'
                END as source,
                COUNT(*) as visits
            FROM social_click_events
            WHERE social_account_id IN (${placeholders}) AND created_at >= ?
            GROUP BY source
            ORDER BY visits DESC
        `).all(...accountIds, cutoff);
    },

    // Get CTA performance (group by cta_location)
    getCTAPerformance(userId, days = 30) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const accountIds = this.getAccounts(userId).map(a => a.id);
        if (accountIds.length === 0) return [];
        const placeholders = accountIds.map(() => '?').join(',');
        return db.prepare(`
            SELECT
                cta_location,
                COUNT(*) as clicks,
                COUNT(DISTINCT visitor_id) as unique_visitors
            FROM social_click_events
            WHERE social_account_id IN (${placeholders}) AND created_at >= ?
            GROUP BY cta_location
            ORDER BY clicks DESC
        `).all(...accountIds, cutoff);
    }
};

module.exports = socialModel;