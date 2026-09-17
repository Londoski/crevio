// =========================================================
// CREVIO — SERVICES LIST PAGE
// File: dashboard/js/services.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);
    const container  = $("servicesContainer");
    const searchIn   = $("searchInput");
    const sortSelect = $("sortSelect");
    const toast      = $("toast");

    let filter = "all", search = "", sort = "updated";
    let debounceTimer;

    // =========================================================
    // LOAD STATS
    // =========================================================
    async function loadStats() {
        try {
            const res = await window.apiFetch("/api/services/stats");
            const d = await res.json();
            if (d.success) {
                $("statTotal").textContent     = d.stats.total;
                $("statPublished").textContent = d.stats.published;
                $("statDrafts").textContent    = d.stats.drafts;
            }
        } catch (err) { console.error("Stats error:", err); }
    }

    // =========================================================
    // LOAD SERVICES
    // =========================================================
    async function loadServices() {
        container.innerHTML = `<div class="state-box"><p>Loading services…</p></div>`;
        try {
            const url = `/api/services?filter=${filter}&sort=${sort}&search=${encodeURIComponent(search)}`;
            const res = await window.apiFetch(url);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            renderServices(data.services || []);
        } catch (err) {
            console.error("Load error:", err);
            container.innerHTML = `
                <div class="state-box error">
                    <i data-lucide="alert-triangle" class="icon-lg"></i>
                    <h3>We couldn't load your services.</h3>
                    <p>${escapeHtml(err.message)}</p>
                    <button class="btn-primary" onclick="location.reload()">Try Again</button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function renderServices(services) {
        if (!services.length) {
            const isFiltered = search || filter !== "all";
            container.innerHTML = `
                <div class="state-box">
                    <i data-lucide="${isFiltered ? "search-x" : "briefcase"}" class="icon-lg"></i>
                    <h3>${isFiltered ? "No services found" : "You haven't added any services yet"}</h3>
                    <p>${isFiltered
                        ? "Try a different search or remove some filters."
                        : "Define what you offer to help clients understand how to work with you."}</p>
                    <a href="/dashboard/pages/service-edit.html" class="btn-primary">
                        <i data-lucide="plus" class="icon" style="width:14px;height:14px;"></i> Add Service
                    </a>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            return;
        }

        container.innerHTML = `<div class="services-grid">${services.map(renderCard).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        container.querySelectorAll("[data-edit]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                window.location.href = `/dashboard/pages/service-edit.html?id=${el.dataset.edit}`;
            });
        });
        container.querySelectorAll("[data-delete]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.delete;
                if (!confirm("Delete this service? This cannot be undone.")) return;
                try {
                    const res = await window.apiFetch(`/api/services/${id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        showToast("Service deleted");
                        await Promise.all([loadStats(), loadServices()]);
                    } else {
                        showToast(data.message || "Delete failed", true);
                    }
                } catch (err) { showToast("Failed: " + err.message, true); }
            });
        });
        container.querySelectorAll(".service-card").forEach(card => {
            card.addEventListener("click", (e) => {
                if (e.target.closest("button")) return;
                const id = card.dataset.id;
                if (id) window.location.href = `/dashboard/pages/service-edit.html?id=${id}`;
            });
        });
    }

    function renderCard(s) {
        const status = (s.status || "draft").toLowerCase();
        const category = s.category || "Uncategorized";
        const desc = s.description || "No description yet";

        return `
            <div class="service-card" data-id="${s.id}">
                <div class="service-head">
                    <div>
                        <div class="service-title">${escapeHtml(s.title || "Untitled")}</div>
                        <div class="service-category">${escapeHtml(category)}</div>
                    </div>
                    <span class="service-status ${status}">${status}</span>
                </div>
                <div class="service-desc">${escapeHtml(desc)}</div>
                <div class="service-meta">
                    <span><i data-lucide="folder" class="icon"></i> ${s.project_count || 0} project${s.project_count === 1 ? "" : "s"}</span>
                    <span><i data-lucide="star" class="icon"></i> ${s.skill_count || 0} skill${s.skill_count === 1 ? "" : "s"}</span>
                </div>
                <div class="service-actions">
                    <button class="btn-secondary" data-edit="${s.id}">
                        <i data-lucide="pencil" class="icon" style="width:13px;height:13px;"></i> Edit
                    </button>
                    <button class="btn-secondary" data-delete="${s.id}" style="color:var(--danger);">
                        <i data-lucide="trash-2" class="icon" style="width:13px;height:13px;"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    // =========================================================
    // FILTERS / SEARCH / SORT
    // =========================================================
    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            filter = chip.dataset.filter;
            loadServices();
        });
    });

    searchIn?.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const val = this.value;
        debounceTimer = setTimeout(() => {
            search = val;
            loadServices();
        }, 300);
    });

    sortSelect?.addEventListener("change", function () {
        sort = this.value;
        loadServices();
    });

    // =========================================================
    // HELPERS
    // =========================================================
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
    loadServices();
});