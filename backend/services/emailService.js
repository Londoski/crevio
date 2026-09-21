require("dotenv").config();

// =========================================================
// CREVIO — EMAIL SERVICE
// File: backend/services/emailService.js
// Wraps Resend. Falls back to a local outbox when the API key
// is missing so nothing is lost. Every send is audited.
// Zero external dependencies beyond global fetch.
// =========================================================
const db = require("../../database/db");

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function apiKey()          { return process.env.RESEND_API_KEY || null; }
function defaultFromEmail(){ return process.env.RESEND_FROM_EMAIL || "Crevio <no-reply@crevio.local>"; }
function isConfigured()    { return !!apiKey(); }

// ---------- outbox ----------
function logOutbox({ userId, to, from, subject, html, text, category }) {
    try {
        const r = db.prepare(`
            INSERT INTO email_outbox
                (user_id, to_email, from_email, subject, html_body, text_body, category, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')
        `).run(userId || null, to, from || defaultFromEmail(), subject, html || null, text || null, category || null);
        return r.lastInsertRowid;
    } catch (e) {
        console.error("[emailService] outbox insert failed:", e.message);
        return null;
    }
}

function markSent(id, providerMessageId, provider) {
    if (!id) return;
    try {
        db.prepare(`
            UPDATE email_outbox
            SET status = 'sent', provider = ?, provider_message_id = ?, sent_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(provider || "resend", providerMessageId || null, id);
    } catch (e) { console.error("[emailService] markSent failed:", e.message); }
}

function markFailed(id, errMsg) {
    if (!id) return;
    try {
        db.prepare(`
            UPDATE email_outbox
            SET status = 'failed', error = ?, attempts = attempts + 1
            WHERE id = ?
        `).run(String(errMsg || "unknown").slice(0, 500), id);
    } catch (e) { console.error("[emailService] markFailed failed:", e.message); }
}

// ---------- send ----------
/**
 * Send an email. Never throws.
 * @returns {Promise<{success:boolean, queued?:boolean, id?:number, providerId?:string, reason?:string}>}
 */
async function send({ userId = null, to, subject, html, text, category = null, from = null }) {
    if (!to || !subject) return { success: false, reason: "to and subject required" };

    const outboxId = logOutbox({ userId, to, from, subject, html, text, category });

    if (!isConfigured()) {
        console.log("[emailService] RESEND_API_KEY not set — queued for later:", subject, "→", to);
        return { success: true, queued: true, id: outboxId };
    }

    try {
        const payload = {
            from: from || defaultFromEmail(),
            to: Array.isArray(to) ? to : [to],
            subject
        };
        if (html) payload.html = html;
        if (text) payload.text = text;
        if (!payload.html && !payload.text) payload.text = subject;

        const res = await fetch(RESEND_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + apiKey(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data && data.id) {
            markSent(outboxId, data.id, "resend");
            return { success: true, id: outboxId, providerId: data.id };
        }

        const reason = (data && (data.message || data.error)) || ("HTTP " + res.status);
        markFailed(outboxId, reason);
        console.error("[emailService] send failed:", reason);
        return { success: false, id: outboxId, reason };

    } catch (err) {
        markFailed(outboxId, err.message);
        console.error("[emailService] network error:", err.message);
        return { success: false, id: outboxId, reason: err.message };
    }
}

// ---------- retry queued (for when a key is added later) ----------
async function retryQueued(limit = 20) {
    if (!isConfigured()) return { success: false, reason: "not_configured" };
    const rows = db.prepare(`
        SELECT * FROM email_outbox
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT ?
    `).all(limit);

    let sent = 0, failed = 0;
    for (const row of rows) {
        try {
            const res = await fetch(RESEND_ENDPOINT, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + apiKey(),
                    "Content-Type": "application/json"
                },
                                body: JSON.stringify({
                    from: defaultFromEmail(),
                    to: [row.to_email],
                    subject: row.subject,
                    html: row.html_body || undefined,
                    text: row.text_body || row.subject
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data && data.id) { markSent(row.id, data.id, "resend"); sent++; }
            else { markFailed(row.id, (data && data.message) || ("HTTP " + res.status)); failed++; }
        } catch (e) {
            markFailed(row.id, e.message); failed++;
        }
    }
    return { success: true, sent, failed, checked: rows.length };
}

module.exports = {
    send,
    retryQueued,
    isConfigured
};