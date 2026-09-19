// =========================================================
// PATCH — login uses crevioAlert instead of native alert()
// File: scripts/patch-login-alert.js
// Idempotent. Targeted replacements only.
// =========================================================
const fs = require("fs");
const path = require("path");

function full(p) { return path.join(__dirname, "..", p); }

// ---------- 1. Add script tag to login.html ----------
const HTML = full("admin/pages/login.html");
let h = fs.readFileSync(HTML, "utf8");

if (!h.includes("crevio-alert.js")) {
    if (!h.includes("</head>")) {
        console.error("FAIL — </head> not found in login.html");
        process.exit(1);
    }
    h = h.replace("</head>", '    <script src="/dashboard/js/crevio-alert.js"></script>\n</head>');
    fs.writeFileSync(HTML, h, "utf8");
    console.log("OK — crevio-alert.js loaded in login.html");
} else {
    console.log("SKIP — login.html already loads crevio-alert.js");
}

// ---------- 2. Replace the 3 alert() calls in admin/js/login.js ----------
const JS = full("admin/js/login.js");
let j = fs.readFileSync(JS, "utf8");

const swaps = [
    {
        from: 'return alert("Please enter email and password.");',
        to:   'return crevioAlert("Please enter email and password.", { kind: "warning" });'
    },
    {
        from: 'alert(data.message || "Login failed.");',
        to:   'crevioAlert(data.message || "Login failed.", { kind: "error" });'
    },
    {
        from: 'alert("Server error. Please try again.");',
        to:   'crevioAlert("Server error. Please try again.", { kind: "error" });'
    }
];

let changed = 0;
for (const s of swaps) {
    if (j.includes(s.to)) { console.log("SKIP — already swapped:", s.from.slice(0, 40)); continue; }
    if (!j.includes(s.from)) { console.log("MISS — string not found:", s.from.slice(0, 60)); continue; }
    j = j.replace(s.from, s.to);
    changed++;
    console.log("OK — swapped:", s.from.slice(0, 60));
}

if (changed > 0) {
    fs.writeFileSync(JS, j, "utf8");
    console.log("OK — wrote " + JS);
} else {
    console.log("SKIP — no changes made to login.js");
}

console.log("\nDone.");