const base = "http://localhost:3000";
const token = process.argv[2] || "";
const convId = process.argv[3] || "1";
const msgId = process.argv[4] || "1";

(async () => {
    const tests = [
        ["GET  /api/messages/pin-options",      "/api/messages/pin-options",                   { method: "GET" }],
        ["POST /api/messages/.../pin",          "/api/messages/conversations/" + convId + "/messages/" + msgId + "/pin", { method: "POST", body: JSON.stringify({ hours: 24 }) }],
        ["DEL  /api/messages/.../pin",          "/api/messages/conversations/" + convId + "/messages/" + msgId + "/pin", { method: "DELETE" }],
    ];
    for (const [label, url, opts] of tests) {
        try {
            const r = await fetch(base + url, Object.assign({
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                }
            }, opts));
            const body = await r.text();
            console.log(label, "→", r.status, body.slice(0, 180));
        } catch (e) {
            console.log(label, "→ ERROR", e.message);
        }
    }
})();
