// =========================================================
// CREVIO — PROJECTS LIST PAGE
// File: dashboard/js/projects.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container  = $("projectsContainer");
    const searchIn   = $("searchInput");
    const sortSelect = $("sortSelect");
    const toast      = $("toast");

    let filter  = "all";
    let search  = "";
    let sort    = "updated";
    let debounceTimer;

    // =========================================================
    // LOAD STATS
    // =========================================================
    async function loadStats() {
        try {
            const res  = await window.apiFetch("/api/projects/stats");
            const data = await res.json();
            if (data.success) {
                $("statTotal").textContent     = data.stats.total;
                $("statPublished").textContent = data.stats.published;
                $("statDrafts").textContent    = data.stats.drafts;
            }
        } catch (err) {
            console.error("Stats error:", err);
        }
    }

    // =========================================================
    // LOAD PROJECTS
    // =========================================================
    async function loadProjects() {
        container.innerHTML = `<div class="state-box"><p>Loading projects…</p></div>`;
        try {
            const url = `/api/projects?filter=${filter}&sort=${sort}&search=${encodeURIComponent(search)}`;
            const res  = await window.apiFetch(url);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            renderProjects(data.projects || []);
        } catch (err) {
            console.error("Load error:", err);
            container.innerHTML = `
                <div class="state-box error">
                    <i data-lucide="alert-triangle" class="icon-lg"></i>
                    <h3>We couldn't load your projects.</h3>
                    <p>${escapeHtml(err.message)}</p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i data-lucide="refresh-cw" class="icon" style="width:14px;height:14px;"></i> Try Again
                    </button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function renderProjects(projects) {
        if (!projects.length) {
            const msg = search || filter !== "all"
                ? "No projects match your filters."
                : "Your projects will live here.";

            const sub = search || filter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first project to start building your professional portfolio.";

            container.innerHTML = `
                <div class="state-box">
                    <i data-lucide="folder-open" class="icon-lg"></i>
                    <h3>${msg}</h3>
                    <p>${sub}</p>
                    <a href="/dashboard/pages/project-edit.html" class="btn-primary">
                        <i data-lucide="plus" class="icon" style="width:14px;height:14px;"></i> Create Project
                    </a>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            return;
        }

        container.innerHTML = `<div class="projects-grid">${projects.map(renderCard).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        wireActions();
    }

    function renderCard(p) {
        const status   = p.published ? "published" : "draft";
        const year     = p.project_year || (p.created_at ? new Date(p.created_at.replace(" ","T")+"Z").getFullYear() : "");
        const category = p.category || "Uncategorized";

        return `
            <div class="project-card" data-id="${p.id}">
                <div class="card-cover">
                  ${p.thumbnail_url
    ? `<img src="${escapeHtml(p.thumbnail_url)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{innerHTML:'<i data-lucide=\\'image\\' style=\\'width:36px;height:36px;opacity:0.4\\'></i>'}));if(typeof lucide!==\\'undefined\\')lucide.createIcons();">`
    : `<i data-lucide="image" class="placeholder-icon"></i>`}
                </div>

                <div class="card-actions">
                    <button class="actions-toggle" data-menu-toggle="${p.id}">
                        <i data-lucide="more-vertical" class="icon"></i>
                    </button>
                    <div class="actions-menu" data-menu="${p.id}">
                        <button data-action="edit" data-id="${p.id}">
                            <i data-lucide="pencil" class="icon"></i> Edit
                        </button>
                        <button data-action="preview" data-id="${p.id}">
                            <i data-lucide="eye" class="icon"></i> Preview
                        </button>
                        ${p.published
                            ? `<button data-action="unpublish" data-id="${p.id}"><i data-lucide="eye-off" class="icon"></i> Unpublish</button>`
                            : `<button data-action="publish" data-id="${p.id}"><i data-lucide="upload-cloud" class="icon"></i> Publish</button>`}
                        <button data-action="duplicate" data-id="${p.id}">
                            <i data-lucide="copy" class="icon"></i> Duplicate
                        </button>
                        <button data-action="delete" data-id="${p.id}" class="danger">
                            <i data-lucide="trash-2" class="icon"></i> Delete
                        </button>
                    </div>
                </div>

                <div class="card-body">
                    <div class="card-title">${escapeHtml(p.name || "Untitled")}</div>
                    <div class="card-meta">
                        <span>${escapeHtml(category)}</span>
                        ${year ? `<span class="dot">•</span><span>${year}</span>` : ""}
                        ${p.client_name ? `<span class="dot">•</span><span>${escapeHtml(p.client_name)}</span>` : ""}
                    </div>
                    <div class="card-footer">
                        <span class="status-pill ${status}">${status}</span>
                        <span class="updated-time">${formatRelative(p.updated_at || p.created_at)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // WIRE ACTIONS
    // =========================================================
    function wireActions() {
        // Toggle menus
        container.querySelectorAll("[data-menu-toggle]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.dataset.menuToggle;
                const menu = container.querySelector(`[data-menu="${id}"]`);
                const isOpen = menu.classList.contains("open");
                closeAllMenus();
                if (!isOpen) menu.classList.add("open");
            });
        });

        // Action buttons
        container.querySelectorAll("[data-action]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                closeAllMenus();

                switch (action) {
                    case "edit":      window.location.href = `/dashboard/pages/project-edit.html?id=${id}`; break;
                    case "preview":   window.open(`/p/preview/project/${id}`, "_blank"); break;
                    case "publish":   await doAction(id, "publish", "Project published"); break;
                    case "unpublish": await doAction(id, "unpublish", "Project unpublished"); break;
                    case "duplicate": await doAction(id, "duplicate", "Project duplicated"); break;
                    case "delete":    await deleteProject(id); break;
                }
            });
        });

        // Click outside closes menus
        document.addEventListener("click", closeAllMenus);
    }

    function closeAllMenus() {
        container.querySelectorAll(".actions-menu.open").forEach(m => m.classList.remove("open"));
    }

    async function doAction(id, action, successMsg) {
        try {
            const res = await window.apiFetch(`/api/projects/${id}/${action}`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                showToast(successMsg);
                await Promise.all([loadStats(), loadProjects()]);
            } else {
                showToast(data.message || "Failed", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        }
    }

    async function deleteProject(id) {
        if (!confirm("Delete this project? This cannot be undone.")) return;
        try {
            const res = await window.apiFetch(`/api/projects/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("Project deleted");
                await Promise.all([loadStats(), loadProjects()]);
            } else {
                showToast(data.message || "Failed", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        }
    }

    // =========================================================
    // FILTERS / SEARCH / SORT
    // =========================================================
    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            filter = chip.dataset.filter;
            loadProjects();
        });
    });

    searchIn?.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const val = this.value;
        debounceTimer = setTimeout(() => {
            search = val;
            loadProjects();
        }, 300);
    });

    sortSelect?.addEventListener("change", function () {
        sort = this.value;
        loadProjects();
    });

    // =========================================================
    // HELPERS
    // =========================================================
    function formatRelative(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            const diff = Date.now() - d.getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1) return "just now";
            if (m < 60) return `Updated ${m}m ago`;
            const h = Math.floor(m / 60);
            if (h < 24) return `Updated ${h}h ago`;
            const day = Math.floor(h / 24);
            if (day < 30) return `Updated ${day}d ago`;
            return `Updated ${d.toLocaleDateString()}`;
        } catch { return ""; }
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
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
    loadStats();
    loadProjects();
});