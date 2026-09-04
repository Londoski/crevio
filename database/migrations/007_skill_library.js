// =========================================================
// CREVIO — MIGRATION 007: Skill Library (FIXED)
// =========================================================

const db = require("../db");

// ---- Helper to check if a table exists ----
function tableExists(tableName) {
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    return !!result;
}

// ---- Helper to check if a column exists ----
function columnExists(table, column) {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
    return columns.some(c => c.name === column);
}

// ---- Helper to add column if missing ----
function addColumnIfMissing(table, column, definition) {
    if (!columnExists(table, column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
    }
}

// ---- Transaction ----
const migrate = db.transaction(() => {

    console.log("📦 Starting migration 007...");

    // =========================================================
    // 1. Create skill_categories
    // =========================================================
    if (!tableExists('skill_categories')) {
        db.exec(`
            CREATE TABLE skill_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                icon TEXT,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Created skill_categories table");
    } else {
        console.log("ℹ️ skill_categories table already exists");
    }

    // =========================================================
    // 2. Create skills table (global + custom)
    // =========================================================
    if (!tableExists('skills')) {
        db.exec(`
            CREATE TABLE skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                is_global INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES skill_categories(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Created skills table");
    } else {
        console.log("ℹ️ skills table already exists");
    }

    // =========================================================
    // 3. Create creator_skills (junction)
    // =========================================================
    if (!tableExists('creator_skills')) {
        db.exec(`
            CREATE TABLE creator_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                skill_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
                UNIQUE(user_id, skill_id)
            )
        `);
        console.log("✅ Created creator_skills table");
    } else {
        console.log("ℹ️ creator_skills table already exists");
    }

    // =========================================================
    // 4. Add profession columns to users (if missing)
    // =========================================================
    if (tableExists('users')) {
        addColumnIfMissing('users', 'primary_profession', 'TEXT');
        addColumnIfMissing('users', 'specialties', 'TEXT');
    }

    // =========================================================
    // 5. Seed Categories
    // =========================================================
    const categories = [
        { name: 'Video & Film', slug: 'video-film', icon: '🎥', order: 1 },
        { name: 'Photography', slug: 'photography', icon: '📷', order: 2 },
        { name: 'Graphic Design', slug: 'graphic-design', icon: '✦', order: 3 },
        { name: 'UI/UX & Product Design', slug: 'ui-ux-product', icon: '◇', order: 4 },
        { name: 'Web & Software Development', slug: 'web-dev', icon: '⚡', order: 5 },
        { name: 'Motion & Animation', slug: 'motion-animation', icon: '🎬', order: 6 },
        { name: 'Branding', slug: 'branding', icon: '🏷️', order: 7 },
        { name: 'Marketing & Social Media', slug: 'marketing-social', icon: '📱', order: 8 },
        { name: 'Writing & Content', slug: 'writing-content', icon: '✍️', order: 9 },
        { name: 'Audio & Sound', slug: 'audio-sound', icon: '🎧', order: 10 },
        { name: '3D & VFX', slug: '3d-vfx', icon: '🌀', order: 11 },
        { name: 'Business & Professional', slug: 'business-pro', icon: '💼', order: 12 },
        { name: 'Other', slug: 'other', icon: '➕', order: 13 }
    ];

    const catInsert = db.prepare(`
        INSERT OR IGNORE INTO skill_categories (name, slug, icon, display_order)
        VALUES (?, ?, ?, ?)
    `);
    categories.forEach(c => {
        catInsert.run(c.name, c.slug, c.icon, c.order);
    });
    console.log(`✅ Seeded ${categories.length} categories`);

    // =========================================================
    // 6. Get category IDs
    // =========================================================
    const categoryMap = {};
    const cats = db.prepare(`SELECT id, slug FROM skill_categories`).all();
    cats.forEach(c => categoryMap[c.slug] = c.id);

    // =========================================================
    // 7. Seed Global Skills (from spec)
    // =========================================================
    const skillLibrary = {
        'video-film': [
            'Videography','Cinematography','Video Editing','Film Editing',
            'Documentary Filmmaking','Commercial Filmmaking','Narrative Filmmaking',
            'Directing','Assistant Directing','Camera Operation','Camera Assistant',
            'Director of Photography','Film Production','Video Production',
            'Storytelling','Visual Storytelling','Shot Composition','Framing',
            'Shot Planning','Storyboarding','Visual Direction','Lighting',
            'Studio Lighting','Natural Lighting','Location Lighting',
            'Color Grading','Color Correction','Post Production',
            'Video Compositing','Green Screen','Chroma Key','Motion Tracking',
            'Stabilization','Drone Videography','Event Videography','Wedding Videography',
            'Corporate Videography','Music Video Production','Product Video',
            'Social Media Video','Short-form Video','Long-form Video',
            'Showreel Creation','Production Planning','Scriptwriting','Creative Direction'
        ],
        'photography': [
            'Photography','Portrait Photography','Event Photography',
            'Wedding Photography','Fashion Photography','Product Photography',
            'Commercial Photography','Editorial Photography','Documentary Photography',
            'Lifestyle Photography','Street Photography','Travel Photography',
            'Food Photography','Architecture Photography','Real Estate Photography',
            'Sports Photography','Studio Photography','Landscape Photography',
            'Event Coverage','Photo Retouching','Photo Editing','Color Correction',
            'Color Grading','Lighting','Studio Lighting','Natural Light Photography',
            'Photo Composition','Art Direction','Image Curation'
        ],
        'graphic-design': [
            'Graphic Design','Logo Design','Poster Design','Flyer Design',
            'Brochure Design','Packaging Design','Editorial Design','Print Design',
            'Digital Design','Social Media Design','Advertising Design',
            'Infographic Design','Presentation Design','Typography','Layout Design',
            'Illustration','Icon Design','Visual Communication','Art Direction',
            'Print Production','Photo Editing','Image Manipulation','Creative Direction'
        ],
        'ui-ux-product': [
            'UI Design','UX Design','Product Design','UX Research','User Research',
            'User Testing','Information Architecture','User Flows','Wireframing',
            'Prototyping','Interaction Design','Design Systems','Responsive Design',
            'Mobile App Design','Web Design','Dashboard Design','SaaS Design',
            'Accessibility Design','Usability Testing','Visual Design','Design Strategy'
        ],
        'web-dev': [
            'Web Development','Frontend Development','Backend Development',
            'Full-Stack Development','Mobile Development','Software Development',
            'API Development','Database Design','System Architecture','DevOps',
            'Cloud Development','Automation','Testing','Debugging','Git / Version Control',
            'HTML','CSS','JavaScript','TypeScript','React','Vue','Angular',
            'Node.js','Express.js','Python','Django','Flask','PHP','Laravel',
            'Java','C#','C++','SQL','PostgreSQL','MySQL','MongoDB','REST API','GraphQL'
        ],
        'motion-animation': [
            'Motion Design','Motion Graphics','2D Animation','3D Animation',
            'Character Animation','Logo Animation','Kinetic Typography',
            'Explainer Animation','Visual Effects','Compositing','Rotoscoping',
            'Motion Tracking','Rigging','Storyboarding','Animation Direction',
            'Title Design','Broadcast Graphics'
        ],
        'branding': [
            'Brand Strategy','Brand Identity','Visual Identity','Logo Design',
            'Brand Guidelines','Art Direction','Creative Direction','Naming',
            'Brand Positioning','Brand Storytelling','Brand Communication',
            'Packaging','Campaign Design','Brand Consulting'
        ],
        'marketing-social': [
            'Digital Marketing','Social Media Marketing','Social Media Management',
            'Content Strategy','Content Marketing','Campaign Strategy',
            'Brand Marketing','Influencer Marketing','Email Marketing',
            'Search Engine Optimization','Search Engine Marketing','Paid Advertising',
            'Community Management','Analytics','Marketing Strategy','Growth Strategy',
            'Copywriting','Creative Strategy'
        ],
        'writing-content': [
            'Copywriting','Content Writing','Scriptwriting','Screenwriting',
            'Storytelling','Creative Writing','Technical Writing','Blog Writing',
            'Article Writing','Editing','Proofreading','Ghostwriting','Brand Writing',
            'UX Writing','Research','Editorial Planning'
        ],
        'audio-sound': [
            'Sound Design','Audio Editing','Mixing','Mastering','Music Production',
            'Beat Production','Voice Recording','Voice Over','Podcast Production',
            'Foley','Audio Restoration','Sound Recording','Live Sound','Film Sound',
            'Music Composition'
        ],
        '3d-vfx': [
            '3D Modeling','3D Animation','3D Rendering','Texturing','Lighting',
            'Rigging','Character Design','Environment Design','Visual Effects',
            'Compositing','Simulation','Product Visualization',
            'Architectural Visualization','Motion Tracking','CGI'
        ],
        'business-pro': [
            'Project Management','Creative Management','Consulting','Strategy',
            'Research','Presentation','Leadership','Communication','Client Management',
            'Team Management','Business Development','Sales','Negotiation',
            'Problem Solving','Planning'
        ],
        'other': [] // empty for custom skills
    };

    const skillInsert = db.prepare(`
        INSERT OR IGNORE INTO skills (category_id, name, is_global, created_at)
        VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    `);

    let totalSkills = 0;
    for (const [slug, names] of Object.entries(skillLibrary)) {
        const catId = categoryMap[slug];
        if (!catId) continue;
        names.forEach(name => {
            skillInsert.run(catId, name);
            totalSkills++;
        });
    }
    console.log(`✅ Seeded ${totalSkills} global skills`);

    // =========================================================
    // 8. Migrate existing skills from old 'skills' table
    // =========================================================
    const oldSkillsExist = tableExists('skills_old') || tableExists('skills');
    if (oldSkillsExist) {
        // Check if old table has user_id and name
        let oldTableName = tableExists('skills_old') ? 'skills_old' : 'skills';
        const oldColumns = db.prepare(`PRAGMA table_info("${oldTableName}")`).all();
        const hasUserId = oldColumns.some(c => c.name === 'user_id');
        const hasName = oldColumns.some(c => c.name === 'name');

        if (hasUserId && hasName) {
            console.log(`📦 Migrating old skills from ${oldTableName}...`);
            const oldSkills = db.prepare(`SELECT id, user_id, name FROM "${oldTableName}"`).all();
            const otherCatId = categoryMap['other'];

            let migrated = 0;
            const insertCreatorSkill = db.prepare(`
                INSERT OR IGNORE INTO creator_skills (user_id, skill_id, created_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);
            const getSkillId = db.prepare(`SELECT id FROM skills WHERE name = ? AND is_global = 1`);
            const insertCustomSkill = db.prepare(`
                INSERT OR IGNORE INTO skills (category_id, name, is_global, created_by, created_at)
                VALUES (?, ?, 0, ?, CURRENT_TIMESTAMP)
            `);

            oldSkills.forEach(row => {
                let skillId = null;
                const global = getSkillId.get(row.name);
                if (global) {
                    skillId = global.id;
                } else {
                    // Create as custom skill
                    const result = insertCustomSkill.run(otherCatId, row.name, row.user_id);
                    skillId = result.lastInsertRowid;
                }
                if (skillId) {
                    insertCreatorSkill.run(row.user_id, skillId);
                    migrated++;
                }
            });
            console.log(`✅ Migrated ${migrated} old skills to new structure`);

            // Drop old table after migration
            if (oldTableName !== 'skills') {
                db.exec(`DROP TABLE "${oldTableName}"`);
                console.log(`🗑️ Dropped old table ${oldTableName}`);
            }
        } else {
            console.log(`ℹ️ Old skills table exists but missing required columns (user_id, name). Skipping migration.`);
        }
    } else {
        console.log("ℹ️ No old skills table found to migrate.");
    }

    console.log("✅ Migration 007 completed successfully.");
});

try {
    migrate();
} catch (error) {
    console.error("❌ Migration 007 failed:", error);
    process.exitCode = 1;
} finally {
    db.close();
}