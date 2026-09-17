// =========================================================
// CREVIO — ACCOUNT MANAGEMENT PAGE
// File: dashboard/js/account-management.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const toast            = $("toast");
    const deactivateModal  = $("deactivateModal");
    const deleteModal      = $("deleteModal");
    const deleteInput      = $("deleteConfirmInput");
    const confirmDelete    = $("confirmDelete");
    const exportBtn        = $("exportBtn");
    const deactivateBtn    = $("deactivateBtn");
    const deleteBtn        = $("deleteBtn");

    // =========================================================
    // LOAD OVERVIEW
    // =========================================================
    async function loadOverview() {
        const container = $("overviewContainer");
        container.innerHTML = `<div class="loading">Loading account info...</div>`;

        try {
            const res  = await window.apiFetch("/api/account/overview");
            const data = await res.json();

            if (!data.success || !data.account) {
                container.innerHTML = `<div class="loading">Could not load account info.</div>`;
                return;
            }

            const a = data.account;
            const status      = (a.account_status || "active").toLowerCase();
            const statusClass = status === "active" ? "active"
                                : status === "deactivated" ? "warning"
                                : status === "pending_deletion" ? "danger"
                                : "muted";
            const statusLabel = status === "active" ? "Active"
                                : status === "deactivated" ? "Deactivated"
                                : status === "pending_deletion" ? "Pending Deletion"
                                : status.charAt(0).toUpperCase() + status.slice(1);

            const memberSince = a.created_at ? formatDate(a.created_at) : "Unknown";

            container.innerHTML = `
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Username</div>
                        <div class="value">${escapeHtml(a.username || "—")}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Email</div>
                        <div class="value">${escapeHtml(a.email || "—")}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Display Name</div>
                        <div class="value">${escapeHtml(a.display_name || "—")}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Role</div>
                        <div class="value" style="text-transform:capitalize;">${escapeHtml(a.role || "creator")}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Account Status</div>
                        <div class="value"><span class="badge ${statusClass}">${statusLabel}</span></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Member Since</div>
                        <div class="value">${memberSince}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Projects</div>
                        <div class="value">${a.totalProjects ?? 0}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Services</div>
                        <div class="value">${a.totalServices ?? 0}</div>
                    </div>
                </div>
            `;

            // Deletion banner
            if (a.deletion_scheduled_for) {
                const banner = `
                    <div class="deletion-banner">
                        <div class="left">
                            <h3>⚠️ Account scheduled for deletion</h3>
                            <p>Your account will be permanently deleted on <strong>${formatDate(a.deletion_scheduled_for)}</strong>.</p>
                        </div>
                        <button class="btn-primary" id="cancelDeletionBtn">
                            <i data-lucide="x-circle" class="icon" style="width:14px;height:14px;"></i>
                            Cancel Deletion
                        </button>
                    </div>
                `;
                $("deletionBannerContainer").innerHTML = banner;
                if (typeof lucide !== "undefined") lucide.createIcons();

                $("cancelDeletionBtn")?.addEventListener("click", async () => {
                    if (!confirm("Cancel account deletion? Your account will be restored.")) return;
                    try {
                        const res  = await window.apiFetch("/api/account/cancel-deletion", { method: "POST" });
                        const data = await res.json();
                        if (data.success) {
                            showToast("Deletion cancelled");
                            loadOverview();
                        } else {
                            showToast(data.message || "Failed", true);
                        }
                    } catch (err) { showToast("Failed: " + err.message, true); }
                });
            } else {
                $("deletionBannerContainer").innerHTML = "";
            }
        } catch (err) {
            console.error("Load overview error:", err);
            container.innerHTML = `<div class="loading">Could not load account info.</div>`;
        }
    }

    // =========================================================
    // MODAL OPEN/CLOSE
    // =========================================================
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
        btn.addEventListener("click", () => {
            deactivateModal.classList.remove("open");
            deleteModal.classList.remove("open");
        });
    });

    [deactivateModal, deleteModal].forEach(m => {
        m?.addEventListener("click", (e) => {
            if (e.target === m) m.classList.remove("open");
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            deactivateModal.classList.remove("open");
            deleteModal.classList.remove("open");
        }
    });

    // =========================================================
    // EXPORT DATA
    // =========================================================
    exportBtn?.addEventListener("click", async () => {
        exportBtn.disabled = true;
        const original = exportBtn.innerHTML;
        exportBtn.innerHTML = `<i data-lucide="loader" class="icon" style="width:14px;height:14px;"></i> Preparing...`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/account/export", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Export failed (" + res.status + ")");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `crevio-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast("Data export downloaded");
        } catch (err) {
            showToast("Export failed: " + err.message, true);
        } finally {
            exportBtn.disabled = false;
            exportBtn.innerHTML = original;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    // =========================================================
    // DEACTIVATE
    // =========================================================
    deactivateBtn?.addEventListener("click", () => {
        $("deactivateReason").value = "";
        deactivateModal.classList.add("open");
    });

    $("confirmDeactivate")?.addEventListener("click", async () => {
        const reason = $("deactivateReason").value.trim();
        const btn = $("confirmDeactivate");
        btn.disabled = true;
        btn.textContent = "Deactivating...";

        try {
            const res  = await window.apiFetch("/api/account/deactivate", {
                method: "POST",
                body: JSON.stringify({ reason })
            });
            const data = await res.json();

            if (data.success) {
                deactivateModal.classList.remove("open");
                showToast("Account deactivated. Logging out...");
                loadOverview();
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/admin/pages/login.html";
                }, 2000);
            } else {
                showToast(data.message || "Failed to deactivate", true);
                btn.disabled = false;
                btn.textContent = "Yes, Deactivate";
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
            btn.disabled = false;
            btn.textContent = "Yes, Deactivate";
        }
    });

    // =========================================================
    // DELETE
    // =========================================================
    deleteBtn?.addEventListener("click", () => {
        $("deleteConfirmInput").value = "";
        $("deleteReason").value = "";
        confirmDelete.disabled = true;
        deleteModal.classList.add("open");
    });

    deleteInput?.addEventListener("input", function () {
        confirmDelete.disabled = this.value.trim() !== "DELETE";
    });

    confirmDelete?.addEventListener("click", async () => {
        const reason = $("deleteReason").value.trim();
        confirmDelete.disabled = true;
        confirmDelete.textContent = "Deleting...";

        try {
            const res  = await window.apiFetch("/api/account/delete", {
                method: "POST",
                body: JSON.stringify({ reason })
            });
            const data = await res.json();

            if (data.success) {
                deleteModal.classList.remove("open");
                showToast("Account scheduled for deletion");
                loadOverview();
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/admin/pages/login.html";
                }, 2500);
            } else {
                showToast(data.message || "Failed", true);
                confirmDelete.disabled = false;
                confirmDelete.textContent = "Delete Forever";
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
            confirmDelete.disabled = false;
            confirmDelete.textContent = "Delete Forever";
        }
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
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
    }

    function formatDate(str) {
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
    loadOverview();
});