// =========================================================
// CREVIO — PROJECTS LIST PAGE
// File: dashboard/js/projects.js
// Handles both { name, published } and { title, status } shapes
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container   = $("projectsContainer");
    const newBtn      = $("newProjectBtn");
    const searchInput = $("searchInput");
    const filterChips = document.querySelectorAll("[data-filter]");

    let allProjects = [];
    let currentFilter = "all";
    let currentSearch = "";

    // ---------- NORMALIZE ----------
    // Converts DB shape → UI shape, so UI code stays clean
    function normalize(p) {
        const name     = p.name || p.title || "Untitled Project";
        const status   = p.published === 1 || p.status === "published" ? "published" : "draft";
        const thumb    = p.thumbnail_url || p.thumbnail || null;
        return {
            ...p,
            _name:   name,
            _status: status,
            _thumb:  thumb,
            _description: p.description || ""
        };
    }

    // ---------- LOAD ----------
    async function loadProjects() {
        container.innerHTML = `<div class="loading">Loading projects...</div>`;
        try {
            const res  = await window.apiFetch("/api/projects");
            const data = await res.json();
            allProjects = (data.projects || data.data || []).map(normalize);
            render();
        } catch (err) {
            console.error("Load projects error:", err);
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="alert-circle" class="icon"></i>
                    <h3>Could not load projects</h3>
                    <p>${escapeHtml(err.message)}</p>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // ---------- RENDER ----------
    function render() {
        let filtered = [...allProjects];

        if (currentFilter !== "all") {
            filtered = filtered.filter(p => p._status === currentFilter);
        }

        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            filtered = filtered.filter(p =>
                p._name.toLowerCase().includes(q) ||
                (p._description || "").toLowerCase().includes(q) ||
                (p.category || "").toLowerCase().includes(q)
            );
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="folder-open" class="icon"></i>
                    <h3>${allProjects.length ? "No matching projects" : "No projects yet"}</h3>
                    <p>${allProjects.length
                        ? "Try a different filter or search."
                        : "Create your first project to get started."}</p>
                    ${!allProjects.length ? `
                        <button class="btn-primary" onclick="window.location.href='/dashboard/pages/project-create.html'">
                            <i data-lucide="plus" class="icon" style="width:16px;height:16px;"></i> Create Project
                        </button>
                    ` : ""}
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            return;
        }

        container.innerHTML = `<div class="projects-grid">${filtered.map(renderCard).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        // Wire edit buttons
        container.querySelectorAll("[data-edit]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                window.location.href = `/dashboard/pages/project-edit.html?id=${el.dataset.edit}`;
            });
        });

        // Wire delete buttons
        container.querySelectorAll("[data-delete]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.delete;
                if (!confirm("Delete this project? This cannot be undone.")) return;
                try {
                    const res  = await window.apiFetch(`/api/projects/${id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        allProjects = allProjects.filter(p => String(p.id) !== String(id));
                        render();
                    } else {
                        alert(data.message || "Delete failed");
                    }
                } catch (err) {
                    alert("Failed: " + err.message);
                }
            });
        });

        // Card click → open edit
        container.querySelectorAll(".project-card").forEach(card => {
            card.addEventListener("click", () => {
                const id = card.dataset.id;
                if (id) window.location.href = `/dashboard/pages/project-edit.html?id=${id}`;
            });
        });
    }

    function renderCard(p) {
        const thumb = p._thumb
            ? `<img src="${escapeHtml(p._thumb)}" alt="" class="project-thumb">`
            : `<div class="project-thumb placeholder">
                    <i data-lucide="image" style="width:32px;height:32px;"></i>
               </div>`;

        return `
            <div class="project-card" data-id="${p.id}">
                ${thumb}
                <div class="project-body">
                    <h3>${escapeHtml(p._name)}</h3>
                    <p>${escapeHtml((p._description || "No description").slice(0, 100))}</p>
                    <div class="project-footer">
                        <span class="badge ${p._status}">${p._status}</span>
                        <div class="project-actions">
                            <button class="icon-btn" data-edit="${p.id}" title="Edit">
                                <i data-lucide="pencil" class="icon"></i>
                            </button>
                            <button class="icon-btn danger" data-delete="${p.id}" title="Delete">
                                <i data-lucide="trash-2" class="icon"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ---------- SEARCH ----------
    searchInput?.addEventListener("input", function () {
        currentSearch = this.value.trim();
        render();
    });

    // ---------- FILTERS ----------
    filterChips.forEach(chip => {
        chip.addEventListener("click", () => {
            filterChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            currentFilter = chip.dataset.filter;
            render();
        });
    });

    // ---------- NEW ----------
    newBtn?.addEventListener("click", () => {
        window.location.href = "/dashboard/pages/project-create.html";
    });

    // ---------- HELPERS ----------
    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    loadProjects();
});