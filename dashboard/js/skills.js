// =========================================================
// CREVIO — SKILLS PAGE
// File: dashboard/js/skills.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container = $("skillsContainer");
    const modal     = $("skillModal");
    const form      = $("skillForm");
    const toast     = $("toast");

    let filter = "all", search = "", sort = "az";
    let debounceTimer;
    let allServices = [];
    let allProjects = [];
    let selectedServiceIds = [];
    let selectedProjectIds = [];

    // =========================================================
    // LOAD STATS
    // =========================================================
    async function loadStats() {
        try {
            const res = await window.apiFetch("/api/skills/stats");
            const d = await res.json();
            if (d.success) {
                $("statTotal").textContent    = d.stats.total;
                $("statServices").textContent = d.stats.usedInServices;
                $("statProjects").textContent = d.stats.usedInProjects;
                $("statUnlinked").textContent = d.stats.unlinked;
            }
        } catch (err) { console.error("Stats error:", err); }
    }

    // =========================================================
    // LOAD SKILLS
    // =========================================================
    async function loadSkills() {
        container.innerHTML = `<div class="state-box"><p>Loading skills…</p></div>`;
        try {
            const url = `/api/skills?filter=${filter}&sort=${sort}&search=${encodeURIComponent(search)}`;
            const res = await window.apiFetch(url);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            renderSkills(data.skills || []);
        } catch (err) {
            console.error("Load error:", err);
            container.innerHTML = `
                <div class="state-box error">
                    <i data-lucide="alert-triangle" class="icon-lg"></i>
                    <h3>We couldn't load your Skills.</h3>
                    <p>${escapeHtml(err.message)}</p>
                    <button class="btn-primary" onclick="location.reload()">Try Again</button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function renderSkills(skills) {
        if (!skills.length) {
            const isFiltered = search || filter !== "all";
            container.innerHTML = `
                <div class="state-box">
                    <i data-lucide="${isFiltered ? "search-x" : "star"}" class="icon-lg"></i>
                    <h3>${isFiltered ? "No Skills found" : "No Skills yet"}</h3>
                    <p>${isFiltered
                        ? "Try a different search or filter."
                        : "Add the expertise that represents what you do."}</p>
                    <button class="btn-primary" id="emptyAddBtn">
                        <i data-lucide="plus" class="icon" style="width:14px;height:14px;"></i> Add Skill
                    </button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            $("emptyAddBtn")?.addEventListener("click", () => openModal());
            return;
        }

        container.innerHTML = `<div class="skills-grid">${skills.map(renderCard).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        container.querySelectorAll("[data-edit]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = el.dataset.edit;
                const s = skills.find(x => String(x.id) === String(id));
                if (s) openModal(s);
            });
        });
        container.querySelectorAll("[data-delete]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.delete;
                const s = skills.find(x => String(x.id) === String(id));
                if (s) await confirmDelete(s);
            });
        });
    }

    function renderCard(s) {
        const icon = iconForCategory(s.category);
        const hasServices = s.service_count > 0;
        const hasProjects = s.project_count > 0;

        return `
            <div class="skill-card">
                <div class="skill-head">
                    <div class="skill-icon"><i data-lucide="${icon}" class="icon"></i></div>
                    <div style="flex:1; min-width:0;">
                        <div class="skill-title">${escapeHtml(s.name || "Untitled")}</div>
                        ${s.category ? `<div class="skill-category">${escapeHtml(s.category)}</div>` : ""}
                    </div>
                </div>
                ${s.description ? `<div class="skill-description">${escapeHtml(s.description)}</div>` : ""}
                <div class="skill-meta">
                    <span class="count ${hasServices ? "" : "zero"}">
                        <i data-lucide="briefcase" class="icon"></i>
                        ${s.service_count} service${s.service_count === 1 ? "" : "s"}
                    </span>
                    <span class="count ${hasProjects ? "" : "zero"}">
                        <i data-lucide="folder" class="icon"></i>
                        ${s.project_count} project${s.project_count === 1 ? "" : "s"}
                    </span>
                </div>
                <div class="skill-actions">
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

    function iconForCategory(c) {
        return {
            design: "palette",
            development: "code",
            video: "video",
            photography: "camera",
            marketing: "megaphone",
            writing: "pen-tool",
            consulting: "users",
            other: "star"
        }[(c || "").toLowerCase()] || "star";
    }

    // =========================================================
    // MODAL
    // =========================================================
    function openModal(skill = null) {
        form.reset();
        $("skillId").value = skill?.id || "";
        $("modalTitle").textContent = skill ? "Edit Skill" : "Add Skill";

        selectedServiceIds = [];
        selectedProjectIds = [];

        if (skill) {
            $("skillName").value        = skill.name || "";
            $("skillCategory").value    = skill.category || "";
            $("skillDescription").value = skill.description || "";
            $("connectionsSection").style.display = "";

            // Load relationships
            loadConnections(skill.id);
        } else {
            $("connectionsSection").style.display = "none";
        }

        modal.classList.add("open");
    }

    function closeModal() {
        modal.classList.remove("open");
    }

    $("newSkillBtn")?.addEventListener("click", () => openModal());
    $("cancelBtn")?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // =========================================================
    // LOAD CONNECTIONS (services + projects) for editing
    // =========================================================
    async function loadConnections(skillId) {
        try {
            const [skillRes, servicesRes, projectsRes] = await Promise.all([
                window.apiFetch(`/api/skills/${skillId}`),
                window.apiFetch("/api/services"),
                window.apiFetch("/api/projects")
            ]);
            const skillData   = await skillRes.json();
            const servicesData = await servicesRes.json();
            const projectsData = await projectsRes.json();

            allServices = servicesData.services || [];
            allProjects = projectsData.projects || [];
            selectedServiceIds = (skillData.skill?.services || []).map(s => s.id);
            selectedProjectIds = (skillData.skill?.projects || []).map(p => p.id);

            renderServices();
            renderProjects();
        } catch (err) {
            console.error("Load connections error:", err);
        }
    }

    function renderServices() {
        const el = $("servicesSelector");
        if (!allServices.length) {
            el.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:8px;">No services yet. <a href="/dashboard/pages/service-edit.html" style="color:var(--accent);">Create one →</a></p>`;
            return;
        }
        el.innerHTML = allServices.map(s => `
            <label class="select-item">
                <input type="checkbox" data-service-id="${s.id}" ${selectedServiceIds.includes(s.id) ? "checked" : ""}>
                <span>${escapeHtml(s.title || "Untitled")}</span>
            </label>
        `).join("");
        el.querySelectorAll("[data-service-id]").forEach(cb => {
            cb.addEventListener("change", function () {
                const id = parseInt(this.dataset.serviceId, 10);
                if (this.checked) { if (!selectedServiceIds.includes(id)) selectedServiceIds.push(id); }
                else { selectedServiceIds = selectedServiceIds.filter(x => x !== id); }
            });
        });
    }

    function renderProjects() {
        const el = $("projectsSelector");
        if (!allProjects.length) {
            el.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:8px;">No projects yet. <a href="/dashboard/pages/project-edit.html" style="color:var(--accent);">Create one →</a></p>`;
            return;
        }
        el.innerHTML = allProjects.map(p => `
            <label class="select-item">
                <input type="checkbox" data-project-id="${p.id}" ${selectedProjectIds.includes(p.id) ? "checked" : ""}>
                <span>${escapeHtml(p.name || p.title || "Untitled")}</span>
            </label>
        `).join("");
        el.querySelectorAll("[data-project-id]").forEach(cb => {
            cb.addEventListener("change", function () {
                const id = parseInt(this.dataset.projectId, 10);
                if (this.checked) { if (!selectedProjectIds.includes(id)) selectedProjectIds.push(id); }
                else { selectedProjectIds = selectedProjectIds.filter(x => x !== id); }
            });
        });
    }

    // =========================================================
    // SAVE
    // =========================================================
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = $("skillId").value;
        const payload = {
            name:        $("skillName").value.trim(),
            category:    $("skillCategory").value.trim(),
            description: $("skillDescription").value.trim()
        };
        if (!payload.name) return showToast("Skill name is required", true);

        const saveBtn = $("saveBtn");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";

        try {
            const url    = id ? `/api/skills/${id}` : "/api/skills";
            const method = id ? "PATCH" : "POST";
            const res    = await window.apiFetch(url, { method, body: JSON.stringify(payload) });
            const data   = await res.json();

            if (!data.success) throw new Error(data.message);

            const newId = data.skill?.id || id;

            // Save relationships if editing
            if (id) {
                await Promise.all([
                    window.apiFetch(`/api/skills/${id}/services`, { method: "PUT", body: JSON.stringify({ serviceIds: selectedServiceIds }) }),
                    window.apiFetch(`/api/skills/${id}/projects`, { method: "PUT", body: JSON.stringify({ projectIds: selectedProjectIds }) })
                ]);
            }

            showToast(id ? "Skill updated" : "Skill added");
            closeModal();
            await Promise.all([loadStats(), loadSkills()]);
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
        }
    });

    // =========================================================
    // DELETE with relationship warning
    // =========================================================
    async function confirmDelete(skill) {
        const totalLinks = (skill.service_count || 0) + (skill.project_count || 0);
        let msg = `Delete "${skill.name}"?\n\n`;
        if (totalLinks > 0) {
            msg += `This skill is currently connected to `;
            const parts = [];
            if (skill.service_count > 0) parts.push(`${skill.service_count} service${skill.service_count === 1 ? "" : "s"}`);
            if (skill.project_count > 0) parts.push(`${skill.project_count} project${skill.project_count === 1 ? "" : "s"}`);
            msg += parts.join(" and ") + ".\n\n";
            msg += `Removing it will remove those connections but will NOT delete the services or projects.`;
        }
        if (!confirm(msg)) return;

        try {
            const res = await window.apiFetch(`/api/skills/${skill.id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("Skill removed");
                await Promise.all([loadStats(), loadSkills()]);
            } else {
                showToast(data.message || "Delete failed", true);
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
            loadSkills();
        });
    });

    $("searchInput")?.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const val = this.value;
        debounceTimer = setTimeout(() => {
            search = val;
            loadSkills();
        }, 300);
    });

    $("sortSelect")?.addEventListener("change", function () {
        sort = this.value;
        loadSkills();
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
    loadSkills();
});