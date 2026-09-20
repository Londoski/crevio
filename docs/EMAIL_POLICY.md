# CREVIO — EMAIL & NOTIFICATION POLICY

**Purpose:** Define which events go where, so we never duplicate messages across channels.

## Core rule

Each event type has ONE delivery strategy. Never send the same event as both a notification AND an email unless it's a security event.

## Security events -> both notification + email

Why: user needs to know immediately AND have an inbox record.

| Event | Notification | Email to | Wording |
|---|---|---|---|
| New device login | Short alert | User | Email longer + "secure your account" link |
| Password changed | Short alert | User | Email includes timestamp + device + location |
| Email changed | Short alert | Both old + new | Confirms both addresses |
| 2FA enabled | Info | User | Confirms + explains benefit |
| 2FA disabled | Alert | User | Warns + suggests re-enabling |

**Wording rule:** Notification is one line + link. Email is a paragraph + action link. Same facts, different sentence structure.

## Workspace events -> notification only

| Event | Notification |
|---|---|
| Project published | Yes |
| Project unpublished | Yes |
| Portfolio published | Yes |
| New client message | Yes |

No email. Notifications appear in-app.

## Future: WhatsApp / SMS

Reserved for critical security events only, opt-in, same wording as email.

## What NEVER goes to email

- Marketing content
- "Your portfolio is performing great!"
- Any fabricated metric
- Any message not triggered by a real DB event

## Queued email behavior

When RESEND_API_KEY is missing, emails queue in email_outbox with status='queued'.
When key is added:
node -e "const e=require('./backend/services/emailService'); e.retryQueued(100).then(r=>console.log(r));"

## Retention

- notifications — indefinite
- email_outbox — audit trail, never delete
- geo_cache — indefinite

## Rate limits

- ipapi.co: 1000 lookups/day free
- Resend: 3000 emails/month, 100/day free

**Last updated:** 2026-09-20
