# CREVIO — NOTIFICATIONS & SECURITY EVENTS

**Status:** Complete through Phase B3 (5 security events)
**Last updated:** 2026-09-20
**Owner:** Crevio Engineering

---

## 1. Overview

Crevio's notification system is the one-way attention layer between the platform and the creator. It reports real events about the creator's account, security, and workspace.

**Rule:** Notifications are read-only. Users cannot reply.

### What gets notified vs emailed

| Event | Notification | Email | Channel |
|---|---|---|---|
| New device login | Alert | Queued | Both |
| Password changed | Alert | Queued | Both |
| Email changed | Alert | Queued (both addresses) | Both |
| 2FA enabled | Info | Queued | Both |
| 2FA disabled | Alert | Queued | Both |
| Project published | System | notification only | In-app |
| Portfolio published | System | notification only | In-app |
| New client message | Message | notification only | In-app |

**Policy:** Security events go to both. Workspace events go to notification only.

---

## 2. Architecture

EVENT -> loginSecurityService / accountSecurityService
              |
       notificationService.create()  --> notifications table
              |                                    |
       emailService.send()              Sidebar red dot badge
              |                                    |
       email_outbox table                Notifications page
              |
       Resend API (when key set)

**Source of truth:** Each subsystem owns its own data. Notifications reference other tables via entity_type + entity_id.

---

## 3. Database tables

### notifications
id, user_id, title, message, type, is_read, read_at, entity_type, entity_id, created_at

### email_outbox
id, user_id, to_email, from_email, subject, html_body, text_body, category, status, provider, provider_message_id, error, attempts, created_at, sent_at

### geo_cache
ip (PK), country, country_code, region, city, latitude, longitude, timezone, isp, raw_json, fetched_at

### trusted_devices
user_id, device_token, device_name, user_agent, ip_address, expires_at, last_used_at

### sessions
Existing table — now written on every login (was previously unused).

---

## 4. Backend services

### notificationService.js
Creates notification rows. Never throws.
notificationService.create({ userId, type, title, message, entityType, entityId });

### emailService.js
Wraps Resend. Falls back to email_outbox when RESEND_API_KEY is missing.
- Never throws
- Every send logged in email_outbox
- retryQueued() resends queued emails once a key is added

### geoService.js
IP -> location via ipapi.co. Cached. 1.5s timeout. Private IPs return "Local network".

### deviceService.js
Parses User-Agent into { browser, os, device, friendly }. Zero dependencies.

### loginSecurityService.js
Called once per successful login. Fire-and-forget.
Rules:
- First-ever login -> silent trust
- Same trusted device -> silent
- New device (not first-ever) -> notification + email
- rememberDevice: false -> notify every login

### accountSecurityService.js
Emits notifications + queued emails:
- notifyPasswordChanged
- notifyEmailChanged
- notify2FAEnabled
- notify2FADisabled

---

## 5. Event pipeline

| Event | Trigger | Type | Email category |
|---|---|---|---|
| New device login | authController.login | alert | security_new_device |
| Password changed | authController.changePassword | alert | security_password_changed |
| Email changed | authController.changeEmail | alert | security_email_changed |
| 2FA enabled | twoFactorController.setup | system | security_2fa_enabled |
| 2FA disabled | twoFactorController.disable | alert | security_2fa_disabled |
| Project published | projectController.publishProject | system | — |
| Project unpublished | projectController.unpublishProject | system | — |
| Portfolio published | portfolioController.publish | system | — |
| New client message | messageController.startConversation | message | — |

All hooks are wrapped in try/catch — never break the primary action.

---

## 6. API endpoints

GET   /api/notifications              — list (last 100)
GET   /api/notifications/unread-count — sidebar badge source
PATCH /api/notifications/:id/read     — mark one
PATCH /api/notifications/read-all     — mark all
DELETE /api/notifications/:id         — delete one
POST  /api/notifications              — self-create (internal)

All scoped by req.user.id. Cross-user access returns 404.

---

## 7. Environment variables

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Crevio <security@yourdomain.com>
APP_URL=https://yourdomain.com
IPAPI_KEY=

Without these: emails queue, notifications still work.

---

## 8. Frontend

### dashboard/pages/notifications.html
Two-column layout. Mobile: reading pane slides over.

### dashboard/js/notifications.js
Loads, renders markdown, context panel (type/received/source/actions), delete via Crevio confirm.

### dashboard/js/sidebar-badges.js
Injected on all 21 dashboard pages. Polls every 30s when visible.
Red dot on Notifications and Messages nav items when unread count > 0.

### dashboard/js/crevio-alert.js
window.crevioAlert(msg, { kind, title }) — kind: error/warning/info/success.

### dashboard/js/crevio-confirm.js
await window.crevioConfirm(msg, opts).

### dashboard/js/mobile-menu.js
Floating hamburger drawer. Hides when open. Body scroll locked. Inline in .list-header on notifications page.

---

## 9. Locks

Run node scripts/verify-locks.js before ANY commit.
61 locks protect the entire pipeline — see locks/locks.json for the full list.

---

## 10. Troubleshooting

### Red dot doesn't appear
1. Check [SidebarBadges] in browser console
2. Confirm /api/notifications/unread-count returns { success: true, count: N }
3. Confirm sidebar HTML has <a href=".../notifications.html" class="nav-item">

### Emails queued, not sent
Set RESEND_API_KEY in .env, restart server, then:
node -e "const e=require('./backend/services/emailService'); e.retryQueued(50).then(r=>console.log(r));"

### New device notification missing
- First login is silent (by design)
- Same device is silent
- Force: DELETE FROM trusted_devices WHERE user_id = ? then log in again

### Geo lookup fails
Private IPs return "Local network" (correct). Behind a proxy, X-Forwarded-For header is used.

---

## 11. Future work

Ready: "This wasn't me" one-click lockdown, Resend activation, WhatsApp channel
Blocked: Subscription notifications (needs upgrade flow), Payment events (Stripe stub), Expiry warnings (needs scheduler)

Design principles:
1. No hardcoded data
2. Fire-and-forget
3. Read-only
4. One source of truth per entity
5. Locked

---

**End of document.**
