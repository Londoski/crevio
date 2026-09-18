const fs = require("fs");
const path = "dashboard/pages/media.html";
let content = fs.readFileSync(path, "utf8");

// ---------- 1. DIAGNOSTIC: find rules with height/overflow ----------
console.log("=== Layout rules that could cause cutoff ===\n");
const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
if (styleMatch) {
    const css = styleMatch[1];
    // Split by top-level braces
    const rules = [];
    let depth = 0, buf = "", i = 0;
    for (const ch of css) {
        if (ch === "{") depth++;
        if (ch === "}") {
            buf += ch;
            depth--;
            if (depth === 0) { rules.push(buf.trim()); buf = ""; }
            continue;
        }
        buf += ch;
    }
    for (const rule of rules) {
        if (!rule.includes("{")) continue;
        const [sel, body] = rule.split("{");
        if (!body) continue;
        const selClean = sel.trim().replace(/\s+/g, " ");
        // Only show selectors likely involved in layout cutoff
        if (!/html|body|\.main|main\b|\.content|\.page|\.container|\.wrapper|\.grid|\.media|\.layout|\.body/.test(selClean)) continue;
        if (!/height|overflow|display\s*:\s*(flex|none)/.test(body)) continue;
        const h = /(?:^|[^-])height\s*:\s*([^;!]+)/.exec(body);
        const mh = /max-height\s*:\s*([^;!]+)/.exec(body);
        const ov = /overflow(?:-y)?\s*:\s*([^;!]+)/.exec(body);
        if (!h && !mh && !ov) continue;
        console.log("  " + selClean);
        if (h) console.log("    height: " + h[1].trim());
        if (mh) console.log("    max-height: " + mh[1].trim());
        if (ov) console.log("    overflow: " + ov[1].trim());
        console.log("");
    }
}

// ---------- 2. APPLY UNIVERSAL MOBILE SCROLL FIX ----------
// Remove any previous attempt
content = content.replace(/\/\* UNIVERSAL MOBILE SCROLL[\s\S]*?\/\* END UNIVERSAL MOBILE SCROLL \*\//g, "");

const fix = `
        /* UNIVERSAL MOBILE SCROLL */
        @media (max-width: 900px) {
            html {
                height: auto !important;
                max-height: none !important;
                min-height: 100vh !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }
            body {
                display: block !important;
                height: auto !important;
                max-height: none !important;
                min-height: 100vh !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                position: static !important;
            }
            .sidebar {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                height: 100vh !important;
                z-index: 1000 !important;
            }
            .main,
            main,
            .content,
            .page,
            .page-content,
            .main-content,
            .page-wrapper,
            .dashboard-content {
                display: block !important;
                position: static !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                margin-left: 0 !important;
                padding-left: 16px !important;
                padding-right: 16px !important;
                padding-bottom: calc(180px + env(safe-area-inset-bottom, 0px)) !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            .main *,
            main *,
            .content *,
            .page * {
                max-height: none !important;
            }
        }
        /* END UNIVERSAL MOBILE SCROLL */
`;

const idx = content.lastIndexOf("</style>");
if (idx > 0) {
    content = content.slice(0, idx) + fix + content.slice(idx);
    fs.writeFileSync(path, content, "utf8");
    console.log("=== Applied universal mobile scroll fix ===\n");
} else {
    console.log("ERROR: no </style> in media.html");
}