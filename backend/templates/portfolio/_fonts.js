// =========================================================
// CREVIO — PORTFOLIO FONT CATALOG
// File: backend/templates/portfolio/_fonts.js
// =========================================================
// Single source of truth for the fonts a user can pick for
// their public portfolio. Each entry maps to a Google Fonts
// family + weight list. The `name` matches what we store in
// portfolio_config.theme_settings.font_family.
// =========================================================

const FONTS = [
    // ---------- Sans ----------
    { name: "Inter",              category: "Sans",    weights: "400;500;600;700;800" },
    { name: "Poppins",            category: "Sans",    weights: "400;500;600;700" },
    { name: "Roboto",             category: "Sans",    weights: "400;500;700" },
    { name: "DM Sans",            category: "Sans",    weights: "400;500;700" },
    { name: "Manrope",            category: "Sans",    weights: "400;500;600;700;800" },
    { name: "Work Sans",          category: "Sans",    weights: "400;500;600;700" },
    { name: "Outfit",             category: "Sans",    weights: "400;500;600;700" },
    { name: "Plus Jakarta Sans",  category: "Sans",    weights: "400;500;600;700;800" },
    { name: "Figtree",            category: "Sans",    weights: "400;500;600;700" },
    { name: "Sora",               category: "Sans",    weights: "400;500;600;700" },

    // ---------- Serif ----------
    { name: "Playfair Display",   category: "Serif",   weights: "400;500;600;700;800;900" },
    { name: "Cormorant Garamond", category: "Serif",   weights: "400;500;600;700" },
    { name: "DM Serif Display",   category: "Serif",   weights: "" },      // single-weight face
    { name: "Lora",               category: "Serif",   weights: "400;500;600;700" },
    { name: "Libre Baskerville",  category: "Serif",   weights: "400;700" },
    { name: "Fraunces",           category: "Serif",   weights: "400;500;600;700;900" },
    { name: "Crimson Pro",        category: "Serif",   weights: "400;500;600;700" },

    // ---------- Display ----------
    { name: "Space Grotesk",      category: "Display", weights: "400;500;600;700" },
    { name: "Bebas Neue",         category: "Display", weights: "" },
    { name: "Anton",              category: "Display", weights: "" },
    { name: "Archivo Black",      category: "Display", weights: "" },

    // ---------- Mono ----------
    { name: "JetBrains Mono",     category: "Mono",    weights: "400;500;600;700" },
    { name: "IBM Plex Mono",      category: "Mono",    weights: "400;500;600;700" }
];

const DEFAULT = "Inter";

function findByName(name) {
    if (!name) return null;
    const needle = String(name).trim().toLowerCase();
    for (let i = 0; i < FONTS.length; i++) {
        if (FONTS[i].name.toLowerCase() === needle) return FONTS[i];
    }
    return null;
}

function buildGoogleFontsUrl(name) {
    const font = findByName(name) || findByName(DEFAULT);
    const family = font.name.replace(/ /g, "+");
    const base = "https://fonts.googleapis.com/css2?family=" + family;
    const withWeights = font.weights ? (base + ":wght@" + font.weights) : base;
    return withWeights + "&display=swap";
}

function listPublic() {
    return FONTS.map(function (f) {
        return { name: f.name, category: f.category };
    });
}

module.exports = {
    FONTS: FONTS,
    DEFAULT: DEFAULT,
    findByName: findByName,
    buildGoogleFontsUrl: buildGoogleFontsUrl,
    listPublic: listPublic
};