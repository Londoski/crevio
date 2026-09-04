// =========================================================
// CREVIO — SERVICES JS (Professional Workspace)
// =========================================================

console.log('✅ services.js loaded');

const container = document.getElementById('servicesContainer');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const sortBy = document.getElementById('sortBy');
const serviceCount = document.getElementById('serviceCount');

let allServices = [];
let allProjects = [];
let currentFilter = 'all';
let currentSort = 'recent';
let currentSearch = '';

function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- API HELPERS ----
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            ...options.headers
        }
    });
    if (res.status === 401) {
        localStorage.removeItem('crevio_token');
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return res;
}

// ---- LOAD ALL DATA ----
async function loadAll() {
    await loadServices();
    await loadProjectsForSuggestions();
}

// ---- LOAD SERVICES ----
async function loadServices() {
    try {
        const res = await apiFetch('/api/services');
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load services');
        allServices = data.services || [];
        const stats = data.stats || {};
        updateStats(stats);
        renderServices(allServices);
    } catch (err) {
        console.error('Load services error:', err);
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1; color:var(--danger);">
                <i data-lucide="alert-circle" class="icon"></i>
                <h3>Unable to load services</h3>
                <p>Please refresh the page.</p>
                <button class="primary-button" onclick="loadServices()">
                    <i data-lucide="refresh-cw" class="icon"></i> Retry
                </button>
            </div>
        `;
        refreshIcons();
    }
}

// ---- UPDATE STATS ----
function updateStats(stats) {
    document.getElementById('totalCount').textContent = stats.active + stats.draft || 0;
    document.getElementById('featuredCount').textContent = stats.featured || 0;
    // Project links: sum of project_count across all services
    let totalLinks = 0;
    allServices.forEach(s => totalLinks += (s.project_count || 0));
    document.getElementById('projectLinksCount').textContent = totalLinks;
}

// ---- RENDER SERVICES (with filtering & sorting) ----
function renderServices(services) {
    // Apply filters
    let filtered = [...services];
    if (currentFilter !== 'all') {
        filtered = filtered.filter(s => s.status === currentFilter);
    }
    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(s =>
            s.title.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.category && s.category.toLowerCase().includes(q))
        );
    }
    // Apply sort
    if (currentSort === 'recent') {
        filtered.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    } else if (currentSort === 'created') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (currentSort === 'alpha') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (currentSort === 'alpha-desc') {
        filtered.sort((a, b) => b.title.localeCompare(a.title));
    }

    // Update count
    serviceCount.textContent = `${filtered.length} service${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0 && services.length === 0) {
        renderEmptyState();
        return;
    } else if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1; padding:40px 0;">
                <i data-lucide="search" class="icon"></i>
                <h3>No services match</h3>
                <p>Try adjusting your filters or search term.</p>
            </div>
        `;
        refreshIcons();
        // Still show suggested if no services at all
        if (services.length === 0) renderSuggestedServices();
        return;
    }

    let html = '';
    filtered.forEach(service => {
        const statusClass = service.status === 'published' ? 'published' : 'draft';
        const statusLabel = service.status === 'published' ? '● Published' : '○ Draft';
        const pricingDisplay = getPricingDisplay(service);
        const projectCount = service.project_count || 0;

        html += `
            <div class="service-card" data-id="${service.id}">
                <div class="card-body">
                    ${service.category ? `<div class="category">${service.category}</div>` : ''}
                    <div class="title-row">
                        <span class="title">
                            ${service.title}
                            ${service.featured ? `<span class="featured-badge">Featured</span>` : ''}
                        </span>
                    </div>
                    <div class="description">${service.description || 'No description yet.'}</div>
                    ${pricingDisplay ? `<div class="pricing">${pricingDisplay}</div>` : ''}
                    <div class="meta">
                        <span class="status ${statusClass}">${statusLabel}</span>
                        <span>${projectCount} project${projectCount !== 1 ? 's' : ''} connected</span>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="date">${new Date(service.created_at).toLocaleDateString()}</span>
                    <div class="actions">
                        <a href="/dashboard/pages/service-edit.html?id=${service.id}" class="btn-icon" title="Edit">
                            <i data-lucide="edit-2" style="width:16px;height:16px;"></i>
                        </a>
                        <a href="/u/${service.slug}" target="_blank" class="btn-icon" title="Preview">
                            <i data-lucide="eye" style="width:16px;height:16px;"></i>
                        </a>
                        <button class="btn-icon danger" data-id="${service.id}" title="Delete">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    refreshIcons();

    // Delete handler
    container.querySelectorAll('.btn-icon.danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            if (confirm('Delete this service?')) deleteService(id);
        });
    });

    // Show suggested services if we have services already
    renderSuggestedServices();
}

// ---- PRICING DISPLAY ----
function getPricingDisplay(service) {
    const currency = service.currency || 'USD';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₦';
    if (service.pricing_type === 'fixed' && service.price) {
        return `${symbol}${service.price.toLocaleString()}`;
    } else if (service.pricing_type === 'starting_from' && service.price) {
        return `Starting from ${symbol}${service.price.toLocaleString()}`;
    } else if (service.pricing_type === 'range' && service.min_price && service.max_price) {
        return `${symbol}${service.min_price.toLocaleString()} — ${symbol}${service.max_price.toLocaleString()}`;
    } else if (service.pricing_type === 'custom_quote') {
        return 'Custom Quote';
    } else if (service.pricing_type === 'contact') {
        return 'Contact for pricing';
    }
    return '';
}

// ---- EMPTY STATE (with onboarding) ----
function renderEmptyState() {
    container.innerHTML = `
        <div class="empty-state">
            <i data-lucide="briefcase" class="icon"></i>
            <h3>No services yet</h3>
            <p>Turn your skills into clear professional services that clients can understand and hire you for.</p>
            <a href="/dashboard/pages/service-edit.html" class="primary-button">
                <i data-lucide="plus" class="icon"></i> Create Your First Service
            </a>
            <div class="onboarding-steps">
                <div class="step">
                    <span class="num">01</span>
                    <h4>Create</h4>
                    <p>Tell clients what you offer.</p>
                </div>
                <div class="step">
                    <span class="num">02</span>
                    <h4>Connect</h4>
                    <p>Add projects that prove it.</p>
                </div>
                <div class="step">
                    <span class="num">03</span>
                    <h4>Get inquiries</h4>
                    <p>Visitors contact you.</p>
                </div>
            </div>
        </div>
    `;
    refreshIcons();
    // Show suggested services
    renderSuggestedServices();
}

// ---- LOAD PROJECTS FOR SUGGESTIONS ----
async function loadProjectsForSuggestions() {
    try {
        const res = await apiFetch('/api/projects');
        if (!res) return;
        const data = await res.json();
        if (data.success) {
            allProjects = data.projects || [];
        }
    } catch (e) { /* ignore */ }
    // Re-render suggested if already shown
    renderSuggestedServices();
}

// ---- SUGGESTED SERVICES (based on projects) ----
function renderSuggestedServices() {
    // Find existing suggestions container
    let containerEl = document.querySelector('.suggested-section');
    if (!containerEl) {
        // Create if not exists
        const grid = document.querySelector('.service-grid');
        if (!grid) return;
        containerEl = document.createElement('div');
        containerEl.className = 'suggested-section';
        grid.appendChild(containerEl);
    }

    // Compute suggestions from projects
    const suggestions = computeSuggestions(allProjects);

    if (suggestions.length === 0) {
        containerEl.style.display = 'none';
        return;
    }
    containerEl.style.display = 'block';

    let html = `
        <h3>Suggested Services</h3>
        <p class="subtitle">Based on your portfolio</p>
        <div class="suggested-grid">
    `;
    suggestions.forEach(sug => {
        html += `
            <div class="suggested-card">
                <span class="s-icon">${sug.icon || '✦'}</span>
                <div class="s-name">${sug.name}</div>
                <div class="s-desc">${sug.projects} project${sug.projects > 1 ? 's' : ''} support this</div>
                <button class="s-add" data-name="${sug.name}" data-category="${sug.category || ''}">+ Add</button>
            </div>
        `;
    });
    html += '</div>';
    containerEl.innerHTML = html;
    refreshIcons();

    // Add click handlers for suggestion buttons
    containerEl.querySelectorAll('.s-add').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.dataset.name;
            const category = this.dataset.category;
            // Redirect to service editor with pre-filled name and category
            const url = `/dashboard/pages/service-edit.html?name=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`;
            window.location.href = url;
        });
    });
}

// ---- COMPUTE SUGGESTIONS ----
function computeSuggestions(projects) {
    if (!projects || projects.length === 0) return [];

    // Count project categories
    const categoryCount = {};
    projects.forEach(p => {
        const cat = p.category || 'General';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Map categories to service names (simple mapping)
    const map = {
        'Video Production': { name: 'Video Production', icon: '🎥' },
        'Photography': { name: 'Photography', icon: '📷' },
        'Graphic Design': { name: 'Graphic Design', icon: '✦' },
        'Web Development': { name: 'Web Development', icon: '⚡' },
        'Branding': { name: 'Branding', icon: '🏷️' },
        'Writing': { name: 'Content Writing', icon: '✍️' },
        'Consulting': { name: 'Consulting', icon: '💼' },
        'Film': { name: 'Film Production', icon: '🎬' },
        'Documentary': { name: 'Documentary Filmmaking', icon: '🎞️' },
        'Commercial': { name: 'Commercial Production', icon: '📺' },
    };

    const suggestions = [];
    for (const [cat, count] of Object.entries(categoryCount)) {
        const mapped = map[cat];
        if (mapped) {
            suggestions.push({
                name: mapped.name,
                icon: mapped.icon,
                category: cat,
                projects: count
            });
        } else {
            // Use category as service name
            suggestions.push({
                name: cat,
                icon: '✦',
                category: cat,
                projects: count
            });
        }
    }

    // Sort by project count descending and limit to 6
    suggestions.sort((a, b) => b.projects - a.projects);
    return suggestions.slice(0, 6);
}

// ---- DELETE SERVICE ----
async function deleteService(id) {
    const token = getToken();
    if (!token) return;
    try {
        const res = await apiFetch(`/api/services/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
        loadServices();
    } catch (err) {
        alert('❌ ' + err.message);
    }
}

// ---- TOOLBAR EVENTS ----
searchInput.addEventListener('input', function() {
    currentSearch = this.value.trim();
    renderServices(allServices);
});

filterStatus.addEventListener('change', function() {
    currentFilter = this.value;
    renderServices(allServices);
});

sortBy.addEventListener('change', function() {
    currentSort = this.value;
    renderServices(allServices);
});

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadAll();
    // Avatar
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) avatar.textContent = user.display_name.charAt(0).toUpperCase();
            if (nameDisplay && user.display_name) nameDisplay.textContent = user.display_name;
        } catch (e) {}
    }
});