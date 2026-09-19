// =========================================================
// CREVIO — GEO SERVICE
// File: backend/services/geoService.js
// Resolves IP → location using ipapi.co (free tier, no key
// required). Caches every lookup so repeat IPs never hit the
// network twice. Never blocks login — 1.5s timeout, graceful
// fallback. IPv6 + private IPs handled.
// =========================================================
const db = require("../../database/db");

const PROVIDER = "https://ipapi.co";
const TIMEOUT_MS = 1500;
const USER_AGENT = "Crevio/1.0 (security-notification)";

// ---------- IP classification ----------
function isPrivateIPv4(ip) {
    if (!ip) return true;
    const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return false;
    const [, a, b] = m.map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

function isPrivateIPv6(ip) {
    if (!ip) return true;
    const s = String(ip).toLowerCase();
    if (s === "::1") return true;
    if (s.startsWith("fc") || s.startsWith("fd")) return true; // unique local
    if (s.startsWith("fe80")) return true;                     // link local
    return false;
}

function classify(ip) {
    if (!ip) return "unknown";
    if (ip.includes(":")) return isPrivateIPv6(ip) ? "private" : "public";
    return isPrivateIPv4(ip) ? "private" : "public";
}

// ---------- cache ----------
function getCache(ip) {
    try {
        return db.prepare("SELECT * FROM geo_cache WHERE ip = ?").get(ip) || null;
    } catch (e) { return null; }
}

function putCache(ip, data) {
    try {
        db.prepare(`
            INSERT INTO geo_cache (ip, country, country_code, region, city, latitude, longitude, timezone, isp, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ip) DO UPDATE SET
                country=excluded.country, country_code=excluded.country_code,
                region=excluded.region, city=excluded.city,
                latitude=excluded.latitude, longitude=excluded.longitude,
                timezone=excluded.timezone, isp=excluded.isp,
                raw_json=excluded.raw_json, fetched_at=CURRENT_TIMESTAMP
        `).run(
            ip,
            data.country || null, data.country_code || null,
            data.region || null, data.city || null,
            data.latitude || null, data.longitude || null,
            data.timezone || null, data.isp || null,
            JSON.stringify(data)
        );
    } catch (e) { console.error("[geoService] cache write failed:", e.message); }
}

// ---------- resolve ----------
async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const r = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
            signal: controller.signal
        });
        return r;
    } finally { clearTimeout(t); }
}

async function lookup(ip) {
    const klass = classify(ip);
    if (klass === "private" || klass === "unknown") {
        return { ip, private: true, country: null, city: null, region: null, note: "private_or_local" };
    }

    const cached = getCache(ip);
    if (cached) {
        return {
            ip,
            cached: true,
            country: cached.country,
            country_code: cached.country_code,
            region: cached.region,
            city: cached.city,
            timezone: cached.timezone,
            isp: cached.isp
        };
    }

    try {
        const key = process.env.IPAPI_KEY ? ("?key=" + encodeURIComponent(process.env.IPAPI_KEY)) : "";
        const res = await fetchWithTimeout(PROVIDER + "/" + encodeURIComponent(ip) + "/json/" + key);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (data && data.error) throw new Error(data.reason || "provider_error");

        const out = {
            country: data.country_name || null,
            country_code: data.country_code || null,
            region: data.region || null,
            city: data.city || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            timezone: data.timezone || null,
            isp: data.org || null
        };
        putCache(ip, out);
        return Object.assign({ ip, cached: false }, out);
    } catch (err) {
        console.warn("[geoService] lookup failed for", ip, "-", err.message);
        return { ip, country: null, city: null, region: null, note: "lookup_failed", error: err.message };
    }
}

/**
 * Human-friendly location string.
 * Priority: City, Region, Country → Region, Country → Country → "Unknown location"
 */
function friendly(loc) {
    if (!loc) return "Unknown location";
    if (loc.private) return "Local network";
    const parts = [];
    if (loc.city) parts.push(loc.city);
    if (loc.region && loc.region !== loc.city) parts.push(loc.region);
    if (loc.country) parts.push(loc.country);
    return parts.length ? parts.join(", ") : "Unknown location";
}

module.exports = {
    lookup,
    friendly,
    classify
};