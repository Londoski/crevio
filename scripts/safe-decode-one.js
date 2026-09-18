const fs = require("fs");
const path = "dashboard/pages/messages.html";

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

function decodePass(str) {
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
    for (const p of [/Ã[\x80-\xBF]/g, /Â[\x80-\xBF]/g, /â€[\x80-\xBF]/g, /Æ’/g, /Ãƒ/g, /Ã¢/g, /Ã†/g, /\uFFFD/g]) {
        const m = s.match(p);
        if (m) n += m.length;
    }
    return n;
}

let content = fs.readFileSync(path, "utf8");
const startScore = score(content);
console.log("Starting score:", startScore);

let passes = 0;
for (let i = 0; i < 15; i++) {
    const next = decodePass(content);
    if (next === null) { console.log("Pass " + (i+1) + ": null (aborted)"); break; }
    if (next === content) { console.log("Pass " + (i+1) + ": no change"); break; }
    const nextScore = score(next);
    if (nextScore >= score(content)) { console.log("Pass " + (i+1) + ": no improvement (" + score(content) + " → " + nextScore + ")"); break; }
    content = next;
    passes++;
    console.log("Pass " + passes + ": score " + score(content));
}

console.log("");
console.log("Total passes:", passes);
console.log("Final score:", score(content));

// SAFETY: only write if the final score is much better
if (score(content) < startScore * 0.1) {
    fs.writeFileSync(path, content, "utf8");
    console.log("✅ Saved (score reduced by >90%)");
} else {
    console.log("❌ Not saved — improvement too small, would risk file damage");
}
