const fs = require("fs");
const FILES = [
    "dashboard/pages/bot.html",
    "dashboard/pages/portfolio-edit.html",
    "dashboard/pages/service-edit.html",
    "dashboard/pages/settings.html",
    "dashboard/pages/social.html"
];

const CP1252_REVERSE = new Map();
for (let i = 0; i < 0x80; i++) CP1252_REVERSE.set(i, i);
for (let i = 0xA0; i <= 0xFF; i++) CP1252_REVERSE.set(i, i);
const SPECIAL = {
    0x20AC:0x80, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84, 0x2026:0x85, 0x2020:0x86,
    0x2021:0x87, 0x02C6:0x88, 0x2030:0x89, 0x0160:0x8A, 0x2039:0x8B, 0x0152:0x8C,
    0x017D:0x8E, 0x2018:0x91, 0x2019:0x92, 0x201C:0x93, 0x201D:0x94, 0x2022:0x95,
    0x2013:0x96, 0x2014:0x97, 0x02DC:0x98, 0x2122:0x99, 0x0161:0x9A, 0x203A:0x9B,
    0x0153:0x9C, 0x017E:0x9E, 0x0178:0x9F
};
for (const [cp,b] of Object.entries(SPECIAL)) CP1252_REVERSE.set(Number(cp), b);
[0x81,0x8D,0x8F,0x90,0x9D].forEach(b => CP1252_REVERSE.set(b, b));

function decodeChunk(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const cp = str.codePointAt(i);
        const byte = CP1252_REVERSE.get(cp);
        if (byte === undefined) return null;
        bytes.push(byte);
        if (cp > 0xFFFF) i++;
    }
    try { return Buffer.from(bytes).toString("utf8"); } catch (e) { return null; }
}

function score(s) {
    if (!s) return 0;
    let n = 0;
    for (const p of [/Ã[\x80-\xBF]/g, /Â[\x80-\xBF]/g, /â€[\x80-\xBF]/g, /Æ’/g, /Ãƒ/g, /Ã¢/g, /Ã†/g, /Â·/g]) {
        const m = s.match(p);
        if (m) n += m.length;
    }
    return n;
}

function decodeChunkFully(str) {
    let cur = str;
    for (let i = 0; i < 15; i++) {
        const next = decodeChunk(cur);
        if (next === null || next === cur) break;
        if (score(next) >= score(cur)) break;
        cur = next;
    }
    return cur;
}

function decodeChunked(content) {
    const parts = [];
    let buf = "";
    for (let i = 0; i < content.length; i++) {
        const cp = content.codePointAt(i);
        if (CP1252_REVERSE.has(cp)) {
            buf += content[i];
            if (cp > 0xFFFF) { buf += content[i+1]; i++; }
        } else {
            if (buf) { parts.push(buf); buf = ""; }
            parts.push(content[i]);
        }
    }
    if (buf) parts.push(buf);
    return parts.map(p => decodeChunkFully(p)).join("");
}

for (const f of FILES) {
    const content = fs.readFileSync(f, "utf8");
    const before = score(content);
    if (before === 0) { console.log("  ⏭️  " + f + " already clean"); continue; }
    const result = decodeChunked(content);
    const after = score(result);
    if (after < before) {
        fs.writeFileSync(f, result, "utf8");
        console.log("  ✅ " + f + "  (" + before + " → " + after + ")");
    } else {
        console.log("  ⚠️  " + f + "  (no improvement, kept as-is)");
    }
}
