// =========================================================
// CREVIO — PORTFOLIO AI CONTROLLER
// File: backend/controllers/portfolioAiController.js
// =========================================================
// Business-only. Given a plain-text self-description from the
// user, asks Gemini to pick a template + accent + font combo
// that fits their niche. Returns validated JSON — never
// trusts the model output blindly.
// =========================================================
const entitlementService = require("../services/entitlementService");

const ALLOWED_TEMPLATES = ["minimal", "cinematic", "editorial"];
const ALLOWED_FONTS = ["Inter", "Poppins", "Playfair Display", "Roboto", "Space Grotesk"];

// ---------- Prompt ----------
function buildPrompt(description) {
    return [
        "You are Crevio's portfolio style configurator.",
        "",
        "The user has described themselves and their work. Pick the best",
        "template, accent color, and font for their public portfolio.",
        "",
        "Available templates:",
        "- minimal:  Clean, editorial, single-column, light theme.",
        "            Good for designers, developers, writers, consultants.",
        "- cinematic: Dark, full-bleed, alternating media rows.",
        "             Good for videographers, filmmakers, photographers.",
        "- editorial: Magazine-style, serif typography, two-column grid.",
        "             Good for photographers, writers, journalists, art directors.",
        "",
        "Available fonts: Inter, Poppins, Playfair Display, Roboto, Space Grotesk",
        "",
        "Accent color: any 6-digit hex like #F59E0B. It should feel like",
        "the user's brand — warm amber for cinematic types, deep red for",
        "editorial, cool blue for tech, etc. Don't always pick blue.",
        "",
        "User description:",
        "\"" + description + "\"",
        "",
        "Return ONLY valid JSON, no markdown fences, no explanation:",
        "{",
        "  \"template\": \"minimal\" | \"cinematic\" | \"editorial\",",
        "  \"accent\": \"#rrggbb\",",
        "  \"font\": \"one of the available fonts\",",
        "  \"reason\": \"one short sentence explaining the choice\"",
        "}"
    ].join("\n");
}

// ---------- Gemini ----------
async function callGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured on the server");

    const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                model + ":generateContent?key=" + encodeURIComponent(apiKey);

    const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400, topP: 0.95 }
    };

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await resp.json().catch(function () { return {}; });

    if (!resp.ok) {
        const msg = (data && data.error && data.error.message) || ("Gemini error " + resp.status);
        throw new Error(msg);
    }
    const candidates = (data && data.candidates) || [];
    if (!candidates.length) throw new Error("Gemini returned no candidates");

    const parts = (candidates[0].content && candidates[0].content.parts) || [];
    const text = parts.map(function (p) { return p.text || ""; }).join("").trim();
    if (!text) throw new Error("Gemini returned empty text");
    return text;
}

// ---------- Parse + validate the model output ----------
function parseRecommendation(text) {
    let s = String(text || "").trim();

    // Strip markdown fences if the model added them anyway
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let obj;
    try { obj = JSON.parse(s); } catch (e) { return null; }
    if (!obj || typeof obj !== "object") return null;

    const template = String(obj.template || "").trim().toLowerCase();
    if (!ALLOWED_TEMPLATES.includes(template)) return null;

    let accent = String(obj.accent || "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(accent)) accent = "#2563EB";

    let font = String(obj.font || "").trim();
    if (!ALLOWED_FONTS.includes(font)) font = "Inter";

    const reason = String(obj.reason || "").trim().slice(0, 200) ||
        "Recommended based on your description.";

    return { template: template, accent: accent, font: font, reason: reason };
}

// ---------- Endpoint ----------
// POST /api/portfolio/ai/recommend  (auth required)
// Body: { description: "I'm a Lagos-based fashion photographer..." }
exports.recommend = async (req, res) => {
    try {
        // Plan gate — Business only
        const plan = entitlementService.getUserPlan(req.user.id);
        if (plan !== "business") {
            return res.status(403).json({
                success: false,
                message: "AI recommendations are a Business plan feature.",
                required_plan: "business"
            });
        }

        const description = (req.body && req.body.description ? String(req.body.description) : "").trim();
        if (description.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Please describe your work in at least 10 characters."
            });
        }
        if (description.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Description too long (max 500 characters)."
            });
        }

        const raw = await callGemini(buildPrompt(description));
        const parsed = parseRecommendation(raw);
        if (!parsed) {
            return res.status(502).json({
                success: false,
                message: "AI returned an unexpected response. Try rephrasing or try again."
            });
        }

        res.json({ success: true, recommendation: parsed });
    } catch (err) {
        console.error("portfolioAi.recommend:", err.message);
        res.status(500).json({
            success: false,
            message: err.message || "AI request failed"
        });
    }
};