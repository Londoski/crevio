// =========================================================
// CREVIO — DEVICE SERVICE
// File: backend/services/deviceService.js
// Parses User-Agent strings into a friendly device name.
// Zero dependencies — regex based, covers Chrome / Safari /
// Firefox / Edge / Samsung / Opera / Brave + Windows / macOS /
// Linux / Android / iOS / ChromeOS.
// =========================================================

function parse(ua) {
    const s = String(ua || "");
    if (!s) return { browser: "Unknown browser", os: "Unknown OS", device: "Unknown device", friendly: "Unknown device" };

    let browser = "Browser";
    if (/Edg\//i.test(s))                     browser = "Edge";
    else if (/OPR\/|Opera/i.test(s))          browser = "Opera";
    else if (/SamsungBrowser/i.test(s))       browser = "Samsung Internet";
    else if (/Brave/i.test(s))                browser = "Brave";
    else if (/Chrome\//i.test(s))             browser = "Chrome";
    else if (/Firefox\//i.test(s))            browser = "Firefox";
    else if (/Safari\//i.test(s))             browser = "Safari";

    let os = "OS";
    if (/Windows NT 10/i.test(s))              os = "Windows";
    else if (/Windows/i.test(s))               os = "Windows";
    else if (/Mac OS X/i.test(s))              os = "macOS";
    else if (/CrOS/i.test(s))                  os = "ChromeOS";
    else if (/Android/i.test(s))               os = "Android";
    else if (/iPhone|iPad|iPod/i.test(s))      os = "iOS";
    else if (/Linux/i.test(s))                 os = "Linux";

    let device = "Desktop";
    if (/iPad/i.test(s))                       device = "iPad";
    else if (/iPhone|iPod/i.test(s))           device = "iPhone";
    else if (/Android.*Mobile/i.test(s))       device = "Android phone";
    else if (/Android/i.test(s))               device = "Android tablet";
    else if (/Mobile/i.test(s))                device = "Mobile";

    const friendly = browser + " on " + os;
    return { browser, os, device, friendly };
}

/**
 * Produce a stable device fingerprint from request metadata.
 * Not cryptographic — just a bucket for grouping the same
 * browser+os+ip into a single "device" row.
 */
function fingerprint({ userAgent, ipAddress, acceptLanguage }) {
    const parsed = parse(userAgent);
    const raw = [
        parsed.browser,
        parsed.os,
        parsed.device,
        ipAddress || "",
        String(acceptLanguage || "").split(",")[0].trim()
    ].join("|");
    // Simple hash (djb2) — enough for grouping, not for security
    let h = 5381;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    return "d" + Math.abs(h).toString(36);
}

module.exports = { parse, fingerprint };