// =========================================================
// CREVIO — SOCIAL LINKS PAGE
// File: dashboard/js/social-links.js
// Full CRUD + visibility toggle + drag reorder + brand icons
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container = $("socialsContainer");
    const modal     = $("socialModal");
    const form      = $("socialForm");
    const toast     = $("toast");

    let allSocials = [];

    // =========================================================
    // BRAND ICONS (inline SVG — Lucide removed brand icons)
    // =========================================================
    const BRAND_ICONS = {
        instagram: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,

        youtube: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,

        linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,

        tiktok: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,

        facebook: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,

        x: `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,

        behance: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7.799 5.698c.589 0 1.12.051 1.606.156.482.102.894.273 1.241.507.344.235.612.546.804.938.188.387.281.871.281 1.443 0 .619-.141 1.137-.421 1.551-.284.413-.7.751-1.255 1.014.756.218 1.317.6 1.689 1.146.374.549.557 1.205.557 1.975 0 .623-.121 1.154-.361 1.605-.244.453-.568.823-.977 1.109-.41.287-.871.502-1.393.633-.519.132-1.057.196-1.606.196H0V5.698h7.799zm-.406 4.785c.479 0 .873-.117 1.178-.345.305-.233.456-.594.456-1.078 0-.277-.047-.506-.146-.684a1.158 1.158 0 00-.388-.41 1.6 1.6 0 00-.556-.212 3.096 3.096 0 00-.653-.062H3.501v2.791h3.892zm.206 5.035c.305 0 .595-.028.868-.089.27-.058.507-.156.71-.291.2-.135.361-.314.481-.535.114-.221.174-.507.174-.858 0-.68-.191-1.164-.577-1.455-.386-.291-.898-.437-1.534-.437H3.501v3.666h4.098zM17.945 17.058c.475.454 1.146.68 2.023.68.633 0 1.179-.156 1.632-.469.451-.314.732-.643.832-.989h2.141c-.341 1.066-.874 1.828-1.583 2.284-.71.454-1.572.684-2.583.684-.704 0-1.344-.114-1.906-.341-.568-.229-1.042-.55-1.441-.965-.396-.416-.698-.914-.908-1.497-.206-.58-.316-1.221-.316-1.928 0-.686.104-1.321.316-1.903a4.36 4.36 0 01.908-1.516c.396-.42.871-.749 1.441-.982.561-.234 1.202-.347 1.906-.347.766 0 1.438.147 2.005.443a4.012 4.012 0 011.398 1.196 5.02 5.02 0 01.79 1.727c.152.639.204 1.31.146 2.012h-6.722c.041.914.299 1.61.774 2.063v-.006zm3.549-5.598c-.386-.413-.975-.639-1.723-.639-.508 0-.93.087-1.271.256-.336.174-.61.393-.82.66-.21.27-.357.556-.443.86-.082.305-.129.58-.141.829h4.659c-.09-.799-.362-1.414-.749-1.826l.488-.14zM14.196 6.865h5.956v1.449h-5.956z"/></svg>`,

        dribbble: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.29zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/></svg>`,

        github: `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,

        website: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,

        other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`
    };

    function iconForPlatform(p) {
        const map = {
            instagram: "instagram",
            youtube:   "youtube",
            linkedin:  "linkedin",
            tiktok:    "tiktok",
            facebook:  "facebook",
            x:         "x",
            twitter:   "x",
            behance:   "behance",
            dribbble:  "dribbble",
            github:    "github",
            website:   "website",
            other:     "other"
        };
        return BRAND_ICONS[map[p]] || BRAND_ICONS.other;
    }

    // =========================================================
    // LOAD STATS
    // =========================================================
    async function loadStats() {
        try {
            const res = await window.apiFetch("/api/socials/stats");
            const d = await res.json();
            if (d.success) {
                $("statTotal").textContent   = d.stats.total;
                $("statVisible").textContent = d.stats.visible;
                $("statHidden").textContent  = d.stats.hidden;
            }
        } catch (err) { console.error("Stats error:", err); }
    }

    // =========================================================
    // LOAD SOCIALS
    // =========================================================
    async function loadSocials() {
        container.innerHTML = `<div class="state-box"><p>Loading social accounts…</p></div>`;
        try {
            const res = await window.apiFetch("/api/socials");
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            allSocials = data.socials || data.socialLinks || [];
            renderSocials();
        } catch (err) {
            console.error("Load error:", err);
            container.innerHTML = `
                <div class="state-box error">
                    <i data-lucide="alert-triangle" class="icon-lg"></i>
                    <h3>We couldn't load your social accounts.</h3>
                    <p>${escapeHtml(err.message)}</p>
                    <button class="btn-primary" onclick="location.reload()">Try Again</button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function renderSocials() {
        if (!allSocials.length) {
            container.innerHTML = `
                <div class="state-box">
                    <i data-lucide="share-2" class="icon-lg"></i>
                    <h3>Connect your professional presence</h3>
                    <p>Add the platforms where people can discover your work, follow your journey, or learn more about what you do.</p>
                    <button class="btn-primary" id="emptyAddBtn">
                        <i data-lucide="plus" class="icon" style="width:14px;height:14px;"></i> Add Social
                    </button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            $("emptyAddBtn")?.addEventListener("click", () => openModal());
            return;
        }

        container.innerHTML = `<div class="socials-grid">${allSocials.map(renderCard).join("")}</div>`;
        if (typeof lucide !== "undefined") lucide.createIcons();
        wireActions();
        wireDrag();
    }

    function renderCard(s) {
        const platform = (s.platform || "other").toLowerCase();
        const icon = iconForPlatform(platform);
        const handle = s.handle || "";
        const visible = s.is_visible !== 0;

        return `
            <div class="social-card ${visible ? "" : "hidden-state"}" draggable="true" data-social-id="${s.id}">
                <div class="social-logo ${platform}">
                    ${icon}
                </div>
                <div class="social-info">
                    <div class="social-platform">${escapeHtml(s.platform || "Other")}</div>
                    ${handle ? `<div class="social-handle">${escapeHtml(handle)}</div>` : ""}
                    <div class="social-url" title="${escapeHtml(s.url)}">${escapeHtml(s.url)}</div>
                </div>
                <div class="social-actions">
                    <button class="icon-btn" data-toggle="${s.id}" title="${visible ? "Hide" : "Show"}">
                        <i data-lucide="${visible ? "eye" : "eye-off"}" class="icon"></i>
                    </button>
                    <button class="icon-btn" data-edit="${s.id}" title="Edit">
                        <i data-lucide="pencil" class="icon"></i>
                    </button>
                    <button class="icon-btn danger" data-delete="${s.id}" title="Remove">
                        <i data-lucide="trash-2" class="icon"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // =========================================================
    // WIRE ACTIONS
    // =========================================================
    function wireActions() {
        container.querySelectorAll("[data-edit]").forEach(el => {
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = el.dataset.edit;
                const s = allSocials.find(x => String(x.id) === String(id));
                if (s) openModal(s);
            });
        });

        container.querySelectorAll("[data-toggle]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.toggle;
                try {
                    const res = await window.apiFetch(`/api/socials/${id}/visibility`, { method: "PATCH" });
                    const data = await res.json();
                    if (data.success) {
                        const s = allSocials.find(x => String(x.id) === String(id));
                        if (s) s.is_visible = data.visible ? 1 : 0;
                        renderSocials();
                        loadStats();
                        showToast(data.visible ? "Now visible" : "Now hidden");
                    } else {
                        showToast(data.message || "Failed", true);
                    }
                } catch (err) { showToast("Failed: " + err.message, true); }
            });
        });

        container.querySelectorAll("[data-delete]").forEach(el => {
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = el.dataset.delete;
                const s = allSocials.find(x => String(x.id) === String(id));
                if (!s) return;
                const msg = s.is_visible
                    ? `Remove "${s.platform}" from your Crevio profile?\n\nThis will remove the link from your public portfolio. Your actual ${s.platform} account will not be affected.`
                    : `Remove "${s.platform}"?`;
                if (!confirm(msg)) return;
                try {
                    const res = await window.apiFetch(`/api/socials/${id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.success) {
                        allSocials = allSocials.filter(x => String(x.id) !== String(id));
                        renderSocials();
                        loadStats();
                        showToast("Removed");
                    } else {
                        showToast(data.message || "Failed", true);
                    }
                } catch (err) { showToast("Failed: " + err.message, true); }
            });
        });
    }

    // =========================================================
    // DRAG TO REORDER
    // =========================================================
    function wireDrag() {
        let draggedEl = null;

        const cards = container.querySelectorAll(".social-card");
        cards.forEach(card => {
            card.addEventListener("dragstart", (e) => {
                draggedEl = card;
                card.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
            });

            card.addEventListener("dragend", async () => {
                card.classList.remove("dragging");
                container.querySelectorAll(".social-card").forEach(c => c.classList.remove("drag-over"));

                const ids = [...container.querySelectorAll(".social-card")]
                    .map(el => parseInt(el.dataset.socialId, 10));

                try {
                    await window.apiFetch("/api/socials/reorder", {
                        method: "PUT",
                        body: JSON.stringify({ order: ids })
                    });
                } catch (err) {
                    console.error("Reorder save failed:", err);
                }
            });

            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (!draggedEl || draggedEl === card) return;
                const rect = card.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (e.clientY < mid) {
                    container.insertBefore(draggedEl, card);
                } else {
                    container.insertBefore(draggedEl, card.nextSibling);
                }
                card.classList.add("drag-over");
            });

            card.addEventListener("dragleave", () => {
                card.classList.remove("drag-over");
            });
        });
    }

    // =========================================================
    // MODAL
    // =========================================================
    function openModal(social = null) {
        form.reset();
        $("socialId").value = social?.id || "";
        $("modalTitle").textContent = social ? "Edit Social" : "Add Social";

        if (social) {
            $("platform").value  = social.platform || "";
            $("url").value       = social.url || "";
            $("handle").value    = social.handle || "";
            $("isVisible").checked = social.is_visible !== 0;
        } else {
            $("isVisible").checked = true;
        }
        modal.classList.add("open");
    }

    function closeModal() { modal.classList.remove("open"); }

    $("newSocialBtn")?.addEventListener("click", () => openModal());
    $("cancelBtn")?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // =========================================================
    // SAVE
    // =========================================================
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = $("socialId").value;
        const payload = {
            platform:   $("platform").value,
            url:        $("url").value.trim(),
            handle:     $("handle").value.trim(),
            is_visible: $("isVisible").checked
        };

        if (!payload.platform) return showToast("Please select a platform", true);
        if (!payload.url)      return showToast("URL is required", true);
        if (!/^https?:\/\//i.test(payload.url)) {
            return showToast("URL must start with http:// or https://", true);
        }

        const saveBtn = $("saveBtn");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";

        try {
            const url    = id ? `/api/socials/${id}` : "/api/socials";
            const method = id ? "PATCH" : "POST";
            const res    = await window.apiFetch(url, { method, body: JSON.stringify(payload) });
            const data   = await res.json();

            if (data.success) {
                closeModal();
                await Promise.all([loadStats(), loadSocials()]);
                showToast(id ? "Updated" : "Added");
            } else {
                showToast(data.message || "Failed to save", true);
            }
        } catch (err) {
            showToast("Failed: " + err.message, true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
        }
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
    loadSocials();
});