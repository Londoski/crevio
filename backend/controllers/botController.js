// =========================================================
// CREVIO — BOT CONTROLLER
// File: backend/controllers/botController.js
// Ratings + share tracking for the bot page.
// =========================================================

const db = require("../../database/db");

function safeGet(sql, ...p) { try { return db.prepare(sql).get(...p); } catch { return null; } }
function safeAll(sql, ...p) { try { return db.prepare(sql).all(...p); } catch { return []; } }
function hasTable(n) { try { return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(n); } catch { return false; } }

// =========================================================
// POST /api/bot/rate
// Body: { message_id, message_content, rating: "good"|"bad" }
// Upsert — one rating per (user, message). Sending same rating again clears it.
// =========================================================
exports.rate = (req, res) => {
    try {
        const uid = req.user.id;
        const { message_id, message_content, rating } = req.body;
        if (!message_id) return res.status(400).json({ success: false, message: "message_id required" });
        if (!["good","bad"].includes(rating)) return res.status(400).json({ success: false, message: "rating must be 'good' or 'bad'" });
        if (!hasTable("bot_ratings")) return res.status(500).json({ success: false, message: "Run migration first" });

        const existing = safeGet(
            "SELECT * FROM bot_ratings WHERE user_id = ? AND message_id = ?",
            uid, message_id
        );

        // Same rating → toggle off
        if (existing && existing.rating === rating) {
            db.prepare("DELETE FROM bot_ratings WHERE id = ?").run(existing.id);
            return res.json({ success: true, rating: null, cleared: true });
        }

        if (existing) {
            db.prepare(
                "UPDATE bot_ratings SET rating = ?, message_content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).run(rating, message_content || existing.message_content || "", existing.id);
        } else {
            db.prepare(
                "INSERT INTO bot_ratings (user_id, message_id, message_content, rating) VALUES (?, ?, ?, ?)"
            ).run(uid, message_id, message_content || "", rating);
        }
        res.json({ success: true, rating });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// =========================================================
// GET /api/bot/ratings/:messageId
// =========================================================
exports.getRating = (req, res) => {
    try {
        const uid = req.user.id;
        const row = safeGet(
            "SELECT rating FROM bot_ratings WHERE user_id = ? AND message_id = ?",
            uid, req.params.messageId
        );
        res.json({ success: true, rating: row ? row.rating : null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// =========================================================
// POST /api/bot/rate
// Accepts: { rating, message, message_id, prompt,
//            conversation_id, user_plan, feedback_text }
// Upserts on (user_id, message_id) so text feedback can
// arrive in a 2nd call after the rating.
// Data is retained for the future Crevio Management System.
// =========================================================
exports.rate = (req, res) => {
    try {
        const userId = req.user && req.user.id;
        const {
            rating,
            message,
            message_id,
            prompt,
            conversation_id,
            user_plan,
            feedback_text
        } = req.body || {};

        if (rating !== "good" && rating !== "bad") {
            return res.status(400).json({ success: false, message: "rating must be 'good' or 'bad'" });
        }

        const msgId = (message_id != null && String(message_id).trim()) ? String(message_id) : null;

        // Try to find an existing row for this user + message
        let existing = null;
        if (userId && msgId) {
            try {
                existing = db.prepare(
                    "SELECT id FROM bot_ratings WHERE user_id = ? AND message_id = ? LIMIT 1"
                ).get(userId, msgId);
            } catch (e) { existing = null; }
        }

        if (existing) {
            // Update (feedback_text arrives in 2nd call)
            const fields = [];
            const values = [];
            if (rating)         { fields.push("rating = ?");         values.push(rating); }
            if (message != null){ fields.push("message = ?");        values.push(String(message).slice(0, 8000)); }
            if (prompt != null) { fields.push("prompt = ?");         values.push(String(prompt).slice(0, 4000)); }
            if (conversation_id != null) { fields.push("conversation_id = ?"); values.push(conversation_id); }
            if (user_plan)      { fields.push("user_plan = ?");      values.push(user_plan); }
            if (feedback_text != null) { fields.push("feedback_text = ?"); values.push(String(feedback_text).slice(0, 4000)); }
            fields.push("updated_at = CURRENT_TIMESTAMP");
            values.push(existing.id);
            db.prepare(`UPDATE bot_ratings SET ${fields.join(", ")} WHERE id = ?`).run(...values);
            return res.json({ success: true, id: existing.id, updated: true });
        }

        // Insert new row
        const r = db.prepare(`
            INSERT INTO bot_ratings
                (user_id, message_id, rating, message, prompt,
                 conversation_id, user_plan, feedback_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
            userId || null,
            msgId,
            rating,
            message ? String(message).slice(0, 8000) : null,
            prompt ? String(prompt).slice(0, 4000) : null,
            conversation_id || null,
            user_plan || null,
            feedback_text ? String(feedback_text).slice(0, 4000) : null
        );

        res.json({ success: true, id: r.lastInsertRowid });
    } catch (err) {
        console.error("bot.rate error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};

// =========================================================
// GET /api/bot/ratings?message_ids=id1,id2,id3
// Batch-fetch the current user's ratings for a set of
// message IDs — used by the bot page to restore the
// thumbs-up/down state on reload.
// Full history is retained for the future Crevio
// Management System.
// =========================================================
exports.getRatingsBatch = (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const raw = (req.query.message_ids || "").toString();
        const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
        if (!ids.length) {
            return res.json({ success: true, ratings: {} });
        }

        // Cap to avoid abuse
        const safeIds = ids.slice(0, 200);
        const placeholders = safeIds.map(() => "?").join(",");

        let rows = [];
        try {
            rows = db.prepare(
                `SELECT message_id, rating, feedback_text, updated_at
                 FROM bot_ratings
                 WHERE user_id = ? AND message_id IN (${placeholders})`
            ).all(userId, ...safeIds);
        } catch (e) {
            rows = [];
        }

        const ratings = {};
        rows.forEach(function (r) {
            ratings[r.message_id] = {
                rating: r.rating,
                feedback_text: r.feedback_text || null,
                updated_at: r.updated_at || null
            };
        });

        res.json({ success: true, ratings: ratings });
    } catch (err) {
        console.error("bot.getRatingsBatch error:", err);
        res.status(500).json({ success: false, message: "Failed", error: err.message });
    }
};
// =========================================================
// POST /api/bot/share
// Body: { message_id, message_content, conversation_id }
// Sends the bot response as a creator message to the chosen conversation.
// =========================================================
exports.share = (req, res) => {
    try {
        const uid = req.user.id;
        const { message_id, message_content, conversation_id } = req.body;
        if (!conversation_id) return res.status(400).json({ success: false, message: "conversation_id required" });
        if (!message_content || !message_content.trim()) return res.status(400).json({ success: false, message: "message_content required" });

        const conv = safeGet("SELECT * FROM conversations WHERE id = ? AND creator_id = ?", conversation_id, uid);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });

        const r = db.prepare(
            "INSERT INTO messages (conversation_id, sender_type, content, created_at) VALUES (?, 'creator', ?, CURRENT_TIMESTAMP)"
        ).run(conversation_id, message_content.trim());

        try { db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversation_id); } catch {}

        if (hasTable("bot_shares")) {
            try {
                db.prepare(
                    "INSERT INTO bot_shares (user_id, message_id, conversation_id) VALUES (?, ?, ?)"
                ).run(uid, message_id || null, conversation_id);
            } catch {}
        }

        res.json({ success: true, message_id: r.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// =========================================================
// POST /api/bot/chat
// Body: { message: string, history: [{role, content}] }
// Calls Gemini and returns { reply: string }
// =========================================================

// =========================================================
// TRAINING — user-specific system prompt construction
// =========================================================
function safeRows(sql, ...p) { try { return db.prepare(sql).all(...p); } catch (e) { return []; } }

function getTraining(userId) {
    const row = (() => { try { return db.prepare("SELECT * FROM bot_training WHERE user_id = ?").get(userId); } catch (e) { return null; } })();
    const user = (() => { try { return db.prepare("SELECT display_name, username, primary_profession, bio, location FROM users WHERE id = ?").get(userId); } catch (e) { return null; } })();
    return { training: row || null, user: user || null };
}

function buildWorkspaceContext(userId, t) {
    if (!t) return "";
    const parts = [];

    if (t.include_portfolio) {
        try {
            const prof = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
            if (prof && (prof.bio || prof.display_name || prof.primary_profession)) {
                parts.push("PROFILE:\n" +
                    (prof.display_name ? "  Name: " + prof.display_name + "\n" : "") +
                    (prof.primary_profession ? "  Profession: " + prof.primary_profession + "\n" : "") +
                    (prof.location ? "  Location: " + prof.location + "\n" : "") +
                    (prof.bio ? "  Bio: " + String(prof.bio).slice(0, 500) + "\n" : "")
                );
            }
        } catch (e) {}
    }

    if (t.include_projects) {
        const rows = safeRows("SELECT name, description FROM projects ORDER BY id DESC LIMIT 6");
        if (rows.length) {
            parts.push("RECENT PROJECTS:\n" + rows.map(r =>
                "  • " + (r.name || "Untitled") + (r.description ? ": " + String(r.description).slice(0, 120) : "")
            ).join("\n"));
        }
    }

    if (t.include_services) {
        const rows = safeRows("SELECT title, description FROM services ORDER BY id DESC LIMIT 6");
        if (rows.length) {
            parts.push("SERVICES OFFERED:\n" + rows.map(r =>
                "  • " + (r.title || "Untitled") + (r.description ? ": " + String(r.description).slice(0, 120) : "")
            ).join("\n"));
        }
    }

    if (t.include_skills) {
        const rows = safeRows("SELECT name FROM skills ORDER BY id DESC LIMIT 20");
        if (rows.length) {
            parts.push("SKILLS:\n  " + rows.map(r => r.name).filter(Boolean).join(", "));
        }
    }

    return parts.length ? "\n## User's workspace context (authoritative — use when relevant)\n" + parts.join("\n\n") + "\n" : "";
}

function buildStyleRules(t) {
    if (!t) return "";
    const lines = [];

    const tone = (t.tone || "professional").toLowerCase();
    const toneMap = {
        professional: "Clear, confident, and professional — like a trusted creative director.",
        casual:       "Relaxed and friendly, but still useful. Light contractions are fine. No slang spam.",
        direct:       "Blunt and efficient. Short sentences. No hedging. Get to the point.",
        warm:         "Warm, encouraging, human. Acknowledge effort. Still practical."
    };
    if (toneMap[tone]) lines.push("- Tone: " + toneMap[tone]);

    const len = (t.response_length || "balanced").toLowerCase();
    const lenMap = {
        brief:    "Keep replies short. 1–3 sentences unless the user asks for more detail.",
        balanced: "Aim for concise but complete answers. Paragraph or short list is fine.",
        detailed: "Give thorough, structured answers with examples when useful."
    };
    if (lenMap[len]) lines.push("- Length: " + lenMap[len]);

    return lines.length ? "\n## Style rules (user-trained)\n" + lines.join("\n") + "\n" : "";
}

function buildTrainingBlock(training, user) {
    if (!training) return "";
    const lines = [];

    const botName   = (training.bot_name || "CrevioBot").trim();
    const userName  = (training.user_name || (user && (user.display_name || user.username)) || "").trim();
    const profession= (training.profession || (user && user.primary_profession) || "").trim();
    const about     = (training.about_user || "").trim();
    const custom    = (training.custom_instructions || "").trim();

    if (botName)    lines.push("- Your name is " + botName + ". If the user asks who you are, say your name is " + botName + " — Crevio's assistant.");
    if (userName)   lines.push("- The user's name is " + userName + ". Address them by name naturally, not on every line.");
    if (profession) lines.push("- The user works as: " + profession + ".");
    if (about)      lines.push("- About the user (from their own training input): " + about.slice(0, 800));
    if (custom)     lines.push("- User's custom instructions (highest priority — obey these):\n" + custom.slice(0, 1500));

    return lines.length ? "\n## Trained context for this user\n" + lines.join("\n") + "\n" : "";
}


// =========================================================
// WORKSPACE INTELLIGENCE
// Real DB queries — no fake data, no invented fields.
// =========================================================
function buildWorkspaceSnapshot(userId) {
    const s = {
        profile:   {},
        skills:    {},
        services:  {},
        projects:  {},
        portfolio: {},
        messages:  {},
        social:    {},
        plan:      {}
    };

    // ---- Profile ----
    try {
        const u = db.prepare("SELECT display_name, bio, profile_image, location, primary_profession, specialties, plan, email_verified FROM users WHERE id = ?").get(userId);
        if (u) {
            s.profile = {
                display_name: u.display_name || "",
                has_bio: !!((u.bio || "").trim()),
                bio_length: (u.bio || "").length,
                has_photo: !!((u.profile_image || "").trim()),
                location: u.location || "",
                profession: u.primary_profession || "",
                specialties: u.specialties || "",
                email_verified: !!u.email_verified
            };
            s.plan = { plan: u.plan || "free" };
        }
    } catch (e) {}

    // ---- Skills ----
    try {
        const n = db.prepare("SELECT COUNT(*) AS c FROM creator_skills WHERE user_id = ?").get(userId)?.c || 0;
        s.skills = { attached: n };
    } catch (e) {}

    // ---- Services ----
    try {
        const rows = db.prepare("SELECT id, title, description, status, image_url, price FROM services WHERE user_id = ?").all(userId);
        s.services = {
            total: rows.length,
            published: rows.filter(r => r.status === "published" || r.status === "active").length,
            drafts: rows.filter(r => r.status === "draft").length,
            without_description: rows.filter(r => !(r.description || "").trim()).length,
            without_image: rows.filter(r => !(r.image_url || "").trim()).length,
            titles: rows.slice(0, 6).map(r => r.title).filter(Boolean)
        };
    } catch (e) {}

    // ---- Projects ----
    try {
        const rows = db.prepare("SELECT id, name, description, thumbnail_url, published, client_name, role, project_year FROM projects WHERE user_id = ?").all(userId);
        const mediaRows = (() => {
            try { return db.prepare("SELECT project_id, COUNT(*) AS c FROM project_media WHERE user_id = ? GROUP BY project_id").all(userId); }
            catch (e) { return []; }
        })();
        const withMedia = new Set(mediaRows.map(m => m.project_id));
        s.projects = {
            total: rows.length,
            published: rows.filter(r => r.published === 1).length,
            drafts: rows.filter(r => r.published !== 1).length,
            without_description: rows.filter(r => !(r.description || "").trim()).length,
            without_thumbnail: rows.filter(r => !(r.thumbnail_url || "").trim()).length,
            without_media: rows.filter(r => !withMedia.has(r.id)).length,
            titles: rows.slice(0, 8).map(r => r.name).filter(Boolean)
        };
    } catch (e) {}

    // ---- Portfolio config ----
    try {
        const p = db.prepare("SELECT published, template_id FROM portfolio_config WHERE user_id = ?").get(userId);
        s.portfolio = p ? { exists: true, published: p.published === 1, template_id: p.template_id }
                        : { exists: false, published: false };
    } catch (e) {}

    // ---- Messages ----
    try {
        const convs = db.prepare("SELECT id, client_name, status FROM conversations WHERE creator_id = ?").all(userId);
        const unanswered = (() => {
            try {
                return db.prepare(
                    "SELECT COUNT(DISTINCT c.id) AS n FROM conversations c " +
                    "JOIN messages m ON m.conversation_id = c.id " +
                    "WHERE c.creator_id = ? AND m.sender_type = 'client' AND m.read_at IS NULL"
                ).get(userId)?.n || 0;
            } catch (e) { return 0; }
        })();
        s.messages = {
            total: convs.length,
            unanswered: unanswered,
            recent_clients: convs.slice(0, 5).map(c => c.client_name).filter(Boolean)
        };
    } catch (e) {}

    // ---- Social ----
    try {
        const links = db.prepare("SELECT platform FROM social_links WHERE user_id = ?").all(userId);
        s.social = { count: links.length, platforms: links.map(l => l.platform).filter(Boolean) };
    } catch (e) {}

    return s;
}

function detectIssues(s) {
    const issues = [];
    const push = function (id, area, severity, title, detail, action, path) {
        issues.push({ id: id, area: area, severity: severity, title: title, detail: detail, action: action, path: path });
    };

    // Profile
    if (!s.profile.has_bio) {
        push("no_bio", "profile", "high", "Your bio is empty",
             "Visitors land on your portfolio and see nothing about you. A short, focused bio makes you memorable and builds trust.",
             "Write a 2-3 sentence bio about what you do and who you help.",
             "/dashboard/pages/profile.html");
    }
    if (!s.profile.has_photo) {
        push("no_photo", "profile", "medium", "No profile photo",
             "A professional photo raises credibility significantly — most visitors judge a portfolio in the first 3 seconds.",
             "Upload a clean headshot or a strong graphic avatar.",
             "/dashboard/pages/profile.html");
    }
    if (!s.profile.profession) {
        push("no_profession", "profile", "medium", "Profession not set",
             "Without a profession, your workspace can't tailor itself to your work — and visitors won't know what you do at a glance.",
             "Set your primary profession (e.g. Video Editor, Brand Designer).",
             "/dashboard/pages/profile.html");
    }
    if (!s.profile.location) {
        push("no_location", "profile", "low", "Location not set",
             "Location helps local clients find you and adds polish to your portfolio.",
             "Add your city or region.",
             "/dashboard/pages/profile.html");
    }

    // Skills
    if (s.skills.attached === 0) {
        push("no_skills", "skills", "high", "No skills attached yet",
             "Skills power your project and service matching. Without them, your work can't be discovered by what you actually do.",
             "Add at least 5 skills that match your real work.",
             "/dashboard/pages/skills.html");
    } else if (s.skills.attached < 5) {
        push("few_skills", "skills", "medium", "Only " + s.skills.attached + " skill attached",
             "Profiles with 5-10 well-chosen skills perform better and get more accurate client matches.",
             "Add a few more skills — aim for at least 5.",
             "/dashboard/pages/skills.html");
    }

    // Services
    if (s.services.total === 0) {
        push("no_services", "services", "high", "You have no services yet",
             "Services tell clients exactly what you offer and how to buy. Without them, visitors have nothing to inquire about.",
             "Create your first service — even a simple one works as a starting point.",
             "/dashboard/pages/services.html");
    } else {
        if (s.services.drafts > 0) {
            push("draft_services", "services", "medium", s.services.drafts + " draft service(s)",
                 "Drafts are invisible to clients. Publish them when they're ready to be shown.",
                 "Review and publish your drafts.",
                 "/dashboard/pages/services.html");
        }
        if (s.services.without_description > 0) {
            push("services_no_desc", "services", "medium", s.services.without_description + " service(s) missing a description",
                 "Descriptions help clients understand the value and scope of each service.",
                 "Add a short description to each service.",
                 "/dashboard/pages/services.html");
        }
    }

    // Projects
    if (s.projects.total === 0) {
        push("no_projects", "projects", "high", "You have no projects",
             "Projects are the single most important part of any portfolio — they show real work, not claims.",
             "Add your best 3-6 projects first.",
             "/dashboard/pages/projects.html");
    } else {
        if (s.projects.drafts > 0) {
            push("draft_projects", "projects", "medium", s.projects.drafts + " unpublished project(s)",
                 "Drafts aren't visible on your portfolio. Publishing them grows your showcased body of work.",
                 "Review and publish your drafts.",
                 "/dashboard/pages/projects.html");
        }
        if (s.projects.without_description > 0) {
            push("projects_no_desc", "projects", "medium", s.projects.without_description + " project(s) without a description",
                 "A one-paragraph description of each project makes visitors trust your process.",
                 "Add a short description to each project.",
                 "/dashboard/pages/projects.html");
        }
        if (s.projects.without_media > 0) {
            push("projects_no_media", "projects", "high", s.projects.without_media + " project(s) with no media",
                 "Projects without images or video don't get viewed. Media IS the portfolio.",
                 "Upload at least one image or video per project.",
                 "/dashboard/pages/media.html");
        }
        if (s.projects.without_thumbnail > 0) {
            push("projects_no_thumb", "projects", "low", s.projects.without_thumbnail + " project(s) without thumbnail",
                 "Thumbnails make the project grid look polished and drive more clicks.",
                 "Set a thumbnail for each project.",
                 "/dashboard/pages/projects.html");
        }
    }

    // Portfolio
    if (!s.portfolio.published) {
        push("portfolio_unpublished", "portfolio", "high", "Your portfolio isn't published",
             "Everything you've built is invisible until you publish. This is the final step that makes your work live.",
             "Review and publish your portfolio.",
             "/dashboard/pages/portfolio.html");
    }

    // Messages
    if (s.messages.unanswered > 0) {
        push("unanswered_msgs", "messages", "high", s.messages.unanswered + " unanswered client message(s)",
             "Clients who don't hear back within 24 hours usually move on.",
             "Reply to your inquiries.",
             "/dashboard/pages/messages.html");
    }

    // Social
    if (s.social.count === 0) {
        push("no_social", "social", "low", "No social links",
             "Social profiles build trust and give visitors another way to reach you.",
             "Add at least your top 2 platforms.",
             "/dashboard/pages/social-links.html");
    }

    const order = { high: 0, medium: 1, low: 2 };
    issues.sort(function (a, b) { return (order[a.severity] || 9) - (order[b.severity] || 9); });
    return issues;
}

function formatSnapshotForPrompt(s, issues) {
    const lines = [];
    lines.push("## Current workspace state (authoritative, from DB)");

    const p = s.profile;
    const pParts = [];
    if (p.display_name) pParts.push("name=" + p.display_name);
    if (p.profession)   pParts.push("profession=" + p.profession);
    if (p.location)     pParts.push("location=" + p.location);
    pParts.push("bio=" + (p.has_bio ? "SET (" + p.bio_length + " chars)" : "EMPTY"));
    pParts.push("photo=" + (p.has_photo ? "SET" : "EMPTY"));
    lines.push("- Profile: " + pParts.join(", "));

    lines.push("- Skills attached: " + s.skills.attached);
    lines.push("- Services: " + s.services.total + " total (" + s.services.published + " published, " + s.services.drafts + " draft)");
    lines.push("- Projects: " + s.projects.total + " total (" + s.projects.published + " published, " + s.projects.drafts + " draft, " + s.projects.without_media + " without media)");
    lines.push("- Portfolio: " + (s.portfolio.published ? "PUBLISHED" : "NOT PUBLISHED"));
    lines.push("- Messages: " + s.messages.total + " conversations (" + s.messages.unanswered + " unanswered)");
    lines.push("- Social links: " + s.social.count);
    lines.push("- Plan: " + (s.plan.plan || "free"));

    if (issues.length) {
        lines.push("");
        lines.push("## Detected issues (real, prioritized)");
        issues.slice(0, 8).forEach(function (i) {
            lines.push("- [" + i.severity.toUpperCase() + "] " + i.title + " — " + i.detail);
        });
    }

    lines.push("");
    lines.push("Instructions: When the user asks what to fix, what to work on next, how to improve, or anything about their workspace — reference this data. Do NOT invent issues not listed. If everything is complete, say so clearly. When suggesting a fix, point the user to the specific area (e.g. 'Open Services to add your first offer').");

    return lines.join("\n");
}

function buildWorkspaceBlock(userId, training) {
    // Business-only feature — do not inject workspace context for Free/Pro
    if (getPlanName(userId) !== "business") return "";
    if (training &&
        training.include_portfolio === 0 &&
        training.include_projects === 0 &&
        training.include_services === 0 &&
        training.include_skills === 0) {
        return "";
    }
    try {
        const snap = buildWorkspaceSnapshot(userId);
        const issues = detectIssues(snap);
        return "\n" + formatSnapshotForPrompt(snap, issues) + "\n";
    } catch (e) {
        return "";
    }
}

// =========================================================
// MEMORY & BIO RULES (always included in system prompt)
// =========================================================
function buildMemoryRulesBlock() {
    return [
        "",
        "## Writing bios, descriptions, or content about the user",
        "When the user asks you to write a bio, service description, project description, or other content about THEM:",
        "- First check the 'What you remember about this user' section in your context.",
        "- If you have enough (name, profession/niche, location, differentiator), write it directly.",
        "- If you are missing key info, ASK one focused question at a time. Do NOT write a generic filler bio.",
        "- Never invent facts. Never fill gaps with placeholder content like 'passionate creator' or 'innovative storyteller'.",
        "- If the user already has a saved bio in the workspace context, use that as source material.",
        "",
        "## Remembering facts about the user",
        "When the user tells you a DURABLE fact about themselves (name, profession, niche, location, background, tools, style preferences, notable clients, education, languages, goals), emit a memory block at the VERY END of your reply:",
        "",
        "[MEMORY_START]{\"facts\":[{\"key\":\"name\",\"value\":\"Joseph\",\"category\":\"identity\"}]}[MEMORY_END]",
        "",
        "Rules for the memory block:",
        "- Only durable facts (things that stay true over time). Never extract moods, temporary states, or things the user did not directly state.",
        "- Only emit when you learn something NEW or UPDATED. Do not re-emit facts already in your context.",
        "- Multiple facts example: {\"facts\":[{\"key\":\"name\",\"value\":\"Joseph\",\"category\":\"identity\"},{\"key\":\"profession\",\"value\":\"video editor\",\"category\":\"work\"}]}",
        "- Valid categories: identity, work, location, preference, background, contact, general.",
        "- Never mention or acknowledge this block to the user. It is stripped before display.",
        "- Only emit the block when you actually learned new facts. Otherwise omit it entirely.",
        ""
    ].join("\n");
}

function buildSystemPrompt(userId) {
    const { training, user } = getTraining(userId);

    let base = SYSTEM_PROMPT;
    // If user customized the bot's name, we say so explicitly
    const botName = (training && training.bot_name) ? training.bot_name : "CrevioBot";
    base = base.replace(/You are CrevioBot/g, "You are " + botName)
               .replace(/Your name is CrevioBot\./g, "Your name is " + botName + ".")
               .replace(/I am CrevioBot, your personal AI assistant/g, "I am " + botName + ", your personal AI assistant");

    return base
        + buildTrainingBlock(training, user)
        + getMemoryForPrompt(userId)
        + buildStyleRules(training)
        + buildMemoryRulesBlock()
        + buildWorkspaceBlock(userId, training);
}


function getPlanName(userId) {
    try {
        var sub = db.prepare("SELECT plan FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
        if (sub && sub.plan) return String(sub.plan).toLowerCase();
        var u = db.prepare("SELECT plan FROM users WHERE id = ?").get(userId);
        if (u && u.plan) return String(u.plan).toLowerCase();
    } catch (e) {}
    return "free";
}

function requireBusinessPlan(req, res) {
    var plan = getPlanName(req.user.id);
    if (plan !== "business") {
        res.status(403).json({
            success: false,
            code: "business_only",
            plan: plan,
            message: "Workspace intelligence is a Business plan feature. Upgrade to unlock full workspace checks, issue detection, and AI-guided improvements."
        });
        return false;
    }
    return true;
}

// =========================================================
// BOT MEMORY
// =========================================================
function getMemory(userId) {
    try {
        return db.prepare("SELECT key, value, category FROM bot_memory WHERE user_id = ? ORDER BY category, key").all(userId);
    } catch (e) { return []; }
}

function upsertFacts(userId, facts, convId) {
    if (!Array.isArray(facts) || !facts.length) return 0;
    var saved = 0;
    var allowed = ["identity","work","location","preference","background","contact","general"];
    for (var i = 0; i < facts.length; i++) {
        var f = facts[i];
        if (!f || !f.key || !f.value) continue;
        var key = String(f.key).toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").slice(0, 60);
        var value = String(f.value).trim().slice(0, 500);
        var category = allowed.indexOf(String(f.category||"general").toLowerCase()) >= 0 ? f.category.toLowerCase() : "general";
        if (!key || !value) continue;
        try {
            db.prepare("INSERT INTO bot_memory (user_id, key, value, category, source_conversation_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, category = excluded.category, updated_at = CURRENT_TIMESTAMP")
                .run(userId, key, value, category, convId || null);
            saved++;
        } catch (e) {}
    }
    return saved;
}

function resetMemory(userId) {
    try {
        var r = db.prepare("DELETE FROM bot_memory WHERE user_id = ?").run(userId);
        return r.changes || 0;
    } catch (e) { return 0; }
}

function getMemoryForPrompt(userId) {
    var rows = getMemory(userId);
    if (!rows.length) return "";
    var lines = ["## What you remember about this user (from past conversations)"];
    var byCat = {};
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!byCat[r.category]) byCat[r.category] = [];
        byCat[r.category].push("- " + r.key + ": " + r.value);
    }
    var cats = Object.keys(byCat);
    for (var j = 0; j < cats.length; j++) {
        lines.push("");
        lines.push("" + cats[j] + ":");
        lines = lines.concat(byCat[cats[j]]);
    }
    lines.push("");
    lines.push("Use these facts naturally when relevant. Never invent facts about the user. If the user asks you to write something about them but you lack a key detail, ask for it first — do not make it up.");
    return "\n" + lines.join("\n") + "\n";
}

// Parse the memory block the AI emits at the end of a reply.
// Format: [MEMORY_START]{"facts":[{"key":"...","value":"...","category":"..."}]}[MEMORY_END]
function extractMemoryFromText(text) {
    if (!text) return { clean: text || "", facts: [] };
    var START = "[MEMORY_START]";
    var END = "[MEMORY_END]";
    var startIdx = text.indexOf(START);
    if (startIdx < 0) return { clean: text, facts: [] };
    var endIdx = text.indexOf(END, startIdx);
    if (endIdx < 0) return { clean: text.slice(0, startIdx).trimEnd(), facts: [] };
    var jsonStr = text.slice(startIdx + START.length, endIdx).trim();
    var clean = (text.slice(0, startIdx) + text.slice(endIdx + END.length)).trim();
    var facts = [];
    try {
        var parsed = JSON.parse(jsonStr);
        if (parsed && Array.isArray(parsed.facts)) facts = parsed.facts;
    } catch (e) {}
    return { clean: clean, facts: facts };
}

const SYSTEM_PROMPT = [
    "You are CrevioBot — the intelligent assistant built into Crevio, a portfolio platform for creators, designers, editors, developers, and freelancers.",
    "",
    "## Identity",
    "Your name is CrevioBot. You are NOT ChatGPT, Gemini, or any other assistant. You are CrevioBot.",
    "You help the user improve their professional presence: portfolio copy, project descriptions, service descriptions, bios, pricing guidance, client replies, content ideas, positioning, and general creative/business advice.",
    "",
    "## Tone",
    "Warm, sharp, and practical. You sound like a smart creative director who respects the user's time.",
    "Short paragraphs. Clear structure. No filler. No corporate jargon.",
    "Use plain text — no markdown headers (###). For lists use '•'. For emphasis use **bold** only when genuinely useful.",
    "",
    "## Greetings",
    "If the user greets you (hello, hi, hey, good morning, etc.), respond with a short, warm introduction:",
    "  1. Introduce yourself: 'I am CrevioBot, your personal AI assistant.'",
    "  2. Ask what they are working on.",
    "  3. Optionally list 3–5 things you can help with (portfolio review, project descriptions, service copy, content ideas, client replies) — as a short bullet list.",
    "Keep it under 6 lines total. Do not ramble.",
    "",
    "## Behavior",
    "- When the user shares a client message, analyze it: tone, intent, missing info (budget, timeline, scope), and suggest a ready-to-send reply.",
    "- When drafting replies, format them as ready-to-send text the user can copy.",
    "- Never invent facts about the user's portfolio that you don't know.",
    "- If the user's request is vague, ask one focused clarifying question — not a list.",
    "- Do not use emojis unless the user does first.",
    "- Never say 'As an AI language model' or similar disclaimers — the UI already shows one."
].join("\n");

const CANONICAL_GREETING = [
    "I am CrevioBot, your personal AI assistant — here to help you build a sharper portfolio and handle the busy work around it.",
    "",
    "A few things I can help with:",
    "• Review and improve your portfolio",
    "• Write or rewrite project and service descriptions",
    "• Draft replies to client inquiries",
    "• Suggest content ideas and positioning",
    "• Brainstorm pricing and offerings",
    "",
    "What are you working on today?"
].join("\n");


// =========================================================
// GREETING DETECTION + SAFETY FALLBACK
// =========================================================
function isGreeting(text) {
    const t = String(text || "").toLowerCase().trim().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ");
    if (!t) return false;
    const words = t.split(" ");
    if (words.length > 4) return false;
    const greetings = ["hi","hey","hello","yo","sup","hiya","howdy","greetings","morning","afternoon","evening","good morning","good afternoon","good evening","hi there","hello there","hey there"];
    return greetings.some(g => t === g || t.startsWith(g + " "));
}

function pickGreeting() {
    // Rotate a few so it doesn't feel scripted
    const variants = [
        CANONICAL_GREETING,
        CANONICAL_GREETING,
        CANONICAL_GREETING,
        "Hi — I am CrevioBot, your personal AI assistant.\n\nI can help with portfolio reviews, project descriptions, service copy, client replies, and content ideas.\n\nWhat are you working on today?"
    ];
    return variants[Math.floor(Math.random() * variants.length)];
}

function isTooShortReply(text) {
    const t = String(text || "").trim();
    if (!t) return true;
    if (t.length < 8) return true;
    // All punctuation / no letters
    if (!/[a-zA-Z]/.test(t)) return true;
    return false;
}


function buildGeminiContents(history, userMessage) {
    const contents = [];
    // Gemini requires alternating user/model turns and starts with user.
    const filtered = (history || []).filter(h => h && h.role && h.content).slice(-10);
    for (const h of filtered) {
        const role = (h.role === "assistant" || h.role === "bot" || h.role === "model") ? "model" : "user";
        // Merge same-role adjacency
        const last = contents[contents.length - 1];
        if (last && last.role === role) {
            last.parts[0].text += "\n" + h.content;
        } else {
            contents.push({ role, parts: [{ text: String(h.content) }] });
        }
    }
    // Append the new user message
    const last = contents[contents.length - 1];
    if (last && last.role === "user") {
        last.parts[0].text += "\n" + userMessage;
    } else {
        contents.push({ role: "user", parts: [{ text: userMessage }] });
    }
    // Gemini requires the sequence to start with a user turn
    if (!contents.length || contents[0].role !== "user") {
        contents.unshift({ role: "user", parts: [{ text: userMessage }] });
    }
    return contents;
}

async function callGemini(userMessage, history) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                model + ":generateContent?key=" + encodeURIComponent(apiKey);

    const body = {
        systemInstruction: { parts: [{ text: buildSystemPrompt(uid) }] },
        contents: buildGeminiContents(history, userMessage),
        generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 400,
            topP: 0.95
        }
    };

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
        const msg = (data && data.error && data.error.message) || ("Gemini error " + resp.status);
        throw new Error(msg);
    }

    const candidates = (data && data.candidates) || [];
    if (!candidates.length) throw new Error("No response from Gemini");
    const parts = (candidates[0].content && candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || "").join("").trim();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
}

exports.chat = async (req, res) => {
    try {
        const uid = req.user.id;
        const userMessage = (req.body.message || "").trim();
        const conversationId = req.body.conversation_id ? parseInt(req.body.conversation_id, 10) : null;

        if (!userMessage) return res.status(400).json({ success: false, message: "message required" });
        if (userMessage.length > 8000) return res.status(400).json({ success: false, message: "Message too long (max 8000 chars)" });

        // Resolve or create conversation
        let conv;
        if (conversationId) {
            conv = safeGet("SELECT * FROM bot_conversations WHERE id = ? AND user_id = ?", conversationId, uid);
            if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
        } else {
            const r = db.prepare("INSERT INTO bot_conversations (user_id, title) VALUES (?, 'New chat')").run(uid);
            conv = { id: r.lastInsertRowid, title: "New chat" };
        }

        // Persist user message
        db.prepare("INSERT INTO bot_messages (conversation_id, role, content) VALUES (?, 'user', ?)").run(conv.id, userMessage);

        // Build history from DB (excluding the just-inserted one, which we send separately)
        const historyRows = safeAll("SELECT role, content FROM bot_messages WHERE conversation_id = ? ORDER BY id ASC", conv.id);
        const history = historyRows.slice(0, -1).map(h => ({ role: h.role, content: h.content }));

        // Call Gemini
        const reply = await callGemini(userMessage, history);

        // Persist assistant message
        db.prepare("INSERT INTO bot_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)").run(conv.id, reply);

        // Auto-title from first user message if still default
        let title = conv.title;
        if (!title || title === "New chat") {
            title = deriveTitle(userMessage);
            db.prepare("UPDATE bot_conversations SET title = ? WHERE id = ?").run(title, conv.id);
        }
        db.prepare("UPDATE bot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conv.id);

        const messages = safeAll("SELECT id, role, content, created_at FROM bot_messages WHERE conversation_id = ? ORDER BY id ASC", conv.id);

        res.json({ success: true, conversation_id: conv.id, title, messages });
    } catch (err) {
        console.error("[Bot chat] error:", err.message);
        res.status(500).json({ success: false, message: err.message || "Chat failed" });
    }
};

function deriveTitle(text) {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return "New chat";
    const words = cleaned.split(" ").slice(0, 6).join(" ");
    return words.length > 42 ? words.slice(0, 42) + "…" : words;
}


// =========================================================
// GET /api/bot/conversations
// =========================================================
exports.listConversations = (req, res) => {
    try {
        const rows = safeAll(
            "SELECT id, title, created_at, updated_at FROM bot_conversations WHERE user_id = ? ORDER BY updated_at DESC",
            req.user.id
        );
        res.json({ success: true, conversations: rows });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// POST /api/bot/conversations  — create a new one
// =========================================================
exports.createConversation = (req, res) => {
    try {
        const title = (req.body.title || "New chat").toString().slice(0, 100);
        const r = db.prepare("INSERT INTO bot_conversations (user_id, title) VALUES (?, ?)").run(req.user.id, title);
        const conv = safeGet("SELECT id, title, created_at, updated_at FROM bot_conversations WHERE id = ?", r.lastInsertRowid);
        res.json({ success: true, conversation: conv });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// GET /api/bot/conversations/:id  — load messages
// =========================================================
exports.getConversation = (req, res) => {
    try {
        const conv = safeGet("SELECT id, title, created_at, updated_at FROM bot_conversations WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
        const messages = safeAll("SELECT id, role, content, created_at FROM bot_messages WHERE conversation_id = ? ORDER BY id ASC", req.params.id);
        res.json({ success: true, conversation: conv, messages });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// DELETE /api/bot/conversations/:id
// =========================================================
exports.deleteConversation = (req, res) => {
    try {
        const conv = safeGet("SELECT id FROM bot_conversations WHERE id = ? AND user_id = ?", req.params.id, req.user.id);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
        db.prepare("DELETE FROM bot_messages WHERE conversation_id = ?").run(req.params.id);
        db.prepare("DELETE FROM bot_conversations WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// GET /api/bot/offer-status
// Returns whether a trial offer is available for this user.
// No trial infrastructure exists yet — this endpoint reports that honestly.
// =========================================================



// =========================================================
// POST /api/bot/chat-stream
// SSE streaming version of chat(). Persists the full reply
// after the stream completes.
// =========================================================
exports.chatStream = async (req, res) => {
    const uid = req.user.id;
    let conversationId = req.body.conversation_id ? parseInt(req.body.conversation_id, 10) : null;
    const userMessage = (req.body.message || "").trim();

    if (!userMessage) return res.status(400).json({ success: false, message: "message required" });
    if (userMessage.length > 8000) return res.status(400).json({ success: false, message: "Message too long" });

    // Resolve or create conversation
    let conv;
    try {
        if (conversationId) {
            conv = safeGet("SELECT * FROM bot_conversations WHERE id = ? AND user_id = ?", conversationId, uid);
            if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
        } else {
            const r = db.prepare("INSERT INTO bot_conversations (user_id, title) VALUES (?, 'New chat')").run(uid);
            conv = { id: r.lastInsertRowid, title: "New chat" };
        }
        db.prepare("INSERT INTO bot_messages (conversation_id, role, content) VALUES (?, 'user', ?)").run(conv.id, userMessage);
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }

    // ---- GREETING FAST PATH ----
    // If the user greeted us and this is the first message of a new conversation,
    // return the canonical intro without calling Gemini (instant + consistent).
    if (isGreeting(userMessage)) {
        try {
            const priorMsgs = safeGet("SELECT COUNT(*) AS c FROM bot_messages WHERE conversation_id = ?", conv.id)?.c || 0;
            if (priorMsgs <= 1) {
                const _t = getTraining(uid); const _n = (_t.training && _t.training.bot_name) || "CrevioBot"; const reply = pickGreeting().replace(/CrevioBot/g, _n);
                db.prepare("INSERT INTO bot_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)").run(conv.id, reply);
                const title = "Getting started";
                db.prepare("UPDATE bot_conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(title, conv.id);

                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache, no-transform");
                res.setHeader("Connection", "keep-alive");
                res.setHeader("X-Accel-Buffering", "no");
                res.flushHeaders?.();
                const send = (obj) => res.write("data: " + JSON.stringify(obj) + "\n\n");
                send({ type: "meta", conversation_id: conv.id, title });
                send({ type: "chunk", text: reply });
                var __saved = db.prepare("SELECT id FROM bot_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1").get(conv.id);
        send({ type: "done", title, conversation_id: conv.id, message_id: __saved ? __saved.id : null });
                return res.end();
            }
        } catch (e) {
            // fall through to normal flow on any error
        }
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (obj) => res.write("data: " + JSON.stringify(obj) + "\n\n");

    send({ type: "meta", conversation_id: conv.id, title: conv.title });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { send({ type: "error", message: "GEMINI_API_KEY missing" }); return res.end(); }

    const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const historyRows = safeAll("SELECT role, content FROM bot_messages WHERE conversation_id = ? ORDER BY id ASC", conv.id);
    const history = historyRows.slice(0, -1).map(h => ({ role: h.role, content: h.content }));

    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                model + ":streamGenerateContent?alt=sse&key=" + encodeURIComponent(apiKey);

    const body = {
        systemInstruction: { parts: [{ text: buildSystemPrompt(uid) }] },
        contents: buildGeminiContents(history, userMessage),
        generationConfig: { temperature: 0.75, maxOutputTokens: 400, topP: 0.95 }
    };

    let full = "";

    try {
        const apiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!apiRes.ok || !apiRes.body) {
            const errText = await apiRes.text().catch(() => "");
            send({ type: "error", message: "Gemini " + apiRes.status + ": " + errText.slice(0, 200) });
            return res.end();
        }

        const reader = apiRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Gemini sends SSE: lines beginning with "data: "
            let idx;
            while ((idx = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line.startsWith("data:")) continue;
                const json = line.slice(5).trim();
                if (!json || json === "[DONE]") continue;
                try {
                    const parsed = JSON.parse(json);
                    const parts = parsed.candidates?.[0]?.content?.parts || [];
                    for (const p of parts) {
                        if (typeof p.text === "string" && p.text) {
                            full += p.text;
                            send({ type: "chunk", text: p.text });
                        }
                    }
                } catch (e) { /* ignore malformed */ }
            }
        }

        // Persist full reply
        if (isTooShortReply(full)) {
            // Model returned garbage (empty or '?') — use the canonical intro as a safe fallback
            full = (isGreeting(userMessage) || (safeGet("SELECT COUNT(*) AS c FROM bot_messages WHERE conversation_id = ?", conv.id)?.c || 0) <= 2)
                ? pickGreeting()
                : "Sorry — I did not catch that. Could you rephrase your question?";
            send({ type: "replace", text: full });
        }
        // Extract memory block from reply
        var parsed = extractMemoryFromText(full);
        var cleanReply = parsed.clean;
        if (parsed.facts && parsed.facts.length) {
            var savedCount = upsertFacts(uid, parsed.facts, conv.id);
            if (savedCount) console.log("[Memory] Saved " + savedCount + " fact(s) for user " + uid);
        }
        full = cleanReply;
        if (full.trim()) {
            db.prepare("INSERT INTO bot_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)").run(conv.id, full);
        }

        // Auto-title from first user message
        let title = conv.title;
        if (!title || title === "New chat") {
            title = deriveTitle(userMessage);
            db.prepare("UPDATE bot_conversations SET title = ? WHERE id = ?").run(title, conv.id);
        }
        db.prepare("UPDATE bot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conv.id);

        send({ type: "done", title, conversation_id: conv.id });
        res.end();
    } catch (err) {
        console.error("[Bot stream] error:", err.message);
        // Save whatever partial we got
        if (full.trim()) {
            try { db.prepare("INSERT INTO bot_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)").run(conv.id, full); } catch (e) {}
        }
        send({ type: "error", message: err.message });
        res.end();
    }
};


// =========================================================
// GET /api/bot/training
// Returns the user's current training + defaults from profile
// =========================================================
exports.getTraining = (req, res) => {
    try {
        const uid = req.user.id;
        const userPlan = getPlanName(uid);
        const existing = (() => { try { return db.prepare("SELECT * FROM bot_training WHERE user_id = ?").get(uid); } catch (e) { return null; } })();
        const user = (() => { try { return db.prepare("SELECT display_name, username, primary_profession FROM users WHERE id = ?").get(uid); } catch (e) { return null; } })();
        res.json({
            success: true,
            training: existing || {
                bot_name: "CrevioBot",
                user_name: (user && (user.display_name || user.username)) || "",
                profession: (user && user.primary_profession) || "",
                about_user: "",
                tone: "professional",
                response_length: "balanced",
                custom_instructions: "",
                include_portfolio: 1,
                include_projects: 1,
                include_services: 1,
                include_skills: 1
            },
            isCustomized: !!existing,
            plan: userPlan
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// POST /api/bot/training
// Upserts training data. All fields optional.
// =========================================================
exports.saveTraining = (req, res) => {
    try {
        const uid = req.user.id;
        const b = req.body || {};

        const allowedTones = ["professional","casual","direct","warm"];
        const allowedLens  = ["brief","balanced","detailed"];

        const data = {
            bot_name:            String(b.bot_name || "CrevioBot").slice(0, 60),
            user_name:           String(b.user_name || "").slice(0, 80),
            profession:          String(b.profession || "").slice(0, 120),
            about_user:          String(b.about_user || "").slice(0, 1500),
            tone:                allowedTones.includes(b.tone) ? b.tone : "professional",
            response_length:     allowedLens.includes(b.response_length) ? b.response_length : "balanced",
            custom_instructions: String(b.custom_instructions || "").slice(0, 3000),
            include_portfolio:   b.include_portfolio ? 1 : 0,
            include_projects:    b.include_projects  ? 1 : 0,
            include_services:    b.include_services  ? 1 : 0,
            include_skills:      b.include_skills    ? 1 : 0
        };

        const existing = (() => { try { return db.prepare("SELECT id FROM bot_training WHERE user_id = ?").get(uid); } catch (e) { return null; } })();

        if (existing) {
            db.prepare(`
                UPDATE bot_training SET
                    bot_name=?, user_name=?, profession=?, about_user=?,
                    tone=?, response_length=?, custom_instructions=?,
                    include_portfolio=?, include_projects=?, include_services=?, include_skills=?,
                    updated_at=CURRENT_TIMESTAMP
                WHERE user_id=?
            `).run(
                data.bot_name, data.user_name, data.profession, data.about_user,
                data.tone, data.response_length, data.custom_instructions,
                data.include_portfolio, data.include_projects, data.include_services, data.include_skills,
                uid
            );
        } else {
            db.prepare(`
                INSERT INTO bot_training
                    (user_id, bot_name, user_name, profession, about_user, tone, response_length,
                     custom_instructions, include_portfolio, include_projects, include_services, include_skills)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uid, data.bot_name, data.user_name, data.profession, data.about_user,
                data.tone, data.response_length, data.custom_instructions,
                data.include_portfolio, data.include_projects, data.include_services, data.include_skills
            );
        }

        res.json({ success: true, training: data });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// DELETE /api/bot/training — reset to defaults
// =========================================================
exports.resetTraining = (req, res) => {
    try {
        db.prepare("DELETE FROM bot_training WHERE user_id = ?").run(req.user.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};


// =========================================================
// GET /api/bot/workspace
// Returns the workspace snapshot + detected issues.
// =========================================================
exports.getWorkspace = (req, res) => {
    try {
        if (!requireBusinessPlan(req, res)) return;
        const snap = buildWorkspaceSnapshot(req.user.id);
        const issues = detectIssues(snap);
        res.json({ success: true, snapshot: snap, issues: issues });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// POST /api/bot/check
// Runs the same audit but accepts an optional focus area.
// Body: { area?: "profile"|"projects"|"services"|"messages"|... }
// =========================================================
exports.checkWorkspace = (req, res) => {
    try {
        if (!requireBusinessPlan(req, res)) return;
        const area = (req.body.area || "").toString().toLowerCase();
        const snap = buildWorkspaceSnapshot(req.user.id);
        let issues = detectIssues(snap);
        if (area) issues = issues.filter(i => i.area === area);
        res.json({ success: true, area: area || "all", issues: issues, snapshot: snap });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ============ TRIAL SUPPORT ============

function expireTrialIfNeeded(userId) {
    try {
        var sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
        if (!sub) return;
        if (sub.trial_used !== 1) return;
        if (!sub.trial_ends_at) return;
        var endsAt = new Date(String(sub.trial_ends_at).replace(" ", "T") + "Z");
        if (isNaN(endsAt.getTime())) return;
        if (endsAt > new Date()) return;
        var revertTo = sub.previous_plan || "free";
        db.prepare("UPDATE subscriptions SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(revertTo, sub.id);
        try { db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(revertTo, userId); } catch (e) {}
        console.log("[Trial] Expired for user " + userId + " -> reverted to " + revertTo);
    } catch (e) {}
}

exports.getOfferStatus = function(req, res) {
    try {
        var uid = req.user.id;
        expireTrialIfNeeded(uid);
        var sub = null;
        try { sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(uid); } catch (e) {}
        var plan = (sub && sub.plan) ? String(sub.plan).toLowerCase() : "free";
        var trialUsed = sub && sub.trial_used === 1;
        var trialActive = false;
        if (trialUsed && sub.trial_ends_at) {
            var t = new Date(String(sub.trial_ends_at).replace(" ", "T") + "Z");
            trialActive = !isNaN(t.getTime()) && t > new Date();
        }
        if (plan === "business" && !trialActive) {
            return res.json({ success: true, available: false, reason: "no_higher_plan", plan: plan });
        }
        if (trialUsed) {
            return res.json({ success: true, available: false, reason: trialActive ? "trial_active" : "already_used", plan: plan, trial_plan: sub.trial_plan || null, trial_ends_at: sub.trial_ends_at || null });
        }
        var options = [];
        if (plan === "free") options = ["pro", "business"];
        else if (plan === "pro") options = ["business"];
        if (!options.length) {
            return res.json({ success: true, available: false, reason: "no_higher_plan", plan: plan });
        }
        res.json({ success: true, available: true, plan: plan, options: options, duration_days: 2 });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.claimOffer = function(req, res) {
    try {
        var uid = req.user.id;
        var choice = (req.body.plan || "").toLowerCase();
        expireTrialIfNeeded(uid);
        var sub = null;
        try { sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(uid); } catch (e) {}
        if (!sub) return res.status(404).json({ success: false, message: "No subscription record" });
        var currentPlan = String(sub.plan || "free").toLowerCase();
        if (sub.trial_used === 1) return res.status(403).json({ success: false, code: "already_used", message: "You have already used your free trial." });
        var allowed = [];
        if (currentPlan === "free") allowed = ["pro", "business"];
        else if (currentPlan === "pro") allowed = ["business"];
        if (!allowed.length) return res.status(403).json({ success: false, code: "no_offer", message: "No offer is available for your current plan." });
        if (allowed.indexOf(choice) < 0) return res.status(400).json({ success: false, code: "invalid_choice", message: "You cannot claim a " + choice + " trial from your current plan.", options: allowed });
        var now = new Date();
        var end = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        var fmt = function(d) { return d.toISOString().replace("T", " ").slice(0, 19); };
        db.prepare("UPDATE subscriptions SET previous_plan = ?, plan = ?, trial_plan = ?, trial_started_at = ?, trial_ends_at = ?, trial_used = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(currentPlan, choice, choice, fmt(now), fmt(end), sub.id);
        try { db.prepare("UPDATE users SET plan = ? WHERE id = ?").run(choice, uid); } catch (e) {}
        res.json({ success: true, plan: choice, trial_ends_at: fmt(end), duration_days: 2, message: "Your " + choice + " trial has started. Enjoy " + choice + " features for 2 days." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
// ============ END TRIAL SUPPORT ============

// =========================================================
// GET /api/bot/memory — list all stored facts
// =========================================================
exports.getMemory = function(req, res) {
    try {
        var rows = getMemory(req.user.id);
        res.json({ success: true, memory: rows });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// POST /api/bot/memory/reset — wipe all memories
// =========================================================
exports.resetMemory = function(req, res) {
    try {
        var n = resetMemory(req.user.id);
        res.json({ success: true, cleared: n });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// POST /api/bot/reset-all — wipe memory + training + conversations
// Body: { confirm: true, scope: 'memory'|'training'|'all' }
// =========================================================
exports.resetAll = function(req, res) {
    try {
        if (req.body.confirm !== true) {
            return res.status(400).json({ success: false, message: "Explicit confirmation required" });
        }
        var scope = String(req.body.scope || 'all').toLowerCase();
        var uid = req.user.id;
        var cleared = { memory: 0, training: 0, conversations: 0, messages: 0 };
        if (scope === 'memory' || scope === 'all') {
            cleared.memory = resetMemory(uid);
        }
        if (scope === 'training' || scope === 'all') {
            try {
                var r = db.prepare("DELETE FROM bot_training WHERE user_id = ?").run(uid);
                cleared.training = r.changes || 0;
            } catch (e) {}
        }
        if (scope === 'all') {
            try {
                var convIds = db.prepare("SELECT id FROM bot_conversations WHERE user_id = ?").all(uid).map(function(x){return x.id;});
                for (var i = 0; i < convIds.length; i++) {
                    try {
                        var m = db.prepare("DELETE FROM bot_messages WHERE conversation_id = ?").run(convIds[i]);
                        cleared.messages += (m.changes || 0);
                    } catch (e) {}
                }
                var c = db.prepare("DELETE FROM bot_conversations WHERE user_id = ?").run(uid);
                cleared.conversations = c.changes || 0;
            } catch (e) {}
        }
        console.log("[Reset] User " + uid + " cleared:", cleared);
        res.json({ success: true, scope: scope, cleared: cleared });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// DELETE /api/bot/conversations/:id/messages/:msgId
// Removes one message from a conversation (ownership enforced).
// =========================================================
exports.deleteBotMessage = function(req, res) {
    try {
        var uid = req.user.id;
        var conv = db.prepare("SELECT id FROM bot_conversations WHERE id = ? AND user_id = ?").get(req.params.id, uid);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
        var r = db.prepare("DELETE FROM bot_messages WHERE id = ? AND conversation_id = ?").run(req.params.msgId, req.params.id);
        res.json({ success: true, deleted: r.changes || 0 });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// =========================================================
// POST /api/bot/regenerate
// Body: { conversation_id }
// Deletes the last assistant message, re-runs Gemini with the
// last user message, and returns the new assistant message id.
// =========================================================
exports.regenerate = function(req, res) {
    try {
        var uid = req.user.id;
        var convId = parseInt(req.body.conversation_id, 10);
        if (!convId) return res.status(400).json({ success: false, message: "conversation_id required" });
        var conv = db.prepare("SELECT id FROM bot_conversations WHERE id = ? AND user_id = ?").get(convId, uid);
        if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });
        // Find last user message
        var lastUser = db.prepare("SELECT id, content FROM bot_messages WHERE conversation_id = ? AND role = 'user' ORDER BY id DESC LIMIT 1").get(convId);
        if (!lastUser) return res.status(400).json({ success: false, message: "No user message to regenerate from" });
        // Delete last assistant message (if any)
        db.prepare("DELETE FROM bot_messages WHERE conversation_id = ? AND role = 'assistant' AND id = (SELECT id FROM bot_messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY id DESC LIMIT 1)").run(convId, convId);
        res.json({ success: true, prompt: lastUser.content, conversation_id: convId });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
