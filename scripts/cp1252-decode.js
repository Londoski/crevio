const fs = require("fs");
const path = require("path");

// Build the reverse CP1252 map: Unicode codepoint → byte
const CP1252_REVERSE = new Map();
// ASCII passthrough
for (let i = 0; i < 0x80; i++) CP1252_REVERSE.set(i, i);
// Latin-1 range
for (let i = 0xA0; i <= 0xFF; i++) CP1252_REVERSE.set(i, i);
// CP1252-specific glyphs in 0x80-0x9F
const SPECIAL = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
    0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
    0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
    0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};
for (const [cp, b] of Object.entries(SPECIAL)) CP1252_REVERSE.set(Number(cp), b);
// C1 controls (undefined in CP1252 but present in mojibake) → map to themselves
const C1 = [0x81, 0x8D, 0x8F, 0x90, 0x9D];
for (const b of C1) CP1252_REVERSE.set(b, b);

// Mojibake detection
function mojiScore(s) {
    if (!s) return 0;
    let n = 0;
    const patterns = [
        /Ã[\x80-\xBF]/g,        // Ã + continuation byte as latin1
        /Â[\x80-\xBF]/g,        // Â + continuation
        /â€[\x80-\xBF]/g,       // â€…
        /Æ’/g,                  // Æ + '
        /â‚/g,                  // € + ‚
        /Ã¢/g, /Ãƒ/g, /Ã†/g,    // double-layer prefixes
        /\uFFFD/g               // replacement char
    ];
    for (const p of patterns) {
        const m = s.match(p);
        if (m) n += m.length;
    }
    return n;
}

// One pass of CP1252 → bytes → UTF-8
function decodePass(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const cp = str.codePointAt(i);
        const byte = CP1252_REVERSE.get(cp);
        if (byte === undefined) return null;  // unmappable — abort this pass
        bytes.push(byte);
        if (cp > 0xFFFF) i++;  // skip surrogate pair
    }
    try {
        const decoded = Buffer.from(bytes).toString("utf8");
        return decoded;
    } catch (e) {
        return null;
    }
}

// Decode until stable
function fullyDecode(str) {
    let current = str;
    const startScore = mojiScore(current);
    let passes = 0;
    for (let i = 0; i < 6; i++) {
        const next = decodePass(current);
        if (next === null || next === current) break;
        const nextScore = mojiScore(next);
        if (nextScore >= mojiScore(current)) break;  // no improvement — stop
        current = next;
        passes++;
    }
    return { result: current, passes, before: startScore, after: mojiScore(current) };
}

function walk(dir, out) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (["node_modules", ".git", "database", "uploads", ".next"].includes(e.name)) continue;
            if (e.name.startsWith(".")) continue;
            walk(full, out);
        } else if (e.isFile() && /\.(html|js|css|json|md|txt)$/.test(e.name)) {
            out.push(full);
        }
    }
    return out;
}

const files = [...walk("dashboard", []), ...walk("backend", []), ...walk("admin", []), ...walk("public", [])];

let fixed = 0, stillBad = [];
console.log("Scanning " + files.length + " files...\n");

for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, "utf8"); } catch { continue; }
    if (mojiScore(content) === 0) continue;

    const { result, passes, before, after } = fullyDecode(content);
    if (passes > 0 && after < before) {
        fs.writeFileSync(f, result, "utf8");
        console.log("  ✅ " + f + "  (" + passes + " pass, score " + before + " → " + after + ")");
        fixed++;
    } else {
        stillBad.push({ file: f, score: before });
    }
}

console.log("");
console.log("Fixed " + fixed + " file(s)");

if (stillBad.length) {
    console.log("");
    console.log("❌ " + stillBad.length + " file(s) still need attention:");
    stillBad.sort((a,b) => b.score - a.score).forEach(b => console.log("  " + b.file + " (score: " + b.score + ")"));
}
