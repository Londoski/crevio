// =========================================================
// CREVIO — EDIT PORTFOLIO (live preview editor, smart)
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const toast       = document.getElementById("toast");
    const previewUrl  = document.getElementById("previewUrlText");
    const previewCont = document.getElementById("previewContainer");
    const orderList   = document.getElementById("orderList");

    let config = {};

    // ---------- COLLAPSIBLE GROUPS ----------
    document.querySelectorAll(".control-group-header").forEach(h => {
        h.addEventListener("click", () => {
            const group = h.dataset.toggle;
            const body  = document.querySelector(`[data-group="${group}"]`);
            const chev  = h.querySelector(".chevron");
            if (!body || !chev) return;
            body.classList.toggle("open");
            chev.classList.toggle("open");
        });
    });

    // ---------- LOAD CONFIG ----------
    async function loadConfig() {
        try {
            const res  = await window.apiFetch("/api/portfolio/config");
            const data = await res.json();
            config = (data.success && data.config) ? data.config : {};
        } catch (err) {
            console.warn("Load config error:", err);
            config = {};
        }
        applyToUI();
        updatePreview();
    }

    function applyToUI() {
        const user = window.getCurrentUser();

        // Hero fields
        document.getElementById("heroTitle").value   = config.title    || user.display_name || user.username || "";
        document.getElementById("heroTagline").value = config.tagline  || "";
        document.getElementById("heroImage").value   = user.profile_image || "";

        // Style
        document.getElementById("primaryColor").value = config.primary_color    || "#2563EB";
        document.getElementById("bgColor").value      = config.background_color || "#0F172A";
        document.getElementById("fontFamily").value   = config.font_family      || "Inter";

        // Sections visibility
        let sections = {};
        try { sections = JSON.parse(config.sections || "{}"); } catch (e) { sections = {}; }

        document.querySelectorAll("[data-visible]").forEach(el => {
            const key = el.dataset.visible;
            el.checked = sections[key] !== false;
        });

        // Section order
        if (Array.isArray(sections._order) && sections._order.length) {
            reorderSections(sections._order);
        }
    }

    function reorderSections(order) {
        order.forEach(name => {
            const el = orderList.querySelector(`[data-section="${name}"]`);
            if (el) orderList.appendChild(el);
        });
    }

    // ---------- PREVIEW (smart: iframe when published, empty state when draft) ----------
    function updatePreview() {
        const slug   = config.slug || (window.getCurrentUser().username || "user").toLowerCase();
        const status = (config.status || "draft").toLowerCase();

        previewUrl.textContent = `${window.location.origin}/p/${slug}`;

        // If not published → show empty state with "Publish & Preview"
        if (status !== "published") {
            showEmptyPreview(slug);
            return;
        }

        // Published → show iframe with the live portfolio
        previewCont.innerHTML = `
            <iframe
                class="preview-frame"
                id="previewFrame"
                src="/p/${encodeURIComponent(slug)}?v=${Date.now()}"
                sandbox="allow-same-origin allow-scripts allow-popups"
                title="Portfolio Preview"
            ></iframe>
        `;

        // Reapply current device class
        const activeDevice = document.querySelector("[data-device].active")?.dataset.device || "desktop";
        const frame = document.getElementById("previewFrame");
        if (frame) {
            frame.classList.remove("desktop", "tablet", "mobile");
            frame.classList.add(activeDevice);
        }
    }

    function showEmptyPreview(slug) {
        previewCont.innerHTML = `
            <div class="empty-preview">
                <i data-lucide="rocket" class="icon"></i>
                <h3>Ready to publish?</h3>
                <p>Your portfolio at <strong>/p/${slug}</strong> is currently a <strong>draft</strong>.</p>
                <p style="font-size:12px;">Publish it to see the live preview here.</p>
                <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; justify-content:center;">
                    <button class="btn-primary" id="publishAndPreviewBtn">
                        <i data-lucide="upload-cloud" class="icon" style="width:14px;height:14px;"></i>
                        Publish &amp; Preview
                    </button>
                    <a href="/dashboard/pages/portfolio.html" class="btn-secondary" style="text-decoration:none;">
                        Configure Settings
                    </a>
                </div>
            </div>
        `;
        if (typeof lucide !== "undefined") lucide.createIcons();

        // Wire "Publish & Preview"
        const btn = document.getElementById("publishAndPreviewBtn");
        btn?.addEventListener("click", async () => {
            btn.disabled = true;
            btn.innerHTML = `Publishing...`;
            try {
                const res = await window.apiFetch("/api/portfolio/publish", {
                    method: "POST",
                    body: JSON.stringify({ publish: true })
                });
                const data = await res.json();
                if (data.success) {
                    showToast("Portfolio published!");
                    await loadConfig(); // reload → status = published → iframe appears
                } else {
                    showToast(data.message || "Failed to publish", true);
                    btn.disabled = false;
                    btn.innerHTML = `<i data-lucide="upload-cloud" class="icon" style="width:14px;height:14px;"></i> Publish &amp; Preview`;
                    if (typeof lucide !== "undefined") lucide.createIcons();
                }
            } catch (err) {
                showToast("Failed: " + err.message, true);
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="upload-cloud" class="icon" style="width:14px;height:14px;"></i> Publish &amp; Preview`;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        });
    }

    // ---------- DEVICE SWITCHER ----------
    document.querySelectorAll("[data-device]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-device]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const frame = document.getElementById("previewFrame");
            if (!frame) return;
            frame.classList.remove("desktop", "tablet", "mobile");
            frame.classList.add(btn.dataset.device);
        });
    });

    // ---------- DRAG & DROP SECTIONS ----------
    let dragged = null;

    orderList?.addEventListener("dragstart", (e) => {
        const item = e.target.closest(".order-item");
        if (!item) return;
        dragged = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    });

    orderList?.addEventListener("dragend", () => {
        if (dragged) dragged.classList.remove("dragging");
        dragged = null;
    });

    orderList?.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!dragged) return;
        const after = getDragAfterElement(orderList, e.clientY);
        if (after == null) {
            orderList.appendChild(dragged);
        } else {
            orderList.insertBefore(dragged, after);
        }
    });

    function getDragAfterElement(container, y) {
        const els = [...container.querySelectorAll(".order-item:not(.dragging)")];
        return els.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // ---------- SAVE ----------
    async function save() {
        const sections = {};
        document.querySelectorAll("[data-visible]").forEach(el => {
            sections[el.dataset.visible] = el.checked;
        });
        sections._order = [...orderList.querySelectorAll(".order-item")].map(el => el.dataset.section);

        const payload = {
            slug:             config.slug || (window.getCurrentUser().username || "").toLowerCase(),
            title:            document.getElementById("heroTitle").value.trim(),
            tagline:          document.getElementById("heroTagline").value.trim(),
            meta_description: config.meta_description || "",
            template:         config.template || "minimal",
            sections:         JSON.stringify(sections),
            primary_color:    document.getElementById("primaryColor").value,
            background_color: document.getElementById("bgColor").value,
            font_family:      document.getElementById("fontFamily").value
        };

        const saveBtn = document.getElementById("saveBtn");
        saveBtn.disabled = true;
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = `Saving...`;

        try {
            const res  = await window.apiFetch("/api/portfolio/config", {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showToast("Portfolio saved");
                await loadConfig(); // reload config + refresh preview
            } else {
                showToast(data.message || "Failed to save", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHTML;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    document.getElementById("saveBtn")?.addEventListener("click", save);

    // ---------- REFRESH ----------
    document.getElementById("refreshBtn")?.addEventListener("click", () => {
        updatePreview();
        showToast("Preview refreshed");
    });

    // ---------- TOAST ----------
    let toastTimer;
    function showToast(msg, isError = false) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // ---------- INIT ----------
    loadConfig();
});