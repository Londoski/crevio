// =========================================================
// CREVIO — SKILLS JS (All skills, searchable, scrollable)
// =========================================================

// ---- DOM refs ----
const selectedContainer = document.getElementById('selectedSkillsContainer');
const recommendedContainer = document.getElementById('recommendedContainer');
const categoryGrid = document.getElementById('categoryGrid');
const modal = document.getElementById('skillModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveModalBtn = document.getElementById('saveModalBtn');
const addSkillBtn = document.getElementById('addSkillBtn');
const skillSearch = document.getElementById('skillSearch');
const skillListContainer = document.getElementById('skillListContainer');
const categoryFilter = document.getElementById('categoryFilter');
const selectedCount = document.getElementById('selectedCount');
const customSkillArea = document.getElementById('customSkillArea');
const showCustomSkillBtn = document.getElementById('showCustomSkillBtn');
const customSkillForm = document.getElementById('customSkillForm');
const customSkillName = document.getElementById('customSkillName');
const saveCustomSkillBtn = document.getElementById('saveCustomSkillBtn');
const cancelCustomSkillBtn = document.getElementById('cancelCustomSkillBtn');

let allSkills = [];
let selectedSkillIds = new Set();
let currentFilterCategory = 'all';
let allCategories = [];

// ---- AUTH ----
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
    await loadSelectedSkills();
    await loadRecommended();
    await loadCategories();
    await loadAllSkills();
}

// ---- LOAD SELECTED SKILLS ----
async function loadSelectedSkills() {
    try {
        const res = await apiFetch('/api/skills/selected');
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load selected skills');
        renderSelectedSkills(data.skills);
        selectedSkillIds = new Set(data.skills.map(s => s.id));
    } catch (err) {
        console.error(err);
        selectedContainer.innerHTML = '<div class="empty-state">Unable to load your skills.</div>';
    }
}

function renderSelectedSkills(skills) {
    if (!skills || skills.length === 0) {
        selectedContainer.innerHTML = `
            <div class="empty-skills">You haven't added any skills yet.</div>
            <button class="primary-button" id="addSkillFromEmpty" style="margin-top:8px;">
                <i data-lucide="plus" class="icon"></i> Add Skill
            </button>
        `;
        document.getElementById('addSkillFromEmpty')?.addEventListener('click', () => openModal());
        return;
    }
    let html = `<div class="skills-chips">`;
    skills.forEach(s => {
        html += `
            <span class="skill-chip" data-id="${s.id}">
                ${s.name}
                <button class="remove" data-id="${s.id}" title="Remove skill">×</button>
            </span>
        `;
    });
    html += `</div>`;
    selectedContainer.innerHTML = html;
    selectedContainer.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            await removeSkill(id);
        });
    });
    refreshIcons();
}

// ---- REMOVE SKILL ----
async function removeSkill(skillId) {
    try {
        const res = await apiFetch(`/api/skills/selected/${skillId}`, { method: 'DELETE' });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to remove skill');
        await loadSelectedSkills();
        if (modal.classList.contains('open')) {
            selectedSkillIds.delete(skillId);
            updateModalSelectedCount();
            highlightSelectedSkills();
        }
    } catch (err) {
        console.error(err);
        alert('❌ ' + err.message);
    }
}

// ---- LOAD RECOMMENDED ----
async function loadRecommended() {
    try {
        const res = await apiFetch('/api/skills/recommended');
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load recommendations');
        renderRecommended(data.skills);
    } catch (err) {
        console.error(err);
        recommendedContainer.innerHTML = '<div class="empty-state">Unable to load recommendations.</div>';
    }
}

function renderRecommended(skills) {
    if (!skills || skills.length === 0) {
        recommendedContainer.innerHTML = '<div class="empty-state">No recommendations available.</div>';
        return;
    }
    let html = `<div class="recommended-chips">`;
    skills.forEach(s => {
        const isSelected = selectedSkillIds.has(s.id);
        html += `
            <span class="recommend-chip ${isSelected ? 'selected' : ''}" data-id="${s.id}" style="${isSelected ? 'border-color:var(--accent);color:var(--accent);' : ''}">
                ${s.name}
            </span>
        `;
    });
    html += `</div>`;
    recommendedContainer.innerHTML = html;
    recommendedContainer.querySelectorAll('.recommend-chip').forEach(chip => {
        chip.addEventListener('click', async function() {
            const id = parseInt(this.dataset.id);
            if (selectedSkillIds.has(id)) {
                await removeSkill(id);
            } else {
                const newIds = [...selectedSkillIds, id];
                await saveSelectedSkills(newIds);
                await loadSelectedSkills();
                await loadRecommended();
            }
        });
    });
    refreshIcons();
}

// ---- LOAD CATEGORIES ----
async function loadCategories() {
    try {
        const res = await apiFetch('/api/skills/categories');
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load categories');
        allCategories = data.categories;
        renderCategories(allCategories);
    } catch (err) {
        console.error(err);
        categoryGrid.innerHTML = '<div class="empty-state">Unable to load categories.</div>';
    }
}

function renderCategories(categories) {
    if (!categories || categories.length === 0) {
        categoryGrid.innerHTML = '<div class="empty-state">No categories available.</div>';
        return;
    }
    let html = '';
    categories.forEach(cat => {
        const selectedCount = cat.user_selected_count || 0;
        html += `
            <div class="category-card" data-id="${cat.id}" data-slug="${cat.slug}">
                <div class="cat-header">
                    <span class="cat-icon">${cat.icon || '📂'}</span>
                    <span class="arrow">→</span>
                </div>
                <div class="cat-name">${cat.name}</div>
                <div class="cat-meta">
                    <span class="count">${cat.skill_count || 0} skills</span>
                    ${selectedCount > 0 ? `<span class="selected-badge">${selectedCount} selected</span>` : ''}
                </div>
            </div>
        `;
    });
    categoryGrid.innerHTML = html;
    categoryGrid.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const name = this.querySelector('.cat-name').textContent;
            openModalWithFilter(id, name);
        });
    });
    refreshIcons();
}

// ---- LOAD ALL SKILLS (for modal) ----
async function loadAllSkills() {
    try {
        const res = await apiFetch('/api/skills/all');
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load skills');
        allSkills = data.skills || [];
        // If no skills, show a message
        if (allSkills.length === 0) {
            skillListContainer.innerHTML = '<div class="empty-state">No skills found. Try adding a custom skill.</div>';
            return;
        }
        buildCategoryFilters();
        if (modal.classList.contains('open')) {
            renderSkillList();
        }
    } catch (err) {
        console.error('Load all skills error:', err);
        skillListContainer.innerHTML = '<div class="empty-state">Unable to load skills. Please refresh.</div>';
    }
}

// ---- BUILD CATEGORY FILTER PILLS ----
function buildCategoryFilters() {
    const cats = new Set();
    allSkills.forEach(s => {
        if (s.category_name) cats.add(s.category_name);
    });
    let html = `<button class="filter-btn active" data-category="all">All</button>`;
    cats.forEach(cat => {
        html += `<button class="filter-btn" data-category="${cat}">${cat}</button>`;
    });
    categoryFilter.innerHTML = html;
    categoryFilter.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            categoryFilter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilterCategory = this.dataset.category;
            renderSkillList();
        });
    });
}

// ---- RENDER SKILL LIST IN MODAL ----
function renderSkillList() {
    const query = skillSearch.value.trim().toLowerCase();
    let filtered = allSkills;
    if (currentFilterCategory !== 'all') {
        filtered = filtered.filter(s => s.category_name === currentFilterCategory);
    }
    if (query.length > 0) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(query));
    }

    if (filtered.length === 0) {
        skillListContainer.innerHTML = '<div class="empty-state">No skills found.</div>';
        customSkillArea.style.display = 'none';
        return;
    }

    if (currentFilterCategory === 'Other') {
        customSkillArea.style.display = 'block';
    } else {
        customSkillArea.style.display = 'none';
    }

    let html = '';
    filtered.forEach(s => {
        const checked = selectedSkillIds.has(s.id) ? 'checked' : '';
        html += `
            <label class="skill-item ${checked ? 'selected' : ''}" data-id="${s.id}">
                <input type="checkbox" ${checked} value="${s.id}">
                <span class="skill-name">${s.name}</span>
                <span class="skill-category">${s.category_name || ''}</span>
            </label>
        `;
    });
    skillListContainer.innerHTML = html;

    skillListContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = parseInt(this.value);
            if (this.checked) {
                selectedSkillIds.add(id);
                this.closest('.skill-item').classList.add('selected');
            } else {
                selectedSkillIds.delete(id);
                this.closest('.skill-item').classList.remove('selected');
            }
            updateModalSelectedCount();
        });
    });
    highlightSelectedSkills();
    refreshIcons();
}

function highlightSelectedSkills() {
    skillListContainer.querySelectorAll('.skill-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        const cb = item.querySelector('input[type="checkbox"]');
        if (cb) {
            const checked = selectedSkillIds.has(id);
            cb.checked = checked;
            item.classList.toggle('selected', checked);
        }
    });
    updateModalSelectedCount();
}

function updateModalSelectedCount() {
    selectedCount.textContent = `${selectedSkillIds.size} skills selected`;
}

// ---- MODAL OPEN / CLOSE ----
function openModalWithFilter(categoryId, categoryName) {
    currentFilterCategory = categoryName;
    categoryFilter.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === categoryName);
    });
    openModal();
}

function openModal() {
    modal.classList.add('open');
    skillSearch.value = '';
    renderSkillList();
    updateModalSelectedCount();
    if (currentFilterCategory === 'Other') {
        customSkillArea.style.display = 'block';
    } else {
        customSkillArea.style.display = 'none';
    }
    customSkillForm.style.display = 'none';
    customSkillName.value = '';
}

function closeModal() {
    modal.classList.remove('open');
    currentFilterCategory = 'all';
    categoryFilter.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    customSkillArea.style.display = 'none';
    customSkillForm.style.display = 'none';
}

// ---- SAVE SELECTED SKILLS ----
async function saveSelectedSkills(skillIds) {
    try {
        const res = await apiFetch('/api/skills/selected', {
            method: 'POST',
            body: JSON.stringify({ skillIds })
        });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to save skills');
        return data.skills;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// ---- MODAL EVENT LISTENERS ----
addSkillBtn.addEventListener('click', function() {
    currentFilterCategory = 'all';
    categoryFilter.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    openModal();
});

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

saveModalBtn.addEventListener('click', async function() {
    try {
        const skillIds = Array.from(selectedSkillIds);
        await saveSelectedSkills(skillIds);
        await loadSelectedSkills();
        await loadRecommended();
        await loadCategories();
        closeModal();
    } catch (err) {
        alert('❌ ' + err.message);
    }
});

// ---- SEARCH ----
skillSearch.addEventListener('input', function() {
    renderSkillList();
});

// ---- CUSTOM SKILL ----
showCustomSkillBtn.addEventListener('click', function() {
    customSkillForm.style.display = 'block';
    customSkillName.focus();
});

cancelCustomSkillBtn.addEventListener('click', function() {
    customSkillForm.style.display = 'none';
    customSkillName.value = '';
});

saveCustomSkillBtn.addEventListener('click', async function() {
    const name = customSkillName.value.trim();
    if (!name || name.length < 2) {
        alert('Please enter a valid skill name.');
        return;
    }
    try {
        const res = await apiFetch('/api/skills/custom', {
            method: 'POST',
            body: JSON.stringify({ name, categoryId: null })
        });
        if (!res) return;
        const data = await res.json();
        if (!data.success) throw new Error('Failed to add custom skill');
        const newSkill = data.skill;
        selectedSkillIds.add(newSkill.id);
        await loadSelectedSkills();
        await loadAllSkills();
        customSkillForm.style.display = 'none';
        customSkillName.value = '';
        renderSkillList();
        updateModalSelectedCount();
    } catch (err) {
        alert('❌ ' + err.message);
    }
});

// ---- HELPERS ----
function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
    loadAll();
});