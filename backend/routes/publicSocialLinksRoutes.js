const express = require("express");

const db = require("../../database/db");

const router = express.Router();


// ==========================================
// GET PUBLIC SOCIAL LINKS
// ==========================================
//
// PUBLIC ROUTE
// No authentication required.
//
// Returns only social links that are visible.
//
// ==========================================

router.get(
    "/social-links",
    (req, res) => {

        try {

            const socialLinks = db.prepare(`

                SELECT

                    id,

                    platform,

                    handle,

                    url,

                    display_order,

                    is_visible

                FROM social_links

                WHERE is_visible = 1

                ORDER BY
                    display_order ASC,
                    id ASC

            `).all();


            return res.status(200).json({

                success: true,

                count:
                    socialLinks.length,

                socialLinks

            });


        } catch (error) {

            console.error(
                "❌ Public social links error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load social links."

            });

        }

    }
);


module.exports = router;