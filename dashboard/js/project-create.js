// =========================================================
// CREVIO — CREATE PROJECT PAGE
// File: dashboard/js/project-create.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const form       = document.getElementById("projectForm");
    const saveBtn    = document.getElementById("saveBtn");
    const publishBtn = document.getElementById("publishBtn");
    const toast      = document.getElementById("toast");

    // ---------- SAVE ----------
    async function saveProject(status) {
        const title = document.getElementById("title");
        const description = document.getElementById("description");
        const url = document.getElementById("url");
        const category = document.getElementById("category");
        const thumbnail = document.getElementById("thumbnail");

        const payload = {
            title:       (title?.value || "").trim(),
            description: (description?.value || "").trim(),
            url:         (url?.value || "").trim(),
            category:    (category?.value || "web"),
            thumbnail:   (thumbnail?.value || "").trim(),
            status:      status
        };

        if (!payload.title) {
            showToast("Project title is required", true);
            title?.focus();
            return;
        }

        const btn = status === "published" ? publishBtn : saveBtn;
        const originalText = btn?.innerHTML;

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="icon" style="width:14px;height:14px;"></i> Saving...`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }

        try {
            const res  = await window.apiFetch("/api/projects", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success && data.project) {
                showToast(`Project ${status === "published" ? "published" : "saved"}`);
                setTimeout(() => {
                    window.location.href = `/dashboard/pages/project-edit.html?id=${data.project.id}`;
                }, 800);
            } else {
                showToast(data.message || "Failed to save", true);
            }
        } catch (err) {
            console.error("Save error:", err);
            showToast("Failed: " + err.message, true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    }

    form?.addEventListener("submit", (e) => {
        e.preventDefault();
        saveProject("draft");
    });

    saveBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        saveProject("draft");
    });

    publishBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        saveProject("published");
    });

    // ---------- TOAST ----------
    let toastTimer;
    function showToast(msg, isError = false) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // ---------- INIT ----------
    if (typeof lucide !== "undefined") lucide.createIcons();
});