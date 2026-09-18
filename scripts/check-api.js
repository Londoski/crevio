// Read token from local storage file (for dev testing)
const token = process.argv[2] || "";
const base = "http://localhost:3000";

(async () => {
    try {
        const r = await fetch(base + "/api/dashboard/overview", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await r.json();
        console.log("recentActivity from API:");
        if (data.recentActivity) {
            data.recentActivity.forEach(a => {
                console.log("  icon=" + a.icon + " | time=" + a.time + " | text=" + a.text.slice(0, 60));
            });
        } else {
            console.log("  no recentActivity in response");
            console.log(JSON.stringify(data, null, 2).slice(0, 500));
        }
    } catch(e) {
        console.log("ERROR: " + e.message);
    }
})();