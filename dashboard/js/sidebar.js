// Injects the sidebar navigation into any page that has <div id="sidebar"></div>
(function () {
    const sidebarEl = document.getElementById("sidebar");
    if (!sidebarEl) return;

    const currentPath = window.location.pathname;

    const links = [
        { href: "/dashboard/",           label: "Overview" },
        { href: "/dashboard/projects.html",  label: "Projects" },
        { href: "/dashboard/services.html",  label: "Services" },
        { href: "/dashboard/skills.html",    label: "Skills" },
        { href: "/dashboard/messages.html",  label: "Messages" },
        { href: "/dashboard/profile.html",   label: "Profile" },
        { href: "/dashboard/settings.html",  label: "Settings" }
    ];

    const nav = links.map(l => {
        const isActive = currentPath === l.href ||
                         (l.href !== "/dashboard/" && currentPath.startsWith(l.href.replace(".html", "")));
        return `<a href="${l.href}" class="${isActive ? "active" : ""}">${l.label}</a>`;
    }).join("");

    sidebarEl.innerHTML = `
        <h2>Crevio</h2>
        <div class="sub">ADMIN PORTAL</div>
        <nav>${nav}</nav>
    `;
})();