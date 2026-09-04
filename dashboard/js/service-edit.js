// =========================================================
// CREVIO — SERVICE EDIT JS (REAL PREVIEW)
// =========================================================

console.log('✅ service-edit.js loaded');

// ---- DOM refs ----
const title = document.getElementById('serviceTitle');
const description = document.getElementById('serviceDescription');
const category = document.getElementById('serviceCategory');
const pricingType = document.getElementById('pricingType');
const price = document.getElementById('price');
const currency = document.getElementById('currency');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const deliveryTime = document.getElementById('deliveryTime');
const revisions = document.getElementById('revisions');
const availability = document.getElementById('availability');
const status = document.getElementById('serviceStatus');
const featured = document.getElementById('featuredService');
const showOnPortfolio = document.getElementById('showOnPortfolio');
const ctaType = document.getElementById('ctaType');
const ctaLabel = document.getElementById('ctaLabel');
const ctaUrl = document.getElementById('ctaUrl');

// ---- Preview elements ----
const previewCategory = document.getElementById('previewCategory');
const previewTitle = document.getElementById('previewTitle');
const previewDesc = document.getElementById('previewDesc');
const previewPrice = document.getElementById('previewPrice');
const previewItems = document.getElementById('previewItems');
const previewCtaBtn = document.getElementById('previewCtaBtn');

// ---- Buttons ----
const saveDraftBtn = document.getElementById('saveDraftBtn');
const publishBtn = document.getElementById('publishBtn');
const statusMsg = document.getElementById('statusMessage');

// ---- Included items ----
const itemsList = document.getElementById('includedItemsList');
const newItemInput = document.getElementById('newItemInput');
const addItemBtn = document.getElementById('addItemBtn');

// ---- FAQs ----
const faqsList = document.getElementById('faqsList');
const faqQuestion = document.getElementById('faqQuestion');
const faqAnswer = document.getElementById('faqAnswer');
const addFaqBtn = document.getElementById('addFaqBtn');

// ---- Projects ----
const projectsSelector = document.getElementById('projectsSelector');

let serviceId = null;
let includedItems = [];
let faqs = [];
let selectedProjects = [];
let allProjects = [];

// ---- AUTH ----
function getToken() {
    const token = localStorage.getItem('crevio_token');
    if (!token) {
        window.location.href = '/admin/pages/login.html';
        return null;
    }
    return token;
}

// ---- API ----
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

// ---- GET SERVICE ID FROM URL ----
function getServiceIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') ? parseInt(params.get('id')) : null;
}

// ---- LOAD SERVICE (if editing) ----
async function loadService(id) {
    try {
        const res = await apiFetch(`/api/services/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load service');
        const service = data.service;
        serviceId = service.id;
        fillForm(service);
        document.getElementById('pageTitle').textContent = 'Edit Service';
    } catch (err) {
        console.error(err);
        showMessage('Unable to load service.', 'error');
    }
}

// ---- FILL FORM ----
function fillForm(service) {
    title.value = service.title || '';
    description.value = service.description || '';
    category.value = service.category || '';
    pricingType.value = service.pricing_type || 'fixed';
    price.value = service.price || '';
    currency.value = service.currency || 'USD';
    minPrice.value = service.min_price || '';
    maxPrice.value = service.max_price || '';
    deliveryTime.value = service.delivery_time || '';
    revisions.value = service.revisions || '';
    availability.checked = service.availability === 1;
    status.value = service.status || 'draft';
    featured.checked = service.featured === 1;
    showOnPortfolio.checked = service.show_on_portfolio !== 0;
    ctaType.value = service.cta_type || 'quote';
    ctaLabel.value = service.cta_label || '';
    ctaUrl.value = service.cta_url || '';

    if (service.included_items) {
        includedItems = service.included_items.map(i => i.item);
        renderIncludedItems();
    }
    if (service.faqs) {
        faqs = service.faqs.map(f => ({ question: f.question, answer: f.answer }));
        renderFaqs();
    }
    if (service.projects) {
        selectedProjects = service.projects.map(p => p.id);
    }

    // Force preview update after loading
    updatePreview();
    loadProjectsForSelector();
}

// ---- UPDATE PREVIEW (REAL DATA) ----
function updatePreview() {
    // Category
    previewCategory.textContent = category.value || 'Category';

    // Title
    previewTitle.textContent = title.value || 'Service Name';

    // Description
    previewDesc.textContent = description.value || 'Description goes here.';

    // Pricing
    const pType = pricingType.value;
    const curr = currency.value || 'USD';
    const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '₦';
    let priceText = '';
    if (pType === 'fixed' && price.value) {
        priceText = `${symbol}${parseInt(price.value).toLocaleString()}`;
    } else if (pType === 'starting_from' && price.value) {
        priceText = `Starting from ${symbol}${parseInt(price.value).toLocaleString()}`;
    } else if (pType === 'range' && minPrice.value && maxPrice.value) {
        priceText = `${symbol}${parseInt(minPrice.value).toLocaleString()} — ${symbol}${parseInt(maxPrice.value).toLocaleString()}`;
    } else if (pType === 'custom_quote') {
        priceText = 'Custom Quote';
    } else if (pType === 'contact') {
        priceText = 'Contact for pricing';
    }
    previewPrice.textContent = priceText || 'Pricing not set';

    // Included items
    let itemsHtml = '';
    if (includedItems.length) {
        includedItems.forEach(item => {
            itemsHtml += `<div class="item"><span class="check">✓</span> ${item}</div>`;
        });
    } else {
        itemsHtml = '<div class="item" style="color:var(--text-muted);">No items added yet.</div>';
    }
    previewItems.innerHTML = itemsHtml;

    // CTA button label
    const ctaLabelText = ctaLabel.value || getDefaultCtaLabel(ctaType.value);
    previewCtaBtn.textContent = ctaLabelText;
}

// ---- DEFAULT CTA LABEL ----
function getDefaultCtaLabel(type) {
    const map = {
        'quote': 'Request a Quote',
        'contact': 'Contact Me',
        'start': 'Start a Project',
        'book': 'Book a Consultation',
        'custom': 'Learn More'
    };
    return map[type] || 'Request a Quote';
}

// ---- RENDER INCLUDED ITEMS ----
function renderIncludedItems() {
    if (!includedItems.length) {
        itemsList.innerHTML = '<div style="color:var(--text-muted);font-size:14px;padding:6px 0;">No items added yet.</div>';
        return;
    }
    let html = '';
    includedItems.forEach((item, idx) => {
        html += `
            <div class="item-row">
                <span class="item-text">${item}</span>
                <button class="btn-icon" data-index="${idx}" title="Remove"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
            </div>
        `;
    });
    itemsList.innerHTML = html;
    itemsList.querySelectorAll('.btn-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            includedItems.splice(idx, 1);
            renderIncludedItems();
            updatePreview();
        });
    });
    refreshIcons();
}

// ---- ADD ITEM ----
addItemBtn.addEventListener('click', function() {
    const val = newItemInput.value.trim();
    if (!val) return;
    includedItems.push(val);
    newItemInput.value = '';
    renderIncludedItems();
    updatePreview();
});
newItemInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addItemBtn.click();
});

// ---- RENDER FAQS ----
function renderFaqs() {
    if (!faqs.length) {
        faqsList.innerHTML = '<div style="color:var(--text-muted);font-size:14px;padding:6px 0;">No FAQs added yet.</div>';
        return;
    }
    let html = '';
    faqs.forEach((faq, idx) => {
        html += `
            <div class="item-row">
                <span class="item-text"><strong>Q:</strong> ${faq.question}<br><span style="font-size:13px;color:var(--text-secondary);"><strong>A:</strong> ${faq.answer}</span></span>
                <button class="btn-icon" data-index="${idx}" title="Remove"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
            </div>
        `;
    });
    faqsList.innerHTML = html;
    faqsList.querySelectorAll('.btn-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            faqs.splice(idx, 1);
            renderFaqs();
        });
    });
    refreshIcons();
}

// ---- ADD FAQ ----
addFaqBtn.addEventListener('click', function() {
    const q = faqQuestion.value.trim();
    const a = faqAnswer.value.trim();
    if (!q || !a) return;
    faqs.push({ question: q, answer: a });
    faqQuestion.value = '';
    faqAnswer.value = '';
    renderFaqs();
});

// ---- LOAD PROJECTS FOR SELECTOR ----
async function loadProjectsForSelector() {
    try {
        const res = await apiFetch('/api/projects');
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load projects');
        allProjects = data.projects || [];
        renderProjectsSelector();
    } catch (err) {
        console.error(err);
        projectsSelector.innerHTML = '<div style="color:var(--danger);">Unable to load projects.</div>';
    }
}

// ---- RENDER PROJECTS SELECTOR ----
function renderProjectsSelector() {
    if (!allProjects.length) {
        projectsSelector.innerHTML = '<div style="color:var(--text-muted);">No projects found. <a href="/dashboard/pages/project-create.html" style="color:var(--accent);">Create a project first</a></div>';
        return;
    }
    let html = '';
    allProjects.forEach(proj => {
        const checked = selectedProjects.includes(proj.id) ? 'checked' : '';
        html += `
            <div class="checkbox-group" style="padding:4px 0;">
                <input type="checkbox" id="proj_${proj.id}" value="${proj.id}" ${checked}>
                <label for="proj_${proj.id}">${proj.name}</label>
            </div>
        `;
    });
    projectsSelector.innerHTML = html;
    projectsSelector.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.value);
            if (this.checked) {
                if (!selectedProjects.includes(id)) selectedProjects.push(id);
            } else {
                selectedProjects = selectedProjects.filter(p => p !== id);
            }
        });
    });
    refreshIcons();
}

// ---- SAVE SERVICE ----
async function saveService(statusToSet) {
    const data = {
        title: title.value.trim(),
        description: description.value.trim(),
        category: category.value,
        pricing_type: pricingType.value,
        price: price.value ? parseFloat(price.value) : null,
        currency: currency.value,
        min_price: minPrice.value ? parseFloat(minPrice.value) : null,
        max_price: maxPrice.value ? parseFloat(maxPrice.value) : null,
        delivery_time: deliveryTime.value.trim(),
        revisions: revisions.value ? parseInt(revisions.value) : null,
        availability: availability.checked ? 1 : 0,
        featured: featured.checked ? 1 : 0,
        show_on_portfolio: showOnPortfolio.checked ? 1 : 0,
        cta_type: ctaType.value,
        cta_label: ctaLabel.value.trim(),
        cta_url: ctaUrl.value.trim(),
        status: statusToSet
    };

    if (!data.title) { showMessage('Service name is required.', 'error'); return; }
    if (!data.description) { showMessage('Description is required.', 'error'); return; }

    try {
        const method = serviceId ? 'PUT' : 'POST';
        const endpoint = serviceId ? `/api/services/${serviceId}` : '/api/services';
        const res = await apiFetch(endpoint, { method, body: JSON.stringify(data) });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.message || 'Save failed.');
        serviceId = result.service.id;

        await Promise.all([
            apiFetch(`/api/services/${serviceId}/included-items`, {
                method: 'PUT', body: JSON.stringify({ items: includedItems })
            }),
            apiFetch(`/api/services/${serviceId}/faqs`, {
                method: 'PUT', body: JSON.stringify({ faqs })
            }),
            apiFetch(`/api/services/${serviceId}/projects`, {
                method: 'PUT', body: JSON.stringify({ projectIds: selectedProjects })
            })
        ]);

        showMessage(`Service ${statusToSet === 'published' ? 'published' : 'saved as draft'} successfully!`, 'success');
        if (!window.location.search.includes('id=')) {
            const url = new URL(window.location);
            url.searchParams.set('id', serviceId);
            window.history.replaceState({}, '', url);
        }
        setTimeout(() => loadService(serviceId), 800);
    } catch (err) {
        console.error(err);
        showMessage(err.message, 'error');
    }
}

// ---- EVENT LISTENERS FOR LIVE PREVIEW ----
title.addEventListener('input', updatePreview);
description.addEventListener('input', updatePreview);
category.addEventListener('input', updatePreview);
pricingType.addEventListener('change', function() {
    const showRange = this.value === 'range';
    document.getElementById('rangeFields').style.display = showRange ? 'grid' : 'none';
    updatePreview();
});
price.addEventListener('input', updatePreview);
minPrice.addEventListener('input', updatePreview);
maxPrice.addEventListener('input', updatePreview);
currency.addEventListener('change', updatePreview);
ctaType.addEventListener('change', function() {
    document.getElementById('customCtaGroup').style.display = this.value === 'custom' ? 'block' : 'none';
    updatePreview();
});
ctaLabel.addEventListener('input', updatePreview);

// ---- SAVE BUTTONS ----
saveDraftBtn.addEventListener('click', () => saveService('draft'));
publishBtn.addEventListener('click', () => saveService('published'));

// ---- HELPERS ----
function showMessage(text, type = 'success') {
    statusMsg.textContent = text;
    statusMsg.className = 'message ' + type;
    setTimeout(() => {
        statusMsg.className = 'message';
        statusMsg.textContent = '';
    }, 5000);
}

function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    const id = getServiceIdFromURL();
    if (id) {
        loadService(id);
    } else {
        document.getElementById('pageTitle').textContent = 'Create Service';
        loadProjectsForSelector();
        updatePreview();
        if (pricingType.value === 'range') {
            document.getElementById('rangeFields').style.display = 'grid';
        }
    }

    // Avatar
    const userData = localStorage.getItem('crevio_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const avatar = document.getElementById('userAvatar');
            const nameDisplay = document.getElementById('userNameDisplay');
            if (avatar && user.display_name) {
                // If profile image exists, use it
                if (user.profile_image) {
                    avatar.innerHTML = `<img src="${user.profile_image}" alt="Profile">`;
                } else {
                    avatar.textContent = user.display_name.charAt(0).toUpperCase();
                }
            }
            if (nameDisplay && user.display_name) {
                nameDisplay.textContent = user.display_name;
            }
        } catch (e) {}
    }
});