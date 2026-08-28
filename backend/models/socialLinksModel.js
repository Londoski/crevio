const db = require("../../database/db");


// ==========================================
// SOCIAL LINKS MODEL
// ==========================================

const socialLinksModel = {

    // ==========================================
    // CREATE SOCIAL LINK
    // ==========================================

    create(data) {

        const {
            user_id,
            platform,
            handle,
            url,
            display_order,
            is_visible
        } = data;


        const stmt = db.prepare(`

            INSERT INTO social_links (

                user_id,
                platform,
                handle,
                url,
                display_order,
                is_visible

            )

            VALUES (?, ?, ?, ?, ?, ?)

        `);


        const result = stmt.run(

            user_id,

            platform,

            handle || null,

            url,

            display_order ?? 0,

            is_visible ?? 1

        );


        return this.findById(
            result.lastInsertRowid
        );

    },


    // ==========================================
    // FIND SOCIAL LINK BY ID
    // ==========================================

    findById(id) {

        return db.prepare(`

            SELECT *

            FROM social_links

            WHERE id = ?

        `).get(id);

    },


    // ==========================================
    // GET ALL SOCIAL LINKS FOR USER
    // ==========================================

    findByUserId(user_id) {

        return db.prepare(`

            SELECT *

            FROM social_links

            WHERE user_id = ?

            ORDER BY display_order ASC, id ASC

        `).all(user_id);

    },


    // ==========================================
    // UPDATE SOCIAL LINK
    // ==========================================

    update(id, data) {

        const {
            platform,
            handle,
            url,
            display_order,
            is_visible
        } = data;


        const stmt = db.prepare(`

            UPDATE social_links

            SET

                platform = ?,

                handle = ?,

                url = ?,

                display_order = ?,

                is_visible = ?,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = ?

        `);


        const result = stmt.run(

            platform,

            handle || null,

            url,

            display_order ?? 0,

            is_visible ?? 1,

            id

        );


        if (result.changes === 0) {

            return null;

        }


        return this.findById(id);

    },


    // ==========================================
    // DELETE SOCIAL LINK
    // ==========================================

    delete(id) {

        const stmt = db.prepare(`

            DELETE FROM social_links

            WHERE id = ?

        `);


        const result = stmt.run(id);


        return result.changes > 0;

    },


    // ==========================================
    // UPDATE VISIBILITY
    // ==========================================

    setVisibility(id, is_visible) {

        const stmt = db.prepare(`

            UPDATE social_links

            SET

                is_visible = ?,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = ?

        `);


        const result = stmt.run(

            is_visible ? 1 : 0,

            id

        );


        if (result.changes === 0) {

            return null;

        }


        return this.findById(id);

    },


    // ==========================================
    // REORDER SOCIAL LINK
    // ==========================================

    updateOrder(id, display_order) {

        const stmt = db.prepare(`

            UPDATE social_links

            SET

                display_order = ?,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = ?

        `);


        const result = stmt.run(

            display_order,

            id

        );


        if (result.changes === 0) {

            return null;

        }


        return this.findById(id);

    }

};


// ==========================================
// EXPORT
// ==========================================

module.exports = socialLinksModel;