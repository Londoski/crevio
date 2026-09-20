// CREVIO — SMS SERVICE (queue-only for now)
// File: backend/services/smsService.js
// Queues every SMS in sms_outbox. If TWILIO_* env vars are set,
// sends via Twilio. Otherwise stays queued — no code change needed
// to activate later.
const db = require("../../database/db");

const TWILIO_ENDPOINT = "https://api.twilio.com";

function accountSid()  { return process.env.TWILIO_ACCOUNT_SID || null; }
function authToken()   { return process.env.TWILIO_AUTH_TOKEN  || null; }
function fromNumber()  { return process.env.TWILIO_FROM_NUMBER || null; }
function isConfigured(){ return !!(accountSid() && authToken() && fromNumber()); }

function logOutbox({ userId, to, body, category }) {
    try {
        const r = db.prepare(
            "INSERT INTO sms_outbox (user_id, to_phone, body, category, status) VALUES (?, ?, ?, ?, 'queued')"
        ).run(userId || null, to, body, category || null);
        return r.lastInsertRowid;
    } catch (e) { console.error("[smsService] outbox insert failed:", e.message); return null; }
}

function markSent(id, providerId) {
    if (!id) return;
    try {
        db.prepare("UPDATE sms_outbox SET status='sent', provider='twilio', provider_message_id=?, sent_at=CURRENT_TIMESTAMP WHERE id=?").run(providerId || null, id);
    } catch (e) {}
}

function markFailed(id, err) {
    if (!id) return;
    try {
        db.prepare("UPDATE sms_outbox SET status='failed', error=?, attempts=attempts+1 WHERE id=?").run(String(err || 'unknown').slice(0,500), id);
    } catch (e) {}
}

async function send({ userId = null, to, body, category = null }) {
    if (!to || !body) return { success: false, reason: 'to and body required' };
    const outboxId = logOutbox({ userId, to, body, category });

    if (!isConfigured()) {
        console.log('[smsService] Twilio not configured — queued:', to);
        return { success: true, queued: true, id: outboxId };
    }

    try {
        const params = new URLSearchParams();
        params.append('To', to);
        params.append('From', fromNumber());
        params.append('Body', body);

        const auth = Buffer.from(accountSid() + ':' + authToken()).toString('base64');
        const res = await fetch(TWILIO_ENDPOINT + '/2010-04-01/Accounts/' + accountSid() + '/Messages.json', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.sid) {
            markSent(outboxId, data.sid);
            return { success: true, id: outboxId, providerId: data.sid };
        }
        const reason = (data && data.message) || ('HTTP ' + res.status);
        markFailed(outboxId, reason);
        return { success: false, id: outboxId, reason };
    } catch (err) {
        markFailed(outboxId, err.message);
        return { success: false, id: outboxId, reason: err.message };
    }
}

module.exports = { send, isConfigured };
