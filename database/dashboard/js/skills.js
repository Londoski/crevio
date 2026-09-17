// =========================================================
// CREVIO — SKILLS PAGE
// File: dashboard/js/skills.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container  = $("skillsContainer");
    const modal      = $("modalOverlay");
    const form       = $("skillForm");
    const modalTitle = $("modalTitle");
    const newBtn     = $("newSkillBtn");
    const cancelBtn  = $("cancelBtn");
    const toast      = $("toast");

    let allSkills = [];

    // =========================================================
    // MODAL
    // =========================================================
    function openModal(skill = null) {
        form?.reset();
        if ($("skillId")) $("skillId").value = skill?.id || "";

        if (skill) {
            modalTitle.textContent = "Edit Skill";
            if ($("name"))     $("name").value     = skill.name || "";
            if ($("category")) $("category").value = (skill.category || "development").toLowerCase();
        } else {
            modalTitle.textContent = "New Skill";
        }
        modal?.classList.add("open");
    }

    function closeModal() {
        modal?.classList.remove("open");
    }

    newBtn?.addEventListener("click", () => openModal());
    cancelBtn?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    // =========================================================
    // LOAD
    // =========================================================
    async function loadSkills() {
        container.innerHTML = `<div class="loading">Loading skills...</div>`;
        try {
            const res  = await window.apiFetch("/api/skills");
            const data = await res.json();
            allSkills = data.skills || [];
            render();
        } catch (err) {
            console.error("Load skills error:", err);
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="alert-circle" class="icon"></i>
                    <h3>Could not load skills</h3>
                    <p>${escapeHtml(err.message)}</p>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function render() {
        if (!allSkills.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="star" class="icon"></i>
                    <h3>No skills yet</h3>
                    <p>Add your first skill to showcase your expertise.</p>
                    <button class="btn-primary" id="emptyAddBtn">
                        <i data-lucide="plus" class="icon" style="width:16px;height:16px;"></i> Add Skill
                    </button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            $("emptyAddBtn")?.addEventListener("click", () => openModal());
            return;
        }

        container.innerHTML = `<div class="skills-grid">${allSkills.map(renderCard).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();

        container.querySelectorAll("[data-edit]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = el.dataset.edit;
                const s = allSkills.find(x => String(x.id) === String(id));
                if (s) openModal(s);
            });
        });

        container.querySelectorAll("[data-delete]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.delete;
                if (!confirm("Delete this skill?")) return;
                try {
                    const res  = await window.apiFetch(`/api/skills/${id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        allSkills = allSkills.filter(x => String(x.id) !== String(id));
                        render();
                        showToast("Skill removed");
                    } else {
                        showToast(data.message || "Delete failed", true);
                    }
                } catch (err) {
                    showToast("Failed: " + err.message, true);
                }
            });
        });
    }

    function renderCard(s) {
        return `
            <div class="skill-card">
                <div class="skill-head">
                    <div class="skill-icon">
                        <i data-lucide="${iconForCategory(s.category)}" class="icon"></i>
                    </div>
                    <div class="skill-info">
                        <h3>${escapeHtml(s.name || "Untitled")}</h3>
                        <span class="category">${escapeHtml(s.category || "other")}</span>
                    </div>
                </div>
                <div class="skill-actions">
                    <button class="icon-btn" data-edit="${s.id}" title="Edit">
                        <i data-lucide="pencil" class="icon"></i>
                    </button>
                    <button class="icon-btn danger" data-delete="${s.id}" title="Delete">
                        <i data-lucide="trash-2" class="icon"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function iconForCategory(c) {
        return {
            development: "code",
            design: "palette",
            video: "video",
            marketing: "megaphone",
            writing: "pen-tool",
            photography: "camera",
            branding: "sparkles",
            consulting: "users",
            other: "star"
        }[(c || "").toLowerCase()] || "star";
    }

    // =========================================================
    // SAVE (create or update)
    // =========================================================
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id   = $("skillId")?.value || "";
        const name = $("name")?.value.trim() || "";
        const category = $("category")?.value || "development";

        if (!name) return showToast("Skill name is required", true);

        const saveBtn = $("saveBtn");
        const originalText = saveBtn?.textContent;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
        }

        try {
            const url    = id ? `/api/skills/${id}` : "/api/skills";
            const method = id ? "PATCH" : "POST";
            const res    = await window.apiFetch(url, {
                method,
                body: JSON.stringify({ name, category })
            });
            const data = await res.json();

            if (data.success) {
                closeModal();
                loadSkills();
                showToast(id ? "Skill updated" : "Skill added");
            } else {
                showToast(data.message || "Failed to save", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText || "Save";
            }
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
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[s]);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadSkills();
});