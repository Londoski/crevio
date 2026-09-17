// =========================================================
// CREVIO — PROJECT EDITOR (create + edit)
// File: dashboard/js/project-edit.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const toast = $("toast");

    let projectId = null;
    let currentStatus = "draft";
    let coverUrl = null;        // server URL (what gets saved)
    let coverLocalPreview = null; // temporary local preview

    function getIdFromURL() {
        const p = new URLSearchParams(window.location.search);
        return p.get("id") ? parseInt(p.get("id"), 10) : null;
    }

    // =========================================================
    // LOAD
    // =========================================================
    async function loadProject(id) {
        try {
            const res  = await apiFetch(`/api/projects/${id}`);
            const data = await res.json();
            if (!data.success || !data.project) throw new Error("Not found");

            const p = data.project;
            projectId = p.id;

            $("title").value         = p.name || "";
            $("description").value   = p.description || "";
            $("category").value      = p.category || "";
            $("project_year").value  = p.project_year || "";
            $("client_name").value   = p.client_name || "";
            $("role").value          = p.role || "";
            $("content").value       = p.content || "";

            if (p.thumbnail_url) {
                coverUrl = p.thumbnail_url;
                showCoverPreview(coverUrl);
            }

            currentStatus = p.published ? "published" : "draft";
            updateStatusUI();

            $("pageTitle").textContent    = "Edit Project";
            $("pageSubtitle").textContent = `Editing "${p.name || "Untitled"}"`;

            $("deleteBtn").style.display = "";
            $("duplicateBtn").style.display = "";

            $("descCount").textContent = (p.description || "").length;
        } catch (err) {
            console.error("Load error:", err);
            showToast("Could not load project: " + err.message, true);
        }
    }

    // =========================================================
    // SAVE
    // =========================================================
    async function save(status) {
        const title = $("title").value.trim();
        if (!title) {
            showToast("Project title is required", true);
            $("title").focus();
            return;
        }

        const payload = {
            name:          title,
            description:   $("description").value.trim(),
            category:      $("category").value.trim(),
            project_year:  $("project_year").value ? parseInt($("project_year").value, 10) : null,
            client_name:   $("client_name").value.trim() || null,
            role:          $("role").value.trim() || null,
            content:       $("content").value.trim() || null,
            thumbnail_url: coverUrl,
            published:     status === "published"
        };

        console.log("💾 Saving project with payload:", payload);

        const btn = status === "published" ? $("publishBtn") : $("saveDraftBtn");
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = "Saving…";

        try {
            const method = projectId ? "PATCH" : "POST";
            const url    = projectId ? `/api/projects/${projectId}` : "/api/projects";
            const res    = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const data   = await res.json();

            if (!data.success) throw new Error(data.message || "Save failed");

            if (data.project && data.project.id) projectId = data.project.id;
            currentStatus = status === "published" ? "published" : "draft";
            updateStatusUI();

            showToast(status === "published" ? "Project published" : "Saved as draft");

            if (!window.location.search.includes("id=") && projectId) {
                const u = new URL(window.location);
                u.searchParams.set("id", projectId);
                window.history.replaceState({}, "", u);
                $("pageTitle").textContent = "Edit Project";
                $("deleteBtn").style.display = "";
                $("duplicateBtn").style.display = "";
            }
        } catch (err) {
            console.error("Save error:", err);
            showToast("Save failed: " + err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // STATUS UI
    // =========================================================
    function updateStatusUI() {
        const isPub = currentStatus === "published";
        $("statusValue").textContent = isPub ? "Published" : "Draft";
        $("statusDot").className = "status-dot " + (isPub ? "published" : "draft");
    }

    // =========================================================
    // COVER UPLOAD
    // =========================================================
    $("coverUploader")?.addEventListener("click", () => $("coverInput").click());

    $("coverInput")?.addEventListener("change", async function () {
        const file = this.files[0];
        this.value = "";

        if (!file) return;

        // Validate
        if (file.size > 8 * 1024 * 1024) {
            return showToast("Image too large (max 8MB)", true);
        }
        if (!file.type.startsWith("image/")) {
            return showToast("Only image files are allowed", true);
        }

        // ---- IMMEDIATE local preview ----
        // This ALWAYS shows, regardless of upload success
        const reader = new FileReader();
        reader.onload = (e) => {
            coverLocalPreview = e.target.result;
            showCoverPreview(coverLocalPreview);
            console.log("🖼️ Local preview loaded");
        };
        reader.readAsDataURL(file);

        // ---- Upload to server ----
        const fd = new FormData();
        fd.append("cover", file);

        try {
            const token = localStorage.getItem("token");
            console.log("📤 Uploading cover:", file.name, file.type, file.size);

            const res = await fetch("/api/projects/upload-cover", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: fd
            });

            console.log("📥 Upload response status:", res.status);

            const data = await res.json();
            console.log("📥 Upload response body:", data);

            if (data.success && data.url) {
                coverUrl = data.url;
                showCoverPreview(coverUrl);
                showToast("✅ Cover uploaded — remember to save the project");
            } else {
                // Upload failed — keep local preview but warn user it won't be saved
                showToast("⚠️ Cover uploaded to page but not saved to server. Save may not persist the cover.", true);
                console.error("Upload failed:", data);
            }
        } catch (err) {
            console.error("Upload error:", err);
            // Keep local preview
            showToast("⚠️ Server upload failed: " + err.message + " — cover preview will not be saved", true);
        }
    });

    function showCoverPreview(url) {
        const img = $("coverPreviewImg");
        const wrap = $("coverPreview");
        if (!img || !wrap) {
            console.error("Missing cover preview elements");
            return;
        }
        img.src = url;
        wrap.classList.add("show");
    }

    $("coverRemove")?.addEventListener("click", () => {
        coverUrl = null;
        coverLocalPreview = null;
        $("coverPreview").classList.remove("show");
        $("coverPreviewImg").src = "";
    });

    // =========================================================
    // DELETE
    // =========================================================
    $("deleteBtn")?.addEventListener("click", async () => {
        if (!projectId) return;
        if (!confirm("Delete this project permanently? This cannot be undone.")) return;
        try {
            const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("Project deleted");
                setTimeout(() => location.href = "/dashboard/pages/projects.html", 800);
            } else {
                showToast(data.message || "Delete failed", true);
            }
        } catch (err) {
            showToast("Delete failed: " + err.message, true);
        }
    });

    // =========================================================
    // DUPLICATE
    // =========================================================
    $("duplicateBtn")?.addEventListener("click", async () => {
        if (!projectId) return;
        try {
            const res = await apiFetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
            const data = await res.json();
            if (data.success && data.project) {
                showToast("Project duplicated");
                setTimeout(() => location.href = `/dashboard/pages/project-edit.html?id=${data.project.id}`, 600);
            } else {
                showToast(data.message || "Duplicate failed", true);
            }
        } catch (err) {
            showToast("Duplicate failed: " + err.message, true);
        }
    });

    // =========================================================
    // PREVIEW
    // =========================================================
    $("previewBtn")?.addEventListener("click", () => {
        if (!projectId) return showToast("Save the project first to preview it", true);
        window.open(`/p/preview/project/${projectId}`, "_blank");
    });

    // =========================================================
    // BUTTON HANDLERS
    // =========================================================
    $("saveDraftBtn")?.addEventListener("click", () => save("draft"));
    $("publishBtn")?.addEventListener("click",   () => save("published"));

    $("description")?.addEventListener("input", function () {
        $("descCount").textContent = this.value.length;
    });

    // =========================================================
    // HELPERS
    // =========================================================
    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem("token");
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/admin/pages/login.html";
            throw new Error("Unauthorized");
        }
        return res;
    }

    let toastTimer;
    function showToast(msg, isError = false) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // =========================================================
    // INIT
    // =========================================================
    projectId = getIdFromURL();
    if (projectId) {
        loadProject(projectId);
    } else {
        $("pageTitle").textContent = "New Project";
        $("pageSubtitle").textContent = "Create a new project for your portfolio";
        updateStatusUI();
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
});