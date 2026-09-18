// =========================================================
// CREVIO — LOCK VERIFIER
// File: scripts/verify-locks.js
// Reads locks/locks.json and checks every approved fix is intact.
// Run BEFORE and AFTER any change.
// =========================================================
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LOCKS_FILE = path.join(ROOT, "locks", "locks.json");

// Strip UTF-8 BOM if present (PowerShell Set-Content adds one)
function stripBOM(str) {
    if (str && str.charCodeAt(0) === 0xFEFF) return str.slice(1);
    return str;
}


// ---------- ANSI colors ----------
const c = {
    green:  (s) => "\x1b[32m" + s + "\x1b[0m",
    red:    (s) => "\x1b[31m" + s + "\x1b[0m",
    yellow: (s) => "\x1b[33m" + s + "\x1b[0m",
    gray:   (s) => "\x1b[90m" + s + "\x1b[0m",
    bold:   (s) => "\x1b[1m" + s + "\x1b[0m"
};

// ---------- helpers ----------
function readFileSafe(p) {
    try { return stripBOM(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function globDir(dir, pattern) {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    const rx = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
    for (const f of fs.readdirSync(dir)) {
        if (rx.test(f)) files.push(path.join(dir, f));
    }
    return files;
}

function db() {
    try { return require(path.join(ROOT, "database", "db")); }
    catch (e) { return null; }
}

// ---------- checkers ----------
function checkSqliteTable(lock) {
    const d = db();
    if (!d) return { pass: false, detail: "database/db not loadable" };
    try {
        const row = d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(lock.table);
        return row ? { pass: true } : { pass: false, detail: "table missing: " + lock.table };
    } catch (e) { return { pass: false, detail: e.message }; }
}

function checkSqliteColumn(lock) {
    const d = db();
    if (!d) return { pass: false, detail: "database/db not loadable" };
    try {
        const cols = d.prepare(`PRAGMA table_info(${lock.table})`).all().map(c => c.name);
        return cols.includes(lock.column)
            ? { pass: true }
            : { pass: false, detail: `column missing: ${lock.table}.${lock.column}` };
    } catch (e) { return { pass: false, detail: e.message }; }
}

function checkFileContains(lock) {
    const content = readFileSafe(path.join(ROOT, lock.file));
    if (content === null) return { pass: false, detail: "file missing: " + lock.file };
    const missing = lock.patterns.filter(p => !content.includes(p));
    if (missing.length) return { pass: false, detail: "missing in file: " + missing.map(m => JSON.stringify(m)).join(", ") };
    return { pass: true };
}

function checkEveryGlobContains(lock) {
    const dir = path.join(ROOT, path.dirname(lock.glob));
    const pat = path.basename(lock.glob);
    const files = globDir(dir, pat);
    if (!files.length) return { pass: false, detail: "no files matched: " + lock.glob };
    const failures = [];
    for (const f of files) {
        const content = readFileSafe(f) || "";
        const missing = lock.patterns.filter(p => !content.includes(p));
        if (missing.length) failures.push(path.basename(f) + " → missing " + missing.map(m => JSON.stringify(m)).join(", "));
    }
    if (failures.length) return { pass: false, detail: failures.join("; ") };
    return { pass: true, detail: files.length + " files OK" };
}

function checkEveryGlobMustNotContain(lock) {
    const dir = path.join(ROOT, path.dirname(lock.glob));
    const pat = path.basename(lock.glob);
    const files = globDir(dir, pat);
    const failures = [];
    for (const f of files) {
        const content = readFileSafe(f) || "";
        const found = lock.patterns.filter(p => content.includes(p));
        if (found.length) failures.push(path.basename(f) + " → still has " + found.map(m => JSON.stringify(m)).join(", "));
    }
    if (failures.length) return { pass: false, detail: failures.join("; ") };
    return { pass: true, detail: files.length + " files clean" };
}

// ---------- run ----------
function main() {
    console.log("");
    console.log(c.bold("═══════════════════════════════════════════════════════"));
    console.log(c.bold("  CREVIO — LOCK VERIFICATION"));
    console.log(c.bold("═══════════════════════════════════════════════════════"));
    console.log("");

    if (!fs.existsSync(LOCKS_FILE)) {
        console.error(c.red("❌ locks/locks.json not found."));
        process.exit(2);
    }
    const cfg = JSON.parse(stripBOM(fs.readFileSync(LOCKS_FILE, "utf8")));
    const locks = cfg.locks || [];

    let pass = 0, fail = 0;
    const failures = [];

    for (const lock of locks) {
        let result;
        try {
            switch (lock.type) {
                case "sqliteTable":             result = checkSqliteTable(lock); break;
                case "sqliteColumn":            result = checkSqliteColumn(lock); break;
                case "fileContains":            result = checkFileContains(lock); break;
                case "everyGlobContains":       result = checkEveryGlobContains(lock); break;
                case "everyGlobMustNotContain": result = checkEveryGlobMustNotContain(lock); break;
                default:                        result = { pass: false, detail: "unknown lock type: " + lock.type };
            }
        } catch (e) {
            result = { pass: false, detail: e.message };
        }

        if (result.pass) {
            pass++;
            console.log(c.green("  ✅ ") + c.bold(lock.id) + "  " + c.gray("— " + lock.desc));
            if (result.detail) console.log("      " + c.gray(result.detail));
        } else {
            fail++;
            console.log(c.red("  ❌ ") + c.bold(lock.id) + "  " + c.gray("— " + lock.desc));
            console.log("      " + c.red(result.detail || "failed"));
            failures.push(lock.id);
        }
    }

    console.log("");
    console.log(c.bold("═══════════════════════════════════════════════════════"));
    console.log("  " + c.green(pass + " passed") + "   " + (fail ? c.red(fail + " failed") : c.gray("0 failed")));
    console.log(c.bold("═══════════════════════════════════════════════════════"));
    console.log("");

    if (fail) {
        console.log(c.yellow("⚠️  Do NOT proceed with new changes. Fix the failures above first."));
        console.log(c.yellow("   These are APPROVED fixes that must stay intact."));
        console.log("");
        process.exit(1);
    }

    console.log(c.green("🔒 All approved fixes are intact. You're safe to make changes."));
    console.log("");
    process.exit(0);
}

main();
