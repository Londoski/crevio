# CREVIO — SECURITY SUITE

**Status:** Complete as of Phase P1c
**Last updated:** 2026-09-20
**Owner:** Crevio Engineering

---

## 1. Overview

This document covers the security infrastructure built on top of the notifications system. It includes multi-factor authentication, device trust, session management, and the account recovery flow.

## 2. Authentication methods

| Method | Storage | Enforcement |
|---|---|---|
| Password | `users.password_hash` (bcrypt cost 12) | Always |
| Email 2FA | `users.email_2fa_enabled` (0/1) | Login + reset |
| TOTP | `two_factor_methods` (AES-256-GCM encrypted secret) | Login + reset |
| Device trust | `trusted_devices` (fingerprint, 30-day TTL) | Skips 2FA |

## 3. Login flow (both TOTP and Email 2FA)

```
POST /api/auth/login { email, password, rememberDevice }
  ↓
Password verified?
  ↓ no  → 401 Invalid credentials
  ↓ yes → check two_factor_enabled + email_2fa_enabled
  ↓
  Is the current device trusted?
    ↓ yes → issue JWT + recordLogin + return token
    ↓ no  → issue short-lived 2FA ticket + return { requires_2fa, ticket, method }
       ↓
       Frontend shows the appropriate step:
         - method=totp  → 6-digit code from authenticator app
         - method=email → 6-digit code emailed to user
       ↓
       POST /api/auth/verify-2fa { ticket, code }
         ↓ valid → issue JWT + recordLogin + return token
         ↓ wrong → 400 Incorrect code
```

## 4. Endpoints

### Public

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | Password + optional 2FA gate |
| POST | /api/auth/verify-2fa | Verify 2FA ticket + code |
| POST | /api/auth/device-status | Check if current browser is trusted (for login page) |
| POST | /api/auth/register | Signup |
| GET | /api/security/report-compromise | Validate 'this wasn't me' token, redirect |
| POST | /api/security/report-compromise | Execute lockdown |
| GET | /api/security/reset-password | Validate reset token |
| POST | /api/security/reset-password | Set new password (issues OTP) |
| POST | /api/security/reset-verify-otp | Verify email OTP |
| POST | /api/security/reset-verify-totp | Verify TOTP (if enabled) |

### Authenticated

| Method | Path | Purpose |
|---|---|---|
| GET | /api/security/sessions | List user's active sessions |
| DELETE | /api/security/sessions/:id | Revoke one session |
| DELETE | /api/security/sessions | Revoke all OTHER sessions (keeps current) |
| POST | /api/security/2fa | Toggle email_2fa |
| GET | /api/security/2fa-status | Get email_2fa + TOTP status |
| POST | /api/security/recovery-codes | Generate new recovery codes |
| GET | /api/2fa/totp/status | Get TOTP enrollment state |
| POST | /api/2fa/totp/setup | Generate TOTP secret + QR |
| POST | /api/2fa/totp/verify-setup | Verify code, enable TOTP |
| POST | /api/2fa/totp/disable | Verify password, disable TOTP |
| GET | /api/auth/trust-device-status | Current browser trust state |
| POST | /api/auth/trust-current-device | Trust current browser |
| POST | /api/auth/untrust-current-device | Remove trust for current browser |

## 5. Database tables

### users (security columns)
- email_2fa_enabled (INTEGER 0/1)
- two_factor_enabled (INTEGER 0/1) — legacy, kept for compat
- suspended (INTEGER 0/1)
- suspended_at (DATETIME)
- suspended_reason (TEXT)

### trusted_devices
- user_id, device_token (fingerprint), device_name, user_agent, ip_address
- expires_at, last_used_at
- TTL: 30 days

### two_factor_methods
- user_id, method_type ('authenticator'), label
- secret (AES-256-GCM encrypted with CREVIO_2FA_ENCRYPTION_KEY)
- is_primary, is_verified

### sessions
- user_id, session_token_hash (SHA-256 of JWT), user_agent, ip_address
- expires_at, revoked_at, last_seen_at

### password_history
- user_id, password_hash (bcrypt)
- Keeps last 5 passwords; reuse blocked at change + reset

### security_events
- Audit log of lockdowns, unlocks, and other sensitive events

## 6. Environment variables

| Variable | Purpose |
|---|---|
| JWT_SECRET | Sign/verify JWTs |
| CREVIO_2FA_ENCRYPTION_KEY | 64-hex-char key for encrypting TOTP secrets |
| RESEND_API_KEY | Send emails via Resend |
| RESEND_FROM_EMAIL | Sender address (e.g. Crevio <security@...>) |
| APP_URL | Base URL for links in emails |

**Note:** Never rotate CREVIO_2FA_ENCRYPTION_KEY without re-encrypting all existing TOTP secrets, or users will lose 2FA access.

## 7. otplib version note

`totpService.js` uses **otplib v13's** `verifySync({ secret, token })` API. If otplib is ever downgraded to v12, the API changes (`otplib.authenticator.check()`).

The v13 verifySync returns `{ valid: boolean, delta, epoch, timeStep }` — we read `.valid`.

**Drift tolerance:** `window: 1` was attempted but v13's verifySync doesn't honor it in this build. Users entering the code in the final second of a 30-second window may need to wait for the next code. Rare enough for MVP.

## 8. Frontend structure

| File | Purpose |
|---|---|
| dashboard/pages/security.html | Security settings page with modals |
| dashboard/js/security.js | All Security page logic |
| dashboard/js/settings.js | Trust This Device toggle + credentials |
| dashboard/js/crevio-alert.js | Reusable alert dialog |
| dashboard/js/crevio-confirm.js | Reusable confirm dialog |
| admin/pages/login.html | Login page with 2FA step |
| admin/js/login.js | Login flow (password → 2FA → token) |
| admin/pages/reset-password.html | 3-step reset page |
| admin/pages/locked.html | Success/error landing after compromise report |
| admin/pages/locked-confirm.html | Confirm page before lockdown |

## 9. Security events pipeline

Every login (successful or 2FA-gated) triggers `loginSecurityService.recordLogin`:
- Inserts session row into `sessions`
- Computes device fingerprint
- If device is new + not first-ever login → creates notification + queues email with a 'This wasn't you' lockdown token
- Fire-and-forget: never blocks the login

## 10. Compromise lockdown flow

```
User clicks 'This wasn't me' in email
  ↓
GET /api/security/report-compromise?token=xyz
  ↓
Token valid? → redirect to locked-confirm.html
  ↓
User clicks 'Secure my account'
  ↓
POST /api/security/report-compromise { token }
  ↓
  lockdownService.lockdown({ userId, ... })
    - users.suspended = 1
    - DELETE FROM sessions WHERE user_id = ?
    - DELETE FROM trusted_devices WHERE user_id = ?
    - Create password_reset_compromise verification token
    - Send email with reset link
    - Log security_event 'account_lockdown'
  ↓
User clicks reset link
  ↓
1. Set new password (reuse check blocks last 5)
2. Verify email OTP (10-min expiry, 5 attempts)
3. If TOTP enabled, verify authenticator code
  ↓
Account unlocked → confirmation email sent
```

## 11. Recovery codes

Generated via `/api/security/recovery-codes` (8 codes, 10 chars each, dash after 5th char).

**Current UX:** shown via `crevioAlert` with codes listed. Future improvement: dedicated modal with copy/download buttons.

**Storage:** hashed in `two_factor_recovery_codes.code_hash` — used for future password reset when user has lost both device and authenticator.

## 12. Locks

All security features are protected by locks. Run `node scripts/verify-locks.js` before any commit. Currently 95+ locks pass.

Relevant lock IDs:
- phase-P1a-login-2fa-gate
- phase-P1a-middleware-rejects-ticket
- phase-P1a-login-2fa-ui
- phase-P1b-email2fa-column
- phase-P1b-email2fa-status
- phase-P1b-email2fa-load
- phase-D7-totp-enrollment
- phase-D7-totp-status-ui
- phase-D8-trust-endpoints
- phase-D8-login-hides-checkbox
- phase-D8-settings-trust-toggle
- sessions-parsed-devices
- security-page-crevio-dialogs
- password-history-table
- password-reuse-blocked

## 13. Known gaps

| Gap | Severity | Notes |
|---|---|---|
| Recovery codes UX uses alert-style display | P3 | Should be a proper modal with copy/download |
| TOTP drift tolerance `window: 1` not honored | P3 | Rare user-visible issue, retry works |
| Sessions may not record on every login | P2 | Diagnostic script confirms; synthetic fallback masks |

## 14. Troubleshooting

### 2FA enrollment shows 'Incorrect code'
Check that otplib is v13 (`otplib.verifySync`). The service uses v13 API — v12 uses different calls. Verify the server restarted after patching `totpService.js`.

### Email 2FA toggle resets on reload
Check `/api/security/2fa-status` is registered in `securityRoutes.js`. Requires column `users.email_2fa_enabled` — run `scripts/migrate-email-2fa.js`.

### Sessions list empty
If DB has no sessions, the current browser is shown as a synthetic entry (id: 0). After one more login, a real row appears.

### Sign out all other devices logs me out too
`authMiddleware.js` must set `req.user.token` so the controller can exclude the current session's hash. Verify with the file check in the test suite.

---

**End of document.**
