// =========================================================
// PATCH — remember-device checkbox (regex-based, robust)
// File: scripts/patch-remember-device.js
// =========================================================
const fs = require("fs");
const path = require("path");
function full(p) { return path.join(__dirname, "..", p); }

// ============ 1. HTML: replace CSS block with regex ============
const HTML = full("admin/pages/login.html");
let h = fs.readFileSync(HTML, "utf8");

if (h.includes("appearance: none")) {
    console.log("SKIP — checkbox CSS already updated");
} else {
    // Match the .checkbox-group input[type="checkbox"] { ... } block (any content between { })
    const re = /\.checkbox-group input\[type="checkbox"\]\s*\{[^}]*\}/;
    if (!re.test(h)) {
        console.error("FAIL — could not find .checkbox-group input[type=\"checkbox\"] block");
        process.exit(1);
    }

    const NEW_CSS = `.checkbox-group input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 6px;
            border: 2px solid var(--border-color);
            background: var(--bg-card);
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
            margin: 0;
            transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .checkbox-group input[type="checkbox"]:hover {
            border-color: var(--accent);
        }
        .checkbox-group input[type="checkbox"]:checked {
            background: var(--accent-dim);
            border-color: var(--accent);
        }
        .checkbox-group input[type="checkbox"]:checked::after {
            content: "";
            position: absolute;
            left: 4px;
            top: 0px;
            width: 6px;
            height: 11px;
            border: solid var(--accent);
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        .checkbox-group input[type="checkbox"]:focus-visible {
            outline: none;
            box-shadow: 0 0 0 3px var(--accent-dim);
        }`;

    h = h.replace(re, NEW_CSS);
    fs.writeFileSync(HTML, h, "utf8");
    console.log("OK — checkbox CSS replaced (regex)");
}

// ============ 2. login.js ============
const JS = full("admin/js/login.js");
let j = fs.readFileSync(JS, "utf8");

if (j.includes("const remember =")) {
    console.log("SKIP — checkbox read already present");
} else {
    const OLD_READ = `        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();`;
    if (!j.includes(OLD_READ)) {
        console.error("FAIL — email/password block not found in login.js");
        process.exit(1);
    }
    j = j.replace(OLD_READ, OLD_READ + `
        const remember = document.getElementById("rememberDevice") ? document.getElementById("rememberDevice").checked : true;`);
    console.log("OK — checkbox read added");
}

if (j.includes("rememberDevice: remember")) {
    console.log("SKIP — rememberDevice already sent");
} else {
    const OLD_BODY = `body: JSON.stringify({ email, password })`;
    if (!j.includes(OLD_BODY)) {
        console.error("FAIL — login payload line not found");
        process.exit(1);
    }
    j = j.replace(OLD_BODY, `body: JSON.stringify({ email, password, rememberDevice: remember })`);
    console.log("OK — rememberDevice added to payload");
}

fs.writeFileSync(JS, j, "utf8");

// ============ 3. authController ============
const AUTH = full("backend/controllers/authController.js");
let a = fs.readFileSync(AUTH, "utf8");

if (a.includes("rememberDevice: req.body")) {
    console.log("SKIP — authController already forwards rememberDevice");
} else {
    const OLD_AUTH = `                ipAddress:   String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "",
                acceptLanguage: req.headers["accept-language"] || ""`;
    if (!a.includes(OLD_AUTH)) {
        console.error("FAIL — recordLogin block not found in authController");
        process.exit(1);
    }
    a = a.replace(OLD_AUTH, OLD_AUTH + `,
                rememberDevice: req.body && req.body.rememberDevice === false ? false : true`);
    fs.writeFileSync(AUTH, a, "utf8");
    console.log("OK — authController forwards rememberDevice");
}

console.log("\nDone.");