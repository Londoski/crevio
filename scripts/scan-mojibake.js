const fs = require("fs");
const path = require("path");

// Common UTF-8 → CP1252 mojibake patterns
const PATTERNS = [
    { bad: "â€¦", good: "\u2026", name: "ellipsis (…)" },
    { bad: "âˆž", good: "\u221E", name: "infinity (∞)" },
    { bad: "â€™", good: "\u2019", name: "right single quote (’)" },
    { bad: "â€˜", good: "\u2018", name: "left single quote (‘)" },
    { bad: "â€œ", good: "\u201C", name: "left double quote (“)" },
    { bad: "â€\x9D", good: "\u201D", name: "right double quote (”)" },
    { bad: "â€“", good: "\u2013", name: "en dash (–)" },
    { bad: "â€”", good: "\u2014", name: "em dash (—)" },
    { bad: "â‚¬", good: "\u20AC", name: "euro (€)" },
    { bad: "Â ", good: " ",       name: "non-breaking space gone wrong" },
    { bad: "Â", good: "",         name: "stray Â prefix" }
];

function walk(dir, out) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (["node_modules", ".git", "database", "uploads"].includes(e.name)) continue;
            if (e.name.startsWith(".")) continue;
            walk(full, out);
        } else if (e.isFile()) {
            if (/\.(html|js|css|json|md|txt)$/.test(e.name)) out.push(full);
        }
    }
    return out;
}

const files = [
    ...walk("dashboard", []),
    ...walk("backend", []),
    ...walk("admin", []),
    ...walk("public", [])
];

console.log("Scanning " + files.length + " files...\n");

let total = 0;
const hits = [];

for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, "utf8"); } catch { continue; }

    for (const p of PATTERNS) {
        let idx = -1;
        let count = 0;
        while ((idx = content.indexOf(p.bad, idx + 1)) !== -1) {
            count++;
            if (count === 1) {
                // Show first context
                const start = Math.max(0, idx - 30);
                const end = Math.min(content.length, idx + p.bad.length + 30);
                const context = content.slice(start, end).replace(/\n/g, "⏎");
                hits.push({ file: f, name: p.name, context });
            }
        }
        if (count > 0) total += count;
    }
}

if (hits.length === 0) {
    console.log("✅ No mojibake found.");
} else {
    console.log("❌ Found " + total + " mojibake occurrences in " + hits.length + " unique spots:\n");
    hits.forEach(h => {
        console.log("  " + h.file);
        console.log("     [" + h.name + "]  ..." + h.context + "...");
        console.log("");
    });
}
