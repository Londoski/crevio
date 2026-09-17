const fs = require("fs");
let env = fs.readFileSync(".env", "utf8");
env = env.replace(/^GEMINI_MODEL=.*$/m, "GEMINI_MODEL=gemini-flash-lite-latest");
if (!/^GEMINI_MODEL=/m.test(env)) env = env.trimEnd() + "\nGEMINI_MODEL=gemini-flash-lite-latest\n";
fs.writeFileSync(".env", env, "utf8");
console.log("✅ .env → gemini-flash-lite-latest");

let ctrl = fs.readFileSync("backend/controllers/botController.js", "utf8");
ctrl = ctrl.replace(
    /process\.env\.GEMINI_MODEL\s*\|\|\s*["']gemini-[^"']+["']/,
    'process.env.GEMINI_MODEL || "gemini-flash-lite-latest"'
);
fs.writeFileSync("backend/controllers/botController.js", ctrl, "utf8");
console.log("✅ Controller default updated");
