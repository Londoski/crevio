const fs = require("fs");
const path = "dashboard/js/messages.js";
let js = fs.readFileSync(path, "utf8");

if (!js.includes('case "edit"')) {
    const anchor = `case "forward": {
                closeMessageMenu();
                openForwardPanel([msgId]);
                break;
            }`;
    const add = anchor + "\n" + `            case "edit": {
                openEditDialog(msgId);
                break;
            }`;
    if (js.includes(anchor)) {
        js = js.replace(anchor, add);
        fs.writeFileSync(path, js, "utf8");
        console.log("✅ case edit added");
    } else {
        console.log("⚠️  forward case anchor not found");
    }
} else {
    console.log("⏭️  case edit already present");
}
