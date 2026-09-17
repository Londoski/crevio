// =========================================================
// CREVIO — OVERVIEW PAGE (Command Center)
// File: dashboard/js/dashboard.js
// All data comes from /api/dashboard/overview — no hardcoded values
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    // =========================================================
    // LOAD
    // =========================================================
    async function loadOverview() {
        try {
            const res  = await window.apiFetch("/api/dashboard/overview");
            const data = await res.json();

            if (!data.success) {
                showError("Could not load dashboard data");
                return;
            }

            renderUser(data.user);
            renderPortfolio(data.portfolio);
            renderStats(data.stats);
            renderCompletion(data.completion);
            renderRecentProjects(data.recentProjects);
            renderRecentActivity(data.recentActivity);
        } catch (err) {
            console.error("Load overview error:", err);
            showError(err.message);
        }
    }

    // =========================================================
    // USER / PROFESSIONAL IDENTITY
    // =========================================================
    function renderUser(user) {
        const displayName = user.display_name || user.username || "User";
        const initial = displayName.charAt(0).toUpperCase();

        // Welcome message
        if ($("userName"))        $("userName").textContent        = displayName.split(" ")[0];
        if ($("userNameDisplay")) $("userNameDisplay").textContent = displayName;

        // Top-right small avatar
        const avatar = $("userAvatar");
        if (avatar) {
            if (user.profile_image) {
                avatar.innerHTML = `<img src="${escapeHtml(user.profile_image)}" alt="">`;
            } else {
                avatar.textContent = initial;
            }
        }

        // Professional identity section
        if ($("identityName"))  $("identityName").textContent = displayName;
        if ($("identityProf"))  $("identityProf").textContent = user.primary_profession || "Add your profession";
        if ($("identitySpecs")) $("identitySpecs").textContent = user.specialties || "";
        if ($("identityBio"))   $("identityBio").textContent = user.bio || "";

        // Big identity avatar (circle in the identity card)
        const identityAvatar = $("identityAvatar");
        if (identityAvatar) {
            if (user.profile_image) {
                identityAvatar.innerHTML = `<img src="${escapeHtml(user.profile_image)}" alt="">`;
            } else {
                identityAvatar.textContent = initial;
            }
        }
    }

    // =========================================================
    // PORTFOLIO STATUS
    // =========================================================
    function renderPortfolio(portfolio) {
        const status = (portfolio.status || "draft").toLowerCase();
        const isPub  = status === "published";
        const badge  = $("statusBadge");
        const banner = $("portfolioStatus");

        if ($("portfolioUrl")) $("portfolioUrl").textContent = portfolio.url;
        if ($("bannerTitle"))  $("bannerTitle").textContent   = portfolio.title || "Your Portfolio";

        if (badge) {
            badge.className = "status-badge " + (isPub ? "published" : "draft");
            badge.innerHTML = isPub
                ? `<i data-lucide="check-circle" class="status-icon"></i><span class="status-text">Published</span>`
                : `<i data-lucide="circle-dashed" class="status-icon"></i><span class="status-text">Draft</span>`;
        }
        if (banner) banner.classList.toggle("published", isPub);

        // Update Preview button link
        const previewBtn = $("previewBtn");
        if (previewBtn) previewBtn.href = portfolio.url || "#";

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    // =========================================================
    // STATS
    // =========================================================
    function renderStats(stats) {
        setText("projectsCount",  stats.projects);
        setText("publishedCount", stats.published);
        setText("draftsCount",    stats.drafts);
        setText("mediaCount",     stats.media);
        setText("servicesCount",  stats.services);
        setText("skillsCount",    stats.skills);
    }

    function setText(id, val) {
        const el = $(id);
        if (el) el.textContent = val ?? 0;
    }

    // =========================================================
    // COMPLETION
    // =========================================================
    function renderCompletion(completion) {
        const pct = completion.percent || 0;

        if ($("completionLabel")) $("completionLabel").textContent = `${pct}% complete`;
        if ($("completionFill"))  $("completionFill").style.width  = pct + "%";

        const list = $("checklist");
        if (!list) return;

        list.innerHTML = completion.milestones.map(m => `
            <a href="${escapeHtml(m.href)}" class="checklist-item ${m.done ? 'done' : ''}" style="text-decoration:none; color:inherit;">
                <i data-lucide="${m.done ? "check-circle" : "circle"}" class="check" style="width:16px;height:16px;"></i>
                <span>${escapeHtml(m.label)}</span>
            </a>
        `).join("");

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    // =========================================================
    // RECENT PROJECTS
    // =========================================================
    function renderRecentProjects(projects) {
        const container = $("projectsContainer");
        if (!container) return;

        if (!projects || !projects.length) {
            container.innerHTML = `
                <div class="empty-state" style="padding:24px 0; text-align:center;">
                    <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">No projects yet.</p>
                    <a href="/dashboard/pages/project-create.html" class="primary-button" style="text-decoration:none;">
                        <i data-lucide="plus" class="icon" style="width:14px;height:14px;"></i>
                        Create your first project
                    </a>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            return;
        }

        container.innerHTML = projects.map(p => `
            <a href="/dashboard/pages/project-edit.html?id=${p.id}" class="project-item">
                ${p.thumbnail
                    ? `<img src="${escapeHtml(p.thumbnail)}" alt="" class="project-thumb">`
                    : `<div class="project-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);">
                            <i data-lucide="image" style="width:18px;height:18px;"></i>
                       </div>`}
                <div class="project-info">
                    <h4>${escapeHtml(p.title)}</h4>
                    <span>${escapeHtml(p.category || "Uncategorized")} · ${formatDate(p.created_at)}</span>
                </div>
                <span class="project-badge" style="${p.status === 'published' ? 'color:var(--success);' : ''}">
                    ${p.status}
                </span>
            </a>
        `).join("");

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    // =========================================================
    // RECENT ACTIVITY
    // =========================================================
    function renderRecentActivity(activity) {
        const container = $("activityContainer");
        if (!container) return;

        if (!activity || !activity.length) {
            container.innerHTML = `<div class="empty-state" style="padding:24px 0; text-align:center; color:var(--text-muted); font-size:14px;">Your recent activity will appear here.</div>`;
            return;
        }

        container.innerHTML = activity.map(a => `
            <a href="${escapeHtml(a.href || '#')}" class="activity-item" style="text-decoration:none; color:inherit;">
                <i data-lucide="${a.icon || 'activity'}" style="width:16px;height:16px;"></i>
                <span>${escapeHtml(a.text)}</span>
                <span class="time">${formatRelativeTime(a.time)}</span>
            </a>
        `).join("");

        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    // =========================================================
    // ERROR
    // =========================================================
    function showError(msg) {
        const container = $("projectsContainer");
        if (container) container.innerHTML = `<div class="error-state" style="padding:24px; text-align:center; color:var(--danger); font-size:14px;">${escapeHtml(msg)}</div>`;
    }

    // =========================================================
    // HELPERS
    // =========================================================
    function formatDate(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            return d.getFullYear().toString();
        } catch { return ""; }
    }

    function formatRelativeTime(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            const diff = Date.now() - d.getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1)  return "just now";
            if (m < 60) return m + "m ago";
            const h = Math.floor(m / 60);
            if (h < 24) return h + "h ago";
            const day = Math.floor(h / 24);
            if (day < 7) return day + "d ago";
            return d.toLocaleDateString();
        } catch { return ""; }
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadOverview();
});