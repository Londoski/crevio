// =========================================================
// CREVIO — TESTIMONIALS PAGE
// File: dashboard/js/testimonials.js
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const toast = $("toast");
    const listContainer = $("listContainer");
    const formCard = $("formCard");
    const formTitle = $("formTitle");
    const quoteInput = $("quote");
    const quoteCount = $("quoteCount");

    let testimonials = [];
    let editingId = null;

    // ---------- Helpers ----------
    function showToast(msg, isError) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.toggle("error", !!isError);
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (s) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
        });
    }

    // ---------- Load ----------
    async function loadTestimonials() {
        try {
            const res = await window.apiFetch("/api/testimonials");
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to load");
            testimonials = data.testimonials || [];
            renderList();
        } catch (err) {
            console.error("loadTestimonials:", err);
            listContainer.innerHTML =
                '<div class="empty-state"><h3>Could not load testimonials</h3><p>' +
                escapeHtml(err.message) + '</p></div>';
        }
    }

    // ---------- Render ----------
    function renderList() {
        if (!testimonials.length) {
            listContainer.innerHTML = [
                '<div class="empty-state">',
                '  <i data-lucide="message-square-quote" class="icon"></i>',
                '  <h3>No testimonials yet</h3>',
                '  <p>Add your first client quote to make your portfolio feel more professional.</p>',
                '  <button class="btn-primary" id="emptyNewBtn">',
                '    <i data-lucide="plus" class="icon" style="width:16px;height:16px;"></i>',
                '    Add Your First Testimonial',
                '  </button>',
                '</div>'
            ].join("");
            if (typeof lucide !== "undefined") lucide.createIcons();
            $("emptyNewBtn")?.addEventListener("click", () => openForm(null));
            return;
        }

        listContainer.innerHTML = testimonials.map(function (t) {
            const avatarHtml = t.author_avatar
                ? '<img class="t-avatar" src="' + escapeHtml(t.author_avatar) + '" alt="">'
                : '<div class="t-avatar"></div>';
            const roleLine = [t.author_role, t.author_company].filter(Boolean).join(" · ");
            const badgeClass = t.is_visible ? "visible" : "hidden";
            const badgeText = t.is_visible ? "Visible" : "Hidden";

            return [
                '<div class="testimonial-item ' + (t.is_visible ? "" : "hidden-item") + '" data-id="' + t.id + '">',
                '  ' + avatarHtml,
                '  <div class="t-quote">',
                '    <div class="t-quote-text">"' + escapeHtml(t.quote) + '"</div>',
                '    <div class="t-author">',
                '      <strong>' + escapeHtml(t.author_name) + '</strong>',
                (roleLine ? ' — ' + escapeHtml(roleLine) : ''),
                '      <span class="t-badge ' + badgeClass + '">' + badgeText + '</span>',
                '    </div>',
                '  </div>',
                '  <div class="t-actions">',
                '    <button class="btn-secondary" data-action="edit" data-id="' + t.id + '" title="Edit">',
                '      <i data-lucide="edit-3" class="icon" style="width:14px;height:14px;"></i>',
                '    </button>',
                '    <button class="btn-danger" data-action="delete" data-id="' + t.id + '" title="Delete">',
                '      <i data-lucide="trash-2" class="icon" style="width:14px;height:14px;"></i>',
                '    </button>',
                '  </div>',
                '</div>'
            ].join("");
        }).join("");

        if (typeof lucide !== "undefined") lucide.createIcons();

        listContainer.querySelectorAll("[data-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const id = parseInt(btn.dataset.id, 10);
                if (btn.dataset.action === "edit") openForm(id);
                else if (btn.dataset.action === "delete") deleteTestimonial(id);
            });
        });
    }

    // ---------- Form ----------
    function openForm(id) {
        editingId = id;
        formTitle.textContent = id ? "Edit Testimonial" : "Add Testimonial";
        formCard.style.display = "block";

        if (id) {
            const t = testimonials.find(function (x) { return x.id === id; });
            if (t) {
                quoteInput.value = t.quote || "";
                $("authorName").value = t.author_name || "";
                $("authorRole").value = t.author_role || "";
                $("authorCompany").value = t.author_company || "";
                $("authorAvatar").value = t.author_avatar || "";
                $("displayOrder").value = t.display_order || 0;
                $("isVisible").value = t.is_visible ? "1" : "0";
            }
        } else {
            quoteInput.value = "";
            $("authorName").value = "";
            $("authorRole").value = "";
            $("authorCompany").value = "";
            $("authorAvatar").value = "";
            $("displayOrder").value = testimonials.length;
            $("isVisible").value = "1";
        }

        updateQuoteCount();
        formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function closeForm() {
        editingId = null;
        formCard.style.display = "none";
    }

    function updateQuoteCount() {
        if (quoteCount) quoteCount.textContent = String(quoteInput.value.length);
    }

    async function saveTestimonial() {
        const payload = {
            quote: quoteInput.value.trim(),
            author_name: $("authorName").value.trim(),
            author_role: $("authorRole").value.trim(),
            author_company: $("authorCompany").value.trim(),
            author_avatar: $("authorAvatar").value.trim(),
            display_order: parseInt($("displayOrder").value, 10) || 0,
            is_visible: $("isVisible").value === "1"
        };

        if (payload.quote.length < 4) {
            showToast("Quote must be at least 4 characters", true);
            return;
        }
        if (!payload.author_name) {
            showToast("Author name is required", true);
            return;
        }

        const saveBtn = $("saveBtn");
        const original = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = "Saving...";

        try {
            const url = editingId ? ("/api/testimonials/" + editingId) : "/api/testimonials";
            const method = editingId ? "PATCH" : "POST";
            const res = await window.apiFetch(url, {
                method: method,
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to save");

            showToast(editingId ? "Testimonial updated" : "Testimonial added");
            closeForm();
            await loadTestimonials();
        } catch (err) {
            showToast(err.message || "Failed to save", true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = original;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    async function deleteTestimonial(id) {
        const ok = await window.crevioConfirm(
            "Delete this testimonial? This cannot be undone.",
            { title: "Delete testimonial", confirmText: "Delete", danger: true }
        );
        if (!ok) return;

        try {
            const res = await window.apiFetch("/api/testimonials/" + id, { method: "DELETE" });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to delete");
            showToast("Testimonial deleted");
            await loadTestimonials();
        } catch (err) {
            showToast(err.message || "Failed to delete", true);
        }
    }

    // ---------- Wire ----------
    $("newBtn")?.addEventListener("click", () => openForm(null));
    $("cancelBtn")?.addEventListener("click", closeForm);
    $("saveBtn")?.addEventListener("click", saveTestimonial);
    quoteInput?.addEventListener("input", updateQuoteCount);

    loadTestimonials();
});