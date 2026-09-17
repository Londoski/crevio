const fs = require("fs");
const path = "dashboard/pages/bot.html";
let html = fs.readFileSync(path, "utf8");
let changed = false;

// 1) Extract the toggle button from chat-header-left
const toggleRe = /(<button\s+class="bot-sidebar-toggle"[^>]*>[\s\S]*?<\/button>)\s*/;
const match = html.match(toggleRe);

if (match) {
    const toggleHTML = match[1];

    // Remove it from its current position
    html = html.replace(toggleRe, "");
    changed = true;

    // Insert it right before the wsBtn (start of the right-side actions)
    const anchor = '<button class="icon-btn" id="wsBtn"';
    if (html.indexOf(anchor) >= 0) {
        html = html.replace(anchor, toggleHTML + "\n                " + anchor);
        console.log("✅ Toggle moved to right side");
    } else {
        console.log("⚠️  wsBtn anchor not found");
    }
} else {
    console.log("⚠️  Toggle button not found in HTML");
}

// 2) Remove the CSS `order: -1` rule that no longer applies
html = html.replace(/\.bot-sidebar-toggle\s*\{[^}]*order:\s*-1[^}]*\}/g, function (m) {
    return m.replace(/order:\s*-1;?/g, "");
});

fs.writeFileSync(path, html, "utf8");
console.log(changed ? "💾 Saved" : "ℹ️  No changes");

// Verify
const final = fs.readFileSync(path, "utf8");
const rightSection = final.match(/<div>\s*<button[^>]*bot-sidebar-toggle[\s\S]{0,400}?<\/div>/);
console.log("");
console.log("Toggle is now in right actions div:", rightSection ? "✅" : "❌");
