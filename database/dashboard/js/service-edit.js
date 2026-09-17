// =========================================================
// CREVIO — SERVICE EDIT (with live preview)
// File: dashboard/js/service-edit.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ service-edit.js loaded");

    const $ = (id) => document.getElementById(id);

    // ---- Form refs ----
    const title          = $("serviceTitle");
    const description    = $("serviceDescription");
    const category       = $("serviceCategory");
    const pricingType    = $("pricingType");
    const price          = $("price");
    const currency       = $("currency");
    const minPrice       = $("minPrice");
    const maxPrice       = $("maxPrice");
    const deliveryTime   = $("deliveryTime");
    const revisions      = $("revisions");
    const availability   = $("availability");
    const status         = $("serviceStatus");
    const featured       = $("featuredService");
    const showOnPortfolio = $("showOnPortfolio");
    const ctaType        = $("ctaType");
    const ctaLabel       = $("ctaLabel");
    const ctaUrl         = $("ctaUrl");

    // ---- Preview refs ----
    const previewCategory = $("previewCategory");
    const previewTitle    = $("previewTitle");
    const previewDesc     = $("previewDesc");
    const previewPrice    = $("previewPrice");
    const previewItems    = $("previewItems");
    const previewCtaBtn   = $("previewCtaBtn");

    // ---- Buttons ----
    const saveDraftBtn = $("saveDraftBtn");
    const publishBtn   = $("publishBtn");
    const statusMsg    = $("statusMessage");

    // ---- Lists ----
    const itemsList    = $("includedItemsList");
    const newItemInput = $("newItemInput");
    const addItemBtn   = $("addItemBtn");

    const faqsList    = $("faqsList");
    const faqQuestion = $("faqQuestion");
    const faqAnswer   = $("faqAnswer");
    const addFaqBtn   = $("addFaqBtn");

    const projectsSelector = $("projectsSelector");

    // ---- State ----
    let serviceId = null;
    let includedItems = [];
    let faqs = [];
    let selectedProjects = [];
    let allProjects = [];

    // =========================================================
    // GET ID FROM URL
    // =========================================================
    function getServiceIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id") ? parseInt(params.get("id"), 10) : null;
    }

    // =========================================================
    // LOAD SERVICE
    // =========================================================
    async function loadService(id) {
        try {
            const res  = await window.apiFetch(`/api/services/${id}`);
            const data = await res.json();
            if (!data.success || !data.service) throw new Error(data.message || "Failed to load");

            serviceId = data.service.id;
            fillForm(data.service);
            if ($("pageTitle")) $("pageTitle").textContent = "Edit Service";
        } catch (err) {
            console.error("Load service error:", err);
            showMessage("Unable to load service: " + err.message, "error");
        }
    }

    // =========================================================
    // FILL FORM
    // =========================================================
    function fillForm(s) {
        if (title)           title.value           = s.title || "";
        if (description)     description.value     = s.description || "";
        if (category)        category.value        = s.category || "";
        if (pricingType)     pricingType.value     = s.pricing_type || "fixed";
        if (price)           price.value           = s.price ?? "";
        if (currency)        currency.value        = s.currency || "USD";
        if (minPrice)        minPrice.value        = s.min_price ?? "";
        if (maxPrice)        maxPrice.value        = s.max_price ?? "";
        if (deliveryTime)    deliveryTime.value    = s.delivery_time || "";
        if (revisions)       revisions.value       = s.revisions ?? "";
        if (availability)    availability.checked  = s.availability !== 0;
        if (status)          status.value          = s.status || "draft";
        if (featured)        featured.checked      = s.featured === 1;
        if (showOnPortfolio) showOnPortfolio.checked = s.show_on_portfolio !== 0;
        if (ctaType)         ctaType.value         = s.cta_type || "quote";
        if (ctaLabel)        ctaLabel.value        = s.cta_label || "";
        if (ctaUrl)          ctaUrl.value          = s.cta_url || "";

        if (Array.isArray(s.included_items)) {
            includedItems = s.included_items.map(i => i.item || i.text || i);
            renderIncludedItems();
        }
        if (Array.isArray(s.faqs)) {
            faqs = s.faqs.map(f => ({ question: f.question, answer: f.answer }));
            renderFaqs();
        }
        if (Array.isArray(s.projects)) {
            selectedProjects = s.projects.map(p => p.id);
        }

        if (pricingType?.value === "range" && $("rangeFields")) {
            $("rangeFields").style.display = "grid";
        }
        if (ctaType?.value === "custom" && $("customCtaGroup")) {
            $("customCtaGroup").style.display = "block";
        }

        updatePreview();
        loadProjectsForSelector();
    }

    // =========================================================
    // LIVE PREVIEW
    // =========================================================
    function updatePreview() {
        if (previewCategory) previewCategory.textContent = category?.value || "Category";
        if (previewTitle)    previewTitle.textContent    = title?.value    || "Service Name";
        if (previewDesc)     previewDesc.textContent     = description?.value || "Description goes here.";

        // Pricing
        const pType = pricingType?.value || "fixed";
        const curr  = currency?.value || "USD";
        const sym   = curr === "USD" ? "$" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : "₦";
        const pv    = parseFloat(price?.value || "0");
        const mn    = parseFloat(minPrice?.value || "0");
        const mx    = parseFloat(maxPrice?.value || "0");

        let priceText = "";
        if (pType === "fixed" && pv) {
            priceText = `${sym}${pv.toLocaleString()}`;
        } else if (pType === "starting_from" && pv) {
            priceText = `Starting from ${sym}${pv.toLocaleString()}`;
        } else if (pType === "range" && mn && mx) {
            priceText = `${sym}${mn.toLocaleString()} — ${sym}${mx.toLocaleString()}`;
        } else if (pType === "custom_quote") {
            priceText = "Custom Quote";
        } else if (pType === "contact") {
            priceText = "Contact for pricing";
        }
        if (previewPrice) previewPrice.textContent = priceText || "Pricing not set";

        // Included items
        if (previewItems) {
            if (includedItems.length) {
                previewItems.innerHTML = includedItems
                    .map(item => `<div class="item"><span class="check">✓</span> ${escapeHtml(item)}</div>`)
                    .join("");
            } else {
                previewItems.innerHTML = `<div class="item" style="color:var(--text-muted);">No items added yet.</div>`;
            }
        }

        // CTA label
        if (previewCtaBtn) {
            previewCtaBtn.textContent = ctaLabel?.value || getDefaultCtaLabel(ctaType?.value);
        }
    }

    function getDefaultCtaLabel(type) {
        return {
            quote:   "Request a Quote",
            contact: "Contact Me",
            start:   "Start a Project",
            book:    "Book a Consultation",
            custom:  "Learn More"
        }[type] || "Request a Quote";
    }

    // =========================================================
    // INCLUDED ITEMS
    // =========================================================
    function renderIncludedItems() {
        if (!itemsList) return;
        if (!includedItems.length) {
            itemsList.innerHTML = `<div style="color:var(--text-muted);font-size:14px;padding:6px 0;">No items added yet.</div>`;
            return;
        }
        itemsList.innerHTML = includedItems.map((item, idx) => `
            <div class="item-row">
                <span class="item-text">${escapeHtml(item)}</span>
                <button class="btn-icon" data-index="${idx}" title="Remove" type="button">
                    <i data-lucide="x" style="width:16px;height:16px;"></i>
                </button>
            </div>
        `).join("");

        itemsList.querySelectorAll(".btn-icon").forEach(btn => {
            btn.addEventListener("click", function () {
                includedItems.splice(parseInt(this.dataset.index, 10), 1);
                renderIncludedItems();
                updatePreview();
            });
        });
        refreshIcons();
    }

    addItemBtn?.addEventListener("click", function () {
        const val = newItemInput?.value.trim();
        if (!val) return;
        includedItems.push(val);
        newItemInput.value = "";
        renderIncludedItems();
        updatePreview();
    });

    newItemInput?.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addItemBtn.click(); }
    });

    // =========================================================
    // FAQS
    // =========================================================
    function renderFaqs() {
        if (!faqsList) return;
        if (!faqs.length) {
            faqsList.innerHTML = `<div style="color:var(--text-muted);font-size:14px;padding:6px 0;">No FAQs added yet.</div>`;
            return;
        }
        faqsList.innerHTML = faqs.map((f, idx) => `
            <div class="item-row">
                <span class="item-text">
                    <strong>Q:</strong> ${escapeHtml(f.question)}<br>
                    <span style="font-size:13px;color:var(--text-secondary);">
                        <strong>A:</strong> ${escapeHtml(f.answer)}
                    </span>
                </span>
                <button class="btn-icon" data-index="${idx}" title="Remove" type="button">
                    <i data-lucide="x" style="width:16px;height:16px;"></i>
                </button>
            </div>
        `).join("");

        faqsList.querySelectorAll(".btn-icon").forEach(btn => {
            btn.addEventListener("click", function () {
                faqs.splice(parseInt(this.dataset.index, 10), 1);
                renderFaqs();
            });
        });
        refreshIcons();
    }

    addFaqBtn?.addEventListener("click", function () {
        const q = faqQuestion?.value.trim();
        const a = faqAnswer?.value.trim();
        if (!q || !a) return;
        faqs.push({ question: q, answer: a });
        faqQuestion.value = "";
        faqAnswer.value = "";
        renderFaqs();
    });

    // =========================================================
    // PROJECTS
    // =========================================================
    async function loadProjectsForSelector() {
        if (!projectsSelector) return;
        try {
            const res  = await window.apiFetch("/api/projects");
            const data = await res.json();
            allProjects = data.projects || data.data || [];
            renderProjectsSelector();
        } catch (err) {
            console.error("Load projects error:", err);
            projectsSelector.innerHTML = `<div style="color:var(--danger);">Unable to load projects.</div>`;
        }
    }

    function renderProjectsSelector() {
        if (!projectsSelector) return;
        if (!allProjects.length) {
            projectsSelector.innerHTML = `<div style="color:var(--text-muted);">No projects found. <a href="/dashboard/pages/project-create.html" style="color:var(--accent);">Create a project first</a></div>`;
            return;
        }
        projectsSelector.innerHTML = allProjects.map(p => {
            const checked = selectedProjects.includes(p.id) ? "checked" : "";
            const name    = p.name || p.title || `Project #${p.id}`;
            return `
                <div class="checkbox-group" style="padding:4px 0;">
                    <input type="checkbox" id="proj_${p.id}" value="${p.id}" ${checked}>
                    <label for="proj_${p.id}">${escapeHtml(name)}</label>
                </div>
            `;
        }).join("");

        projectsSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener("change", function () {
                const id = parseInt(this.value, 10);
                if (this.checked) {
                    if (!selectedProjects.includes(id)) selectedProjects.push(id);
                } else {
                    selectedProjects = selectedProjects.filter(x => x !== id);
                }
            });
        });
        refreshIcons();
    }

    // =========================================================
    // SAVE
    // =========================================================
    async function saveService(statusToSet) {
        const payload = {
            title:             title?.value.trim() || "",
            description:       description?.value.trim() || "",
            category:          category?.value || null,
            pricing_type:      pricingType?.value || "fixed",
            price:             price?.value ? parseFloat(price.value) : null,
            currency:          currency?.value || "USD",
            min_price:         minPrice?.value ? parseFloat(minPrice.value) : null,
            max_price:         maxPrice?.value ? parseFloat(maxPrice.value) : null,
            delivery_time:     deliveryTime?.value.trim() || null,
            revisions:         revisions?.value ? parseInt(revisions.value, 10) : null,
            availability:      availability?.checked ? 1 : 0,
            featured:          featured?.checked ? 1 : 0,
            show_on_portfolio: showOnPortfolio?.checked ? 1 : 0,
            cta_type:          ctaType?.value || "quote",
            cta_label:         ctaLabel?.value.trim() || null,
            cta_url:           ctaUrl?.value.trim() || null,
            status:            statusToSet
        };

        if (!payload.title)       return showMessage("Service name is required.", "error");
        if (!payload.description) return showMessage("Description is required.", "error");

        const btn = statusToSet === "published" ? publishBtn : saveDraftBtn;
        if (btn) btn.disabled = true;

        try {
            const method   = serviceId ? "PATCH" : "POST";
            const endpoint = serviceId ? `/api/services/${serviceId}` : "/api/services";

            const res = await window.apiFetch(endpoint, {
                method,
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (!res.ok || !result.success) throw new Error(result.message || "Save failed");

            serviceId = (result.service && result.service.id) || serviceId;

            // Save sub-resources (best-effort)
            if (serviceId) {
                const safePut = (url, body) =>
                    window.apiFetch(url, { method: "PUT", body: JSON.stringify(body) })
                        .catch(e => console.warn("Sub-resource save skipped:", e.message));

                await Promise.all([
                    safePut(`/api/services/${serviceId}/included-items`, { items: includedItems }),
                    safePut(`/api/services/${serviceId}/faqs`,           { faqs }),
                    safePut(`/api/services/${serviceId}/projects`,       { projectIds: selectedProjects })
                ]);
            }

            showMessage(`Service ${statusToSet === "published" ? "published" : "saved as draft"}!`, "success");

            if (!window.location.search.includes("id=")) {
                const url = new URL(window.location);
                url.searchParams.set("id", serviceId);
                window.history.replaceState({}, "", url);
            }
            if ($("pageTitle")) $("pageTitle").textContent = "Edit Service";
        } catch (err) {
            console.error("Save error:", err);
            showMessage(err.message, "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    saveDraftBtn?.addEventListener("click", () => saveService("draft"));
    publishBtn?.addEventListener("click",   () => saveService("published"));

    // =========================================================
    // LIVE PREVIEW LISTENERS
    // =========================================================
    [title, description, category, price, minPrice, maxPrice, ctaLabel].forEach(el => {
        el?.addEventListener("input", updatePreview);
    });

    pricingType?.addEventListener("change", function () {
        const rangeFields = $("rangeFields");
        if (rangeFields) rangeFields.style.display = this.value === "range" ? "grid" : "none";
        updatePreview();
    });

    currency?.addEventListener("change", updatePreview);

    ctaType?.addEventListener("change", function () {
        const customCtaGroup = $("customCtaGroup");
        if (customCtaGroup) customCtaGroup.style.display = this.value === "custom" ? "block" : "none";
        updatePreview();
    });

    // =========================================================
    // HELPERS
    // =========================================================
    function showMessage(text, type = "success") {
        if (!statusMsg) return;
        statusMsg.textContent = text;
        statusMsg.className = "message " + type;
        setTimeout(() => {
            statusMsg.className = "message";
            statusMsg.textContent = "";
        }, 5000);
    }

    function refreshIcons() {
        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[s]);
    }

    // =========================================================
    // INIT
    // =========================================================
    (function init() {
        const user = window.getCurrentUser ? window.getCurrentUser() : {};
        const avatar = $("userAvatar");
        const nameDisplay = $("userNameDisplay");

        if (avatar) {
            if (user.profile_image) {
                avatar.innerHTML = `<img src="${escapeHtml(user.profile_image)}" alt="Profile">`;
            } else {
                const initial = (user.display_name || user.username || "C").charAt(0).toUpperCase();
                avatar.textContent = initial;
            }
        }
        if (nameDisplay) {
            nameDisplay.textContent = user.display_name || user.username || "Creator";
        }

        const id = getServiceIdFromURL();
        if (id) {
            loadService(id);
        } else {
            if ($("pageTitle")) $("pageTitle").textContent = "Create Service";
            loadProjectsForSelector();
            updatePreview();
            if (pricingType?.value === "range" && $("rangeFields")) {
                $("rangeFields").style.display = "grid";
            }
        }

        refreshIcons();
    })();
});