// =========================================================
// CREVIO — SECURITY PAGE
// File: dashboard/js/security.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const toast             = $("toast");
    const passwordForm      = $("passwordForm");
    const newPasswordInput  = $("newPassword");
    const strengthBar       = $("strengthBar");
    const strengthHint      = $("strengthHint");
    const sessionsContainer = $("sessionsContainer");
    const twoFactorToggle   = $("twoFactorEmail");

    // =========================================================
    // PASSWORD STRENGTH
    // =========================================================
    newPasswordInput?.addEventListener("input", function () {
        const pw = this.value;
        let score = 0;
        if (pw.length >= 8)  score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        strengthBar.classList.remove("strength-weak", "strength-medium", "strength-strong");

        if (pw.length === 0) {
            strengthBar.style.width = "0%";
            strengthHint.textContent = "At least 8 characters";
            strengthHint.style.color = "var(--text-muted)";
        } else if (score <= 2) {
            strengthBar.classList.add("strength-weak");
            strengthBar.style.width = "33%";
            strengthHint.textContent = "Weak — add uppercase, numbers, symbols";
            strengthHint.style.color = "var(--danger)";
        } else if (score <= 3) {
            strengthBar.classList.add("strength-medium");
            strengthBar.style.width = "66%";
            strengthHint.textContent = "Medium — could be stronger";
            strengthHint.style.color = "var(--warning)";
        } else {
            strengthBar.classList.add("strength-strong");
            strengthBar.style.width = "100%";
            strengthHint.textContent = "Strong password ✓";
            strengthHint.style.color = "var(--success)";
        }
    });

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================
    passwordForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const current = $("currentPassword").value;
        const next    = $("newPassword").value;
        const confirm = $("confirmPassword").value;

        if (next !== confirm) return showToast("New passwords don't match", true);
        if (next.length < 8)  return showToast("Password must be at least 8 characters", true);
        if (next === current) return showToast("New password must be different", true);

        const btn = $("changePasswordBtn");
        btn.disabled = true;
        btn.textContent = "Changing...";

        try {
            const res  = await window.apiFetch("/api/security/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword: current, newPassword: next })
            });
            const data = await res.json();

            if (data.success) {
                showToast("Password changed successfully");
                passwordForm.reset();
                strengthBar.style.width = "0%";
                strengthHint.textContent = "At least 8 characters";
                strengthHint.style.color = "var(--text-muted)";
            } else {
                showToast(data.message || "Failed", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="key" class="icon" style="width:16px;height:16px;"></i> Change Password`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    // =========================================================
    // SESSIONS
    // =========================================================
    async function loadSessions() {
        sessionsContainer.innerHTML = `<div class="loading">Loading sessions...</div>`;
        try {
            const res  = await window.apiFetch("/api/security/sessions");
            const data = await res.json();
            const sessions = data.sessions || [];

            if (!sessions.length) {
                sessionsContainer.innerHTML = `<div class="empty-state">No active sessions found.</div>`;
                return;
            }

            sessionsContainer.innerHTML = sessions.map(renderSession).join("");
            if (typeof lucide !== "undefined") lucide.createIcons();

            sessionsContainer.querySelectorAll("[data-revoke]").forEach(el => {
                el.addEventListener("click", async () => {
                    const id = el.dataset.revoke;
                    if (!confirm("Sign out this device?")) return;
                    try {
                        const res  = await window.apiFetch(`/api/security/sessions/${id}`, { method: "DELETE" });
                        const data = await res.json();
                        if (data.success) {
                            showToast("Session revoked");
                            loadSessions();
                        } else {
                            showToast(data.message || "Failed", true);
                        }
                    } catch (err) { showToast("Failed: " + err.message, true); }
                });
            });
        } catch (err) {
            console.error("Load sessions error:", err);
            sessionsContainer.innerHTML = `<div class="empty-state">Could not load sessions.</div>`;
        }
    }

    function renderSession(s) {
        const isCurrent = s.is_current;
        const device    = s.device || "Unknown device";
        const ip        = s.ip_address || "Unknown IP";
        const lastSeen  = formatRelativeTime(s.last_active_at || s.created_at);
        const icon      = deviceIcon(device);

        return `
            <div class="session-item">
                <div class="session-icon"><i data-lucide="${icon}" class="icon"></i></div>
                <div class="session-info">
                    <h4>${escapeHtml(device)}${isCurrent ? '<span class="current">• Current</span>' : ""}</h4>
                    <div class="meta">${escapeHtml(ip)} • ${lastSeen}</div>
                </div>
                ${isCurrent ? "" : `
                    <button class="btn-danger" data-revoke="${s.id}" style="padding:6px 12px; font-size:12px;">
                        Sign out
                    </button>
                `}
            </div>
        `;
    }

    function deviceIcon(ua) {
        const u = (ua || "").toLowerCase();
        if (u.includes("mobile") || u.includes("android") || u.includes("iphone")) return "smartphone";
        if (u.includes("tablet") || u.includes("ipad")) return "tablet";
        return "monitor";
    }

    // =========================================================
    // REVOKE ALL
    // =========================================================
    $("logoutAllBtn")?.addEventListener("click", async () => {
        if (!confirm("Sign out all other devices? You'll stay signed in here.")) return;
        try {
            const res  = await window.apiFetch("/api/security/sessions", { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("All other sessions signed out");
                loadSessions();
            } else {
                showToast(data.message || "Failed", true);
            }
        } catch (err) { showToast("Failed: " + err.message, true); }
    });

    // =========================================================
    // 2FA TOGGLE
    // =========================================================
    twoFactorToggle?.addEventListener("change", async function () {
        const enabled = this.checked;
        try {
            const res  = await window.apiFetch("/api/security/2fa", {
                method: "POST",
                body: JSON.stringify({ email_2fa: enabled })
            });
            const data = await res.json();
            if (data.success) {
                showToast(enabled ? "Email 2FA enabled" : "Email 2FA disabled");
            } else {
                this.checked = !enabled;
                showToast(data.message || "Failed", true);
            }
        } catch (err) {
            this.checked = !enabled;
            showToast("Failed: " + err.message, true);
        }
    });

    // =========================================================
    // RECOVERY CODES
    // =========================================================
    $("generateCodesBtn")?.addEventListener("click", async () => {
        if (!confirm("Generate new recovery codes? Old ones will stop working.")) return;
        try {
            const res  = await window.apiFetch("/api/security/recovery-codes", { method: "POST" });
            const data = await res.json();
            if (data.success && data.codes) {
                alert("Save these recovery codes in a safe place:\n\n" + data.codes.join("\n"));
            } else {
                showToast(data.message || "Failed", true);
            }
        } catch (err) { showToast("Failed: " + err.message, true); }
    });

    // =========================================================
    // HELPERS
    // =========================================================
    let toastTimer;
    function showToast(msg, isError = false) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function formatRelativeTime(str) {
        if (!str) return "unknown";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            const diff = Date.now() - d.getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1)  return "just now";
            if (m < 60) return m + " min ago";
            const h = Math.floor(m / 60);
            if (h < 24) return h + "h ago";
            const day = Math.floor(h / 24);
            if (day < 7) return day + "d ago";
            return d.toLocaleDateString();
        } catch { return str; }
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadSessions();
});