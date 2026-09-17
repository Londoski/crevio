const fs = require("fs");
const path = "dashboard/pages/bot.html";
let html = fs.readFileSync(path, "utf8");
const before = html.length;

// Remove any inline <script>...</script> that ISN'T src="" and ISN'T the known good ones
// Known good inline scripts: the ones we added intentionally (markdown, toolbar)
// Orphaned ones are typically from earlier toolbars that got wiped
var removed = 0;
html = html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, function (match, body) {
    // Keep these — they are intentional and known-safe
    if (body.indexOf("renderBotMarkdown") >= 0) return match;
    if (body.indexOf("__crevioBotToolbarInstalled") >= 0) return match;  // old inline toolbar (safe to remove now since we moved to file)

    // Remove orphaned inline scripts that reference things we don't use
    removed++;
    return "<!-- removed orphaned inline script -->";
});

fs.writeFileSync(path, html, "utf8");
console.log("✅ Removed " + removed + " orphaned inline script(s)");
console.log("   Before: " + before + " bytes | After: " + html.length + " bytes");

// Show what script tags remain
console.log("");
console.log("=== Remaining script tags ===");
var tags = html.match(/<script[^>]*>/g) || [];
tags.forEach(function (t) { console.log("  " + t); });
