const db = require("./database/db");
setInterval(function () {
    const s = db.prepare("SELECT paystack_subscription_code FROM subscriptions WHERE user_id = 1").get();
    if (s && s.paystack_subscription_code) {
        console.log("✅ subscription code arrived: " + s.paystack_subscription_code);
        process.exit(0);
    } else {
        console.log("waiting... (" + new Date().toLocaleTimeString() + ")");
    }
}, 5000);