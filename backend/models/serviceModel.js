// =========================================================
// CREVIO — SERVICE MODEL
// =========================================================

const db = require("../../database/db");

const serviceModel = {

    // ---- CREATE ----
    create(data) {
        const {
            user_id, title, slug, description, category, image_url,
            pricing_type, price, min_price, max_price, currency,
            delivery_time, revisions, availability, status,
            featured, show_on_portfolio, cta_type, cta_label, cta_url
        } = data;

        const stmt = db.prepare(`
            INSERT INTO services (
                user_id, title, slug, description, category, image_url,
                pricing_type, price, min_price, max_price, currency,
                delivery_time, revisions, availability, status,
                featured, show_on_portfolio, cta_type, cta_label, cta_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            user_id, title, slug, description || null, category || null, image_url || null,
            pricing_type || 'fixed', price || null, min_price || null, max_price || null,
            currency || 'USD', delivery_time || null, revisions || null,
            availability !== undefined ? (availability ? 1 : 0) : 1,
            status || 'draft', featured ? 1 : 0, show_on_portfolio !== undefined ? (show_on_portfolio ? 1 : 0) : 1,
            cta_type || 'quote', cta_label || null, cta_url || null
        );
        return this.findById(result.lastInsertRowid);
    },

    // ---- FIND BY ID (with related data) ----
    findById(id, userId = null) {
        let sql = `SELECT * FROM services WHERE id = ?`;
        const params = [id];
        if (userId) {
            sql += ` AND user_id = ?`;
            params.push(userId);
        }
        const service = db.prepare(sql).get(...params);
        if (!service) return null;
        return this.enrichService(service);
    },

    // ---- FIND BY SLUG (public) ----
    findBySlug(slug) {
        const service = db.prepare(`SELECT * FROM services WHERE slug = ? AND status = 'published' AND show_on_portfolio = 1`).get(slug);
        if (!service) return null;
        return this.enrichService(service);
    },

    // ---- FIND BY USER (dashboard) ----
    findByUser(userId, status = null) {
        let sql = `SELECT * FROM services WHERE user_id = ?`;
        const params = [userId];
        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }
        sql += ` ORDER BY featured DESC, created_at DESC`;
        const services = db.prepare(sql).all(...params);
        return services.map(s => this.enrichService(s));
    },

    // ---- FIND PUBLIC BY USER (public portfolio) ----
    findPublicByUser(userId) {
        const services = db.prepare(`
            SELECT * FROM services
            WHERE user_id = ? AND status = 'published' AND show_on_portfolio = 1
            ORDER BY featured DESC, created_at DESC
        `).all(userId);
        return services.map(s => this.enrichService(s));
    },

    // ---- ENRICH SERVICE (add included items, FAQs, projects) ----
    enrichService(service) {
        if (!service) return null;

        // Included items
        const items = db.prepare(`
            SELECT id, item, display_order
            FROM service_included_items
            WHERE service_id = ?
            ORDER BY display_order
        `).all(service.id);
        service.included_items = items;

        // FAQs
        const faqs = db.prepare(`
            SELECT id, question, answer, display_order
            FROM service_faqs
            WHERE service_id = ?
            ORDER BY display_order
        `).all(service.id);
        service.faqs = faqs;

        // Related projects (with basic project info)
        const projects = db.prepare(`
            SELECT p.id, p.name as title, p.thumbnail_url, p.slug, p.category
            FROM service_projects sp
            JOIN projects p ON sp.project_id = p.id
            WHERE sp.service_id = ?
            ORDER BY p.created_at DESC
        `).all(service.id);
        service.projects = projects;

        // Count projects
        service.project_count = projects.length;

        return service;
    },

    // ---- UPDATE ----
    update(id, userId, data) {
        const fields = [];
        const values = [];
        const allowed = [
            'title', 'slug', 'description', 'category', 'image_url',
            'pricing_type', 'price', 'min_price', 'max_price', 'currency',
            'delivery_time', 'revisions', 'availability', 'status',
            'featured', 'show_on_portfolio', 'cta_type', 'cta_label', 'cta_url'
        ];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (fields.length === 0) return this.findById(id, userId);
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        if (userId) values.push(userId);
        const sql = `UPDATE services SET ${fields.join(', ')} WHERE id = ?${userId ? ' AND user_id = ?' : ''}`;
        db.prepare(sql).run(...values);
        return this.findById(id, userId);
    },

    // ---- DELETE ----
    delete(id, userId) {
        db.prepare(`DELETE FROM services WHERE id = ? AND user_id = ?`).run(id, userId);
    },

    // ---- INCLUDED ITEMS ----
    updateIncludedItems(serviceId, items) {
        db.prepare(`DELETE FROM service_included_items WHERE service_id = ?`).run(serviceId);
        const insert = db.prepare(`INSERT INTO service_included_items (service_id, item, display_order) VALUES (?, ?, ?)`);
        const insertMany = db.transaction((itemsArr) => {
            itemsArr.forEach((item, idx) => {
                insert.run(serviceId, item, idx);
            });
        });
        if (items && items.length) insertMany(items);
        return this.findById(serviceId);
    },

    // ---- FAQS ----
    updateFaqs(serviceId, faqs) {
        db.prepare(`DELETE FROM service_faqs WHERE service_id = ?`).run(serviceId);
        const insert = db.prepare(`INSERT INTO service_faqs (service_id, question, answer, display_order) VALUES (?, ?, ?, ?)`);
        const insertMany = db.transaction((faqsArr) => {
            faqsArr.forEach((f, idx) => {
                insert.run(serviceId, f.question, f.answer, idx);
            });
        });
        if (faqs && faqs.length) insertMany(faqs);
        return this.findById(serviceId);
    },

    // ---- PROJECTS RELATIONSHIP ----
    updateProjects(serviceId, projectIds) {
        db.prepare(`DELETE FROM service_projects WHERE service_id = ?`).run(serviceId);
        const insert = db.prepare(`INSERT INTO service_projects (service_id, project_id) VALUES (?, ?)`);
        const insertMany = db.transaction((ids) => {
            ids.forEach(id => insert.run(serviceId, id));
        });
        if (projectIds && projectIds.length) insertMany(projectIds);
        return this.findById(serviceId);
    },

    // ---- COUNT STATS FOR USER ----
    getStats(userId) {
        const active = db.prepare(`SELECT COUNT(*) as count FROM services WHERE user_id = ? AND status = 'published'`).get(userId)?.count || 0;
        const draft = db.prepare(`SELECT COUNT(*) as count FROM services WHERE user_id = ? AND status = 'draft'`).get(userId)?.count || 0;
        const featured = db.prepare(`SELECT COUNT(*) as count FROM services WHERE user_id = ? AND featured = 1`).get(userId)?.count || 0;
        return { active, draft, featured };
    },

    // ---- GENERATE UNIQUE SLUG ----
    generateSlug(title, userId) {
        let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!slug) slug = 'service';
        let uniqueSlug = slug;
        let counter = 1;
        while (db.prepare(`SELECT id FROM services WHERE slug = ? AND user_id = ?`).get(uniqueSlug, userId)) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }
        return uniqueSlug;
    }
};

module.exports = serviceModel;