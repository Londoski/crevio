// =========================================================
// CREVIO — SERVICE EDITOR
// File: dashboard/js/service-edit.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    let serviceId = null;
    let currentStatus = "draft";
    let deliverables = [];
    let processSteps = [];
    let selectedSkillIds = [];
    let selectedProjectIds = [];
    let allSkills = [];
    let allProjects = [];

    function getIdFromURL() {
        const p = new URLSearchParams(window.location.search);
        return p.get("id") ? parseInt(p.get("id"), 10) : null;
    }

    // =========================================================
    // LOAD SERVICE
    // =========================================================
    async function loadService(id) {
        try {
            const res = await window.apiFetch(`/api/services/${id}`);
            const data = await res.json();
            if (!data.success || !data.service) throw new Error("Not found");

            const s = data.service;
            serviceId = s.id;

            $("title").value = s.title || "";
            $("description").value = s.description || "";
            $("category").value = s.category || "";
            $("problem").value = s.problem || "";
            $("outcome").value = s.outcome || "";
            $("delivery_time").value = s.delivery_time || "";
            $("pricing_type").value = s.pricing_type || "fixed";
            $("price").value = s.price ?? "";
            $("min_price").value = s.min_price ?? "";
            $("max_price").value = s.max_price ?? "";
            $("currency").value = s.currency || "USD";

            deliverables = (s.included_items || []).map(i => i.item);
            processSteps = (s.process || []).map(p => ({ title: p.step_title, description: p.step_description || "" }));
            selectedProjectIds = (s.projects || []).map(p => p.id);
            selectedSkillIds = (s.skills || []).map(sk => sk.id);

            currentStatus = s.status || "draft";
            updateStatusUI();
            updatePricingUI();
            renderDeliverables();
            renderProcess();
            $("descCount").textContent = (s.description || "").length;

            $("pageTitle").textContent = "Edit Service";
            $("pageSubtitle").textContent = `Editing "${s.title || "Untitled"}"`;

            $("deleteBtn").style.display = "";
            $("duplicateBtn").style.display = "";

            await Promise.all([loadSkills(), loadProjects()]);
        } catch (err) {
            console.error("Load error:", err);
            showToast("Could not load service: " + err.message, true);
        }
    }

    // =========================================================
    // LOAD SKILLS + PROJECTS
    // =========================================================
    async function loadSkills() {
        const el = $("skillsSelector");
        try {
            const res = await window.apiFetch("/api/skills");
            const data = await res.json();
            allSkills = data.skills || [];
            if (!allSkills.length) {
                el.innerHTML = `<p style="color:var(--text-muted); font-size:13px; padding:8px;">You haven't added any skills yet. <a href="/dashboard/pages/skills.html" style="color:var(--accent);">Add skills →</a></p>`;
                return;
            }
            el.innerHTML = allSkills.map(s => `
                <label class="select-item">
                    <input type="checkbox" data-skill-id="${s.id}" ${selectedSkillIds.includes(s.id) ? "checked" : ""}>
                    <span>${escapeHtml(s.name || "Untitled")}</span>
                </label>
            `).join("");
            el.querySelectorAll("[data-skill-id]").forEach(cb => {
                cb.addEventListener("change", function () {
                    const id = parseInt(this.dataset.skillId, 10);
                    if (this.checked) { if (!selectedSkillIds.includes(id)) selectedSkillIds.push(id); }
                    else { selectedSkillIds = selectedSkillIds.filter(x => x !== id); }
                });
            });
        } catch (err) {
            el.innerHTML = `<p style="color:var(--danger); font-size:13px; padding:8px;">Could not load skills.</p>`;
        }
    }

    async function loadProjects() {
        const el = $("projectsSelector");
        try {
            const res = await window.apiFetch("/api/projects");
            const data = await res.json();
            allProjects = data.projects || [];
            if (!allProjects.length) {
                el.innerHTML = `<p style="color:var(--text-muted); font-size:13px; padding:8px;">You haven't created any projects yet. <a href="/dashboard/pages/project-edit.html" style="color:var(--accent);">Create a project →</a></p>`;
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
        } catch (err) {
            el.innerHTML = `<p style="color:var(--danger); font-size:13px; padding:8px;">Could not load projects.</p>`;
        }
    }

    // =========================================================
    // DELIVERABLES
    // =========================================================
    function renderDeliverables() {
        const el = $("deliverablesList");
        if (!deliverables.length) {
            el.innerHTML = `<span style="color:var(--text-muted); font-size:13px; padding:6px 0;">No deliverables yet</span>`;
            return;
        }
        el.innerHTML = deliverables.map((d, i) => `
            <span class="chip-item">
                ${escapeHtml(d)}
                <button type="button" data-remove-deliverable="${i}">
                    <i data-lucide="x" class="x-icon"></i>
                </button>
            </span>
        `).join("");
        if (typeof lucide !== "undefined") lucide.createIcons();
        el.querySelectorAll("[data-remove-deliverable]").forEach(btn => {
            btn.addEventListener("click", () => {
                deliverables.splice(parseInt(btn.dataset.removeDeliverable, 10), 1);
                renderDeliverables();
            });
        });
    }

    $("addDeliverableBtn")?.addEventListener("click", () => {
        const v = $("newDeliverable").value.trim();
        if (!v) return;
        if (deliverables.includes(v)) { showToast("Already added", true); return; }
        deliverables.push(v);
        $("newDeliverable").value = "";
        renderDeliverables();
    });

    $("newDeliverable")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); $("addDeliverableBtn").click(); }
    });

    // =========================================================
    // PROCESS
    // =========================================================
    function renderProcess() {
        const el = $("processList");
        if (!processSteps.length) {
            el.innerHTML = `<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:14px 0;">No process steps yet</p>`;
            return;
        }
        el.innerHTML = processSteps.map((s, i) => `
            <div class="process-row">
                <div class="process-num">${String(i + 1).padStart(2, "0")}</div>
                <div class="process-fields">
                    <input type="text" data-step-title="${i}" value="${escapeHtml(s.title)}" placeholder="Step title">
                    <textarea data-step-desc="${i}" placeholder="Optional description" style="min-height:50px;">${escapeHtml(s.description || "")}</textarea>
                </div>
                <button type="button" class="process-remove" data-remove-step="${i}">
                    <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                </button>
            </div>
        `).join("");
        if (typeof lucide !== "undefined") lucide.createIcons();

        el.querySelectorAll("[data-step-title]").forEach(input => {
            input.addEventListener("input", function () {
                processSteps[parseInt(this.dataset.stepTitle, 10)].title = this.value;
            });
        });
        el.querySelectorAll("[data-step-desc]").forEach(input => {
            input.addEventListener("input", function () {
                processSteps[parseInt(this.dataset.stepDesc, 10)].description = this.value;
            });
        });
        el.querySelectorAll("[data-remove-step]").forEach(btn => {
            btn.addEventListener("click", () => {
                processSteps.splice(parseInt(btn.dataset.removeStep, 10), 1);
                renderProcess();
            });
        });
    }

    $("addProcessBtn")?.addEventListener("click", () => {
        processSteps.push({ title: "", description: "" });
        renderProcess();
    });

    // =========================================================
    // PRICING UI
    // =========================================================
    function updatePricingUI() {
        const t = $("pricing_type").value;
        const priceGroup = $("priceGroup");
        const rangeGroup = $("rangeGroup");

        if (t === "range") { priceGroup.style.display = "none"; rangeGroup.style.display = "grid"; }
        else if (t === "custom_quote" || t === "contact") { priceGroup.style.display = "none"; rangeGroup.style.display = "none"; }
        else { priceGroup.style.display = "block"; rangeGroup.style.display = "none"; }
    }

    $("pricing_type")?.addEventListener("change", updatePricingUI);

    // =========================================================
    // STATUS UI
    // =========================================================
    function updateStatusUI() {
        const isPub = currentStatus === "published";
        $("statusValue").textContent = isPub ? "Published" : "Draft";
        $("statusDot").className = "status-dot " + (isPub ? "published" : "draft");
    }

    // =========================================================
    // SAVE
    // =========================================================
    async function save(status) {
        const title = $("title").value.trim();
        if (!title) { showToast("Service name is required", true); $("title").focus(); return; }

        const pricingType = $("pricing_type").value;
        const payload = {
            title,
            description:   $("description").value.trim() || null,
            category:      $("category").value.trim() || null,
            problem:       $("problem").value.trim() || null,
            outcome:       $("outcome").value.trim() || null,
            delivery_time: $("delivery_time").value.trim() || null,
            pricing_type:  pricingType,
            price:         pricingType === "range" || pricingType === "custom_quote" || pricingType === "contact" ? null : ($("price").value ? parseFloat($("price").value) : null),
            min_price:     pricingType === "range" && $("min_price").value ? parseFloat($("min_price").value) : null,
            max_price:     pricingType === "range" && $("max_price").value ? parseFloat($("max_price").value) : null,
            currency:      $("currency").value,
            status
        };

        const btn = status === "published" ? $("publishBtn") : $("saveDraftBtn");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = "Saving…";

        try {
            const method = serviceId ? "PATCH" : "POST";
            const url = serviceId ? `/api/services/${serviceId}` : "/api/services";
            const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            if (data.service && data.service.id) serviceId = data.service.id;

            // Save sub-resources
            await Promise.all([
                apiFetch(`/api/services/${serviceId}/included-items`, { method: "PUT", body: JSON.stringify({ items: deliverables }) }),
                apiFetch(`/api/services/${serviceId}/process`,        { method: "PUT", body: JSON.stringify({ steps: processSteps.filter(s => s.title.trim()) }) }),
                apiFetch(`/api/services/${serviceId}/skills`,         { method: "PUT", body: JSON.stringify({ skillIds: selectedSkillIds }) }),
                apiFetch(`/api/services/${serviceId}/projects`,       { method: "PUT", body: JSON.stringify({ projectIds: selectedProjectIds }) })
            ]);

            currentStatus = status;
            updateStatusUI();
            showToast(status === "published" ? "Service published" : "Saved as draft");

            if (!window.location.search.includes("id=")) {
                const u = new URL(window.location);
                u.searchParams.set("id", serviceId);
                window.history.replaceState({}, "", u);
                $("pageTitle").textContent = "Edit Service";
                $("deleteBtn").style.display = "";
                $("duplicateBtn").style.display = "";
            }
        } catch (err) {
            console.error("Save error:", err);
            showToast("Save failed: " + err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    $("saveDraftBtn")?.addEventListener("click", () => save("draft"));
    $("publishBtn")?.addEventListener("click", () => save("published"));

    // =========================================================
    // DELETE + PREVIEW
    // =========================================================
    $("deleteBtn")?.addEventListener("click", async () => {
        if (!serviceId) return;
        if (!confirm("Delete this service? This cannot be undone.")) return;
        try {
            const res = await apiFetch(`/api/services/${serviceId}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("Service deleted");
                setTimeout(() => location.href = "/dashboard/pages/services.html", 800);
            } else {
                showToast(data.message || "Delete failed", true);
            }
        } catch (err) { showToast("Failed: " + err.message, true); }
    });

    $("previewBtn")?.addEventListener("click", () => {
        if (!serviceId) return showToast("Save the service first to preview", true);
        const user = window.getCurrentUser();
        window.open(`/p/${user.username}/services/${serviceId}`, "_blank");
    });

    // =========================================================
    // DESCRIPTION COUNTER
    // =========================================================
    $("description")?.addEventListener("input", function () {
        $("descCount").textContent = this.value.length;
    });

    // =========================================================
    // HELPERS
    // =========================================================
    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...(options.headers || {}) };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/admin/pages/login.html"; throw new Error("Unauthorized"); }
        return res;
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    let toastTimer;
    function showToast(msg, isError = false) {
        const toast = $("toast");
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
    serviceId = getIdFromURL();
    if (serviceId) {
        loadService(serviceId);
    } else {
        $("pageTitle").textContent = "New Service";
        $("pageSubtitle").textContent = "Define what you offer";
        updateStatusUI();
        updatePricingUI();
        renderDeliverables();
        renderProcess();
        loadSkills();
        loadProjects();
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
});