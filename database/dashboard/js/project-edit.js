// =========================================================
// CREVIO — EDIT PROJECT
// File: dashboard/js/project-edit.js
// Reads { name, published } and maps to { title, status }
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const form       = $("projectForm");
    const saveBtn    = $("saveBtn");
    const publishBtn = $("publishBtn");
    const deleteBtn  = $("deleteBtn");
    const toast      = $("toast");

    let projectId = null;

    // ---------- GET ID FROM URL ----------
    function getIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id") ? parseInt(params.get("id"), 10) : null;
    }

    // ---------- LOAD PROJECT ----------
    async function loadProject(id) {
        try {
            const res  = await window.apiFetch(`/api/projects/${id}`);
            const data = await res.json();

            if (!data.success || !data.project) {
                showToast("Project not found", true);
                setTimeout(() => {
                    window.location.href = "/dashboard/pages/projects.html";
                }, 1200);
                return;
            }

            const p = data.project;

            // Map DB schema → form fields
            const name   = p.name || p.title || "";
            const status = p.published === 1 || p.status === "published" ? "published" : "draft";
            const thumb  = p.thumbnail_url || p.thumbnail || "";

            if ($("title"))       $("title").value       = name;
            if ($("description")) $("description").value = p.description || "";
            if ($("url"))         $("url").value         = p.url || "";
            if ($("category"))    $("category").value    = p.category || "web";
            if ($("status"))      $("status").value      = status;
            if ($("thumbnail"))   $("thumbnail").value   = thumb;

            if ($("pageTitle")) $("pageTitle").textContent = "Edit Project";
        } catch (err) {
            console.error("Load project error:", err);
            showToast("Failed to load project: " + err.message, true);
        }
    }

    // ---------- SAVE ----------
    async function saveProject(status) {
        if (!projectId) return;

        const payload = {
            title:       ($("title")?.value || "").trim(),
            description: ($("description")?.value || "").trim(),
            url:         ($("url")?.value || "").trim(),
            category:    ($("category")?.value || "web"),
            thumbnail:   ($("thumbnail")?.value || "").trim(),
            status:      status
        };

        if (!payload.title) {
            showToast("Project title is required", true);
            $("title")?.focus();
            return;
        }

        const btn = status === "published" ? publishBtn : saveBtn;
        const originalHTML = btn?.innerHTML;

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="icon" style="width:14px;height:14px;"></i> Saving...`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }

        try {
            const res  = await window.apiFetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showToast(`Project ${status === "published" ? "published" : "saved"}`);
                if ($("status")) $("status").value = status;
            } else {
                showToast(data.message || "Failed to save", true);
            }
        } catch (err) {
            console.error("Save error:", err);
            showToast("Failed: " + err.message, true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    }

    // ---------- DELETE ----------
    async function deleteProject() {
        if (!projectId) return;
        if (!confirm("Delete this project permanently? This cannot be undone.")) return;

        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `Deleting...`;
        }

        try {
            const res  = await window.apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("Project deleted");
                setTimeout(() => {
                    window.location.href = "/dashboard/pages/projects.html";
                }, 800);
            } else {
                showToast(data.message || "Delete failed", true);
                if (deleteBtn) {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = `<i data-lucide="trash-2" class="icon" style="width:14px;height:14px;"></i> Delete`;
                    if (typeof lucide !== "undefined") lucide.createIcons();
                }
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `<i data-lucide="trash-2" class="icon" style="width:14px;height:14px;"></i> Delete`;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    }

    // ---------- EVENT HANDLERS ----------
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

    deleteBtn?.addEventListener("click", deleteProject);

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
    projectId = getIdFromURL();

    if (!projectId) {
        showToast("No project ID specified", true);
        setTimeout(() => {
            window.location.href = "/dashboard/pages/projects.html";
        }, 1000);
        return;
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
    loadProject(projectId);
});