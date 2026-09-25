// =========================================================
// CREVIO — PORTFOLIO CONFIG PAGE
// File: dashboard/js/portfolio.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const toast    = $("toast");
    const metaInput = $("meta_description");
    const metaCount = $("metaCount");

    let config = {};
    let templates = [];

    // =========================================================
    // LOAD CONFIG + TEMPLATES
    // =========================================================
    async function loadAll() {
        try {
            const [configRes, templatesRes] = await Promise.all([
                window.apiFetch("/api/portfolio/config"),
                window.apiFetch("/api/portfolio/templates")
            ]);

            const configData    = await configRes.json();
            const templatesData = await templatesRes.json();

            config    = (configData.success && configData.config) ? configData.config : {};
            templates = (templatesData.success && templatesData.templates) ? templatesData.templates : [];

            applyToUI();
            renderTemplates();
            updateStatusBanner();
        } catch (err) {
            console.error("Load error:", err);
            showToast("Could not load portfolio config", true);
        }
    }

    // =========================================================
    // APPLY CONFIG TO UI
    // =========================================================
    function applyToUI() {
        const user = window.getCurrentUser ? window.getCurrentUser() : {};
        const slug = config.slug || user.username || "user";

        $("title").value            = config.title || "";
        $("tagline").value          = config.tagline || "";
        $("meta_description").value = config.meta_description || "";
        $("primary_color").value    = config.primary_color || "#2563EB";
        $("background_color").value = config.background_color || "#0F172A";
        $("font_family").value      = config.font_family || "Inter";

        // Sections
        let sections = {};
        try { sections = JSON.parse(config.sections || "{}"); } catch (e) {}
        document.querySelectorAll("[data-section]").forEach(el => {
            el.checked = sections[el.dataset.section] !== false;
        });

        // Preview button — link to public portfolio
        const previewBtn = $("previewBtn");
        if (previewBtn) previewBtn.href = `/p/${slug}`;

        updateMetaCount();
    }

    function updateStatusBanner() {
        const user = window.getCurrentUser ? window.getCurrentUser() : {};
        const slug = config.slug || user.username || "user";
        const status = (config.status || "draft").toLowerCase();

        const banner = $("statusBanner");
        const badge  = $("statusBadge");
        const pubBtn = $("publishBtn");

        $("bannerTitle").textContent = config.title || user.display_name || user.username || "Your Portfolio";
        $("bannerUrl").textContent   = `${window.location.origin}/p/${slug}`;

        banner.classList.remove("published", "draft");
        badge.classList.remove("published", "draft");
        banner.classList.add(status);
        badge.classList.add(status);
        badge.textContent = status === "published" ? "Published" : "Draft";

        if (status === "published") {
            pubBtn.className = "btn-danger";
            pubBtn.innerHTML = `<i data-lucide="eye-off" class="icon" style="width:16px;height:16px;"></i> Unpublish`;
        } else {
            pubBtn.className = "btn-success";
            pubBtn.innerHTML = `<i data-lucide="upload-cloud" class="icon" style="width:16px;height:16px;"></i> Publish Portfolio`;
        }

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    // =========================================================
    // RENDER TEMPLATES  (Phase 1D — plan-gated)
    // =========================================================
    function renderTemplates() {
        const grid = $("templateGrid");
        if (!grid) return;

        const activeTemplate = config.template || "minimal";

        if (!templates.length) {
            grid.innerHTML = `<div class="loading">No templates available</div>`;
            return;
        }

        grid.innerHTML = templates.map(t => {
            const locked   = !!t.locked;
            const req      = t.required_plan ? String(t.required_plan) : "pro";
            const reqLabel = req.charAt(0).toUpperCase() + req.slice(1);

            return `
            <div class="template-card ${t.slug === activeTemplate ? "active" : ""} ${locked ? "locked" : ""}"
                 data-template="${escapeHtml(t.slug)}"
                 ${locked ? `data-locked="true" data-required="${escapeHtml(req)}"` : ""}>
                <div class="template-preview">
                    ${t.preview_image
                        ? `<img src="${escapeHtml(t.preview_image)}" alt="${escapeHtml(t.name)}">`
                        : `<i data-lucide="layout-template" class="icon"></i>`}
                    ${locked ? `<div class="lock-overlay"><i data-lucide="lock" class="icon"></i></div>` : ""}
                </div>
                <h3>${escapeHtml(t.name)}</h3>
                <p>${locked ? `Requires ${escapeHtml(reqLabel)}` : escapeHtml(t.category || t.description || "")}</p>
            </div>`;
        }).join("");

        if (typeof lucide !== "undefined") lucide.createIcons();

        grid.querySelectorAll("[data-template]").forEach(card => {
            card.addEventListener("click", () => {
                if (card.dataset.locked === "true") {
                    const need = card.dataset.required || "pro";
                    showToast(
                        "This template requires the " +
                        need.charAt(0).toUpperCase() + need.slice(1) +
                        " plan.",
                        true
                    );
                    return;
                }
                grid.querySelectorAll("[data-template]").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                config.template = card.dataset.template;
                saveConfig(true);
            });
        });
    }

    // =========================================================
    // SAVE
    // =========================================================
    async function saveConfig(silent = false) {
        const sections = {};
        document.querySelectorAll("[data-section]").forEach(el => {
            sections[el.dataset.section] = el.checked;
        });

        const activeTemplate = document.querySelector("[data-template].active")?.dataset.template
                              || config.template || "minimal";

        const payload = {
            title:            $("title").value.trim(),
            tagline:          $("tagline").value.trim(),
            meta_description: $("meta_description").value.trim(),
            template:         activeTemplate,
            sections:         JSON.stringify(sections),
            primary_color:    $("primary_color").value,
            background_color: $("background_color").value,
            font_family:      $("font_family").value
        };

        const saveBtn = $("saveBtn");
        const original = saveBtn.innerHTML;

        if (!silent) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = "Saving...";
        }

        try {
            const res  = await window.apiFetch("/api/portfolio/config", {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                if (!silent) showToast("Portfolio settings saved");
                const refreshed = await window.apiFetch("/api/portfolio/config");
                const refreshedData = await refreshed.json();
                if (refreshedData.success) config = refreshedData.config;
                updateStatusBanner();
            } else {
                showToast(data.message || "Failed to save", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            if (!silent) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = original;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    }

    $("saveBtn")?.addEventListener("click", () => saveConfig(false));

    // =========================================================
    // PUBLISH / UNPUBLISH
    // =========================================================
    $("publishBtn")?.addEventListener("click", async () => {
        const badge = $("statusBadge");
        const isPublished = badge.classList.contains("published");

        const confirmMsg = isPublished
            ? "Unpublish your portfolio? Visitors won't see it."
            : "Publish your portfolio? It will be visible to everyone.";

        if (!confirm(confirmMsg)) return;

        try {
            const res  = await window.apiFetch("/api/portfolio/publish", {
                method: "POST",
                body: JSON.stringify({ publish: !isPublished })
            });
            const data = await res.json();

            if (data.success) {
                showToast(`Portfolio ${data.published ? "published" : "unpublished"}`);
                const refreshed = await window.apiFetch("/api/portfolio/config");
                const refreshedData = await refreshed.json();
                if (refreshedData.success) config = refreshedData.config;
                updateStatusBanner();
            } else {
                showToast(data.message || "Failed", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        }
    });

    // =========================================================
    // RESET
    // =========================================================
    $("resetBtn")?.addEventListener("click", () => {
        if (!confirm("Reset all portfolio settings to defaults?")) return;

        $("title").value = "";
        $("tagline").value = "";
        $("meta_description").value = "";
        $("primary_color").value = "#2563EB";
        $("background_color").value = "#0F172A";
        $("font_family").value = "Inter";

        document.querySelectorAll("[data-template]").forEach(t => t.classList.remove("active"));
        const firstUnlocked = document.querySelector("[data-template]:not([data-locked])");
        if (firstUnlocked) firstUnlocked.classList.add("active");

        document.querySelectorAll("[data-section]").forEach(el => el.checked = true);

        updateMetaCount();
        showToast("Reset locally — click Save to apply");
    });

    // =========================================================
    // META CHARACTER COUNT
    // =========================================================
    function updateMetaCount() {
        if (metaCount && metaInput) metaCount.textContent = metaInput.value.length;
    }
    metaInput?.addEventListener("input", updateMetaCount);

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
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadAll();
});