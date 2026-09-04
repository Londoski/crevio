-- =========================================================
-- SKILLS TABLES
-- =========================================================

-- 1. Skill categories
CREATE TABLE IF NOT EXISTS skill_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0
);

-- 2. Skills
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_global BOOLEAN DEFAULT 1,
    created_by INTEGER,
    FOREIGN KEY (category_id) REFERENCES skill_categories(id) ON DELETE CASCADE
);

-- 3. Creator skills (junction table)
CREATE TABLE IF NOT EXISTS creator_skills (
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- =========================================================
-- INSERT DEFAULT CATEGORIES
-- =========================================================
INSERT OR IGNORE INTO skill_categories (name, slug, icon, display_order) VALUES
('Design', 'design', 'palette', 1),
('Development', 'development', 'code', 2),
('Photography', 'photography', 'camera', 3),
('Video', 'video', 'video', 4),
('Marketing', 'marketing', 'trending-up', 5),
('Writing', 'writing', 'pen-tool', 6),
('Business', 'business', 'briefcase', 7),
('Other', 'other', 'more-horizontal', 99);

-- =========================================================
-- INSERT SOME SAMPLE GLOBAL SKILLS (optional – you can add more)
-- =========================================================
INSERT OR IGNORE INTO skills (category_id, name, is_global) VALUES
-- Design
((SELECT id FROM skill_categories WHERE slug = 'design'), 'Graphic Design', 1),
((SELECT id FROM skill_categories WHERE slug = 'design'), 'UI/UX Design', 1),
((SELECT id FROM skill_categories WHERE slug = 'design'), 'Illustration', 1),
((SELECT id FROM skill_categories WHERE slug = 'design'), 'Logo Design', 1),
((SELECT id FROM skill_categories WHERE slug = 'design'), 'Branding', 1),
-- Photography
((SELECT id FROM skill_categories WHERE slug = 'photography'), 'Commercial Photography', 1),
((SELECT id FROM skill_categories WHERE slug = 'photography'), 'Portrait Photography', 1),
((SELECT id FROM skill_categories WHERE slug = 'photography'), 'Real Estate Photography', 1),
((SELECT id FROM skill_categories WHERE slug = 'photography'), 'Product Photography', 1),
-- Video
((SELECT id FROM skill_categories WHERE slug = 'video'), 'Video Production', 1),
((SELECT id FROM skill_categories WHERE slug = 'video'), 'Cinematography', 1),
((SELECT id FROM skill_categories WHERE slug = 'video'), 'Color Grading', 1),
((SELECT id FROM skill_categories WHERE slug = 'video'), 'Motion Graphics', 1),
-- Development
((SELECT id FROM skill_categories WHERE slug = 'development'), 'Frontend Development', 1),
((SELECT id FROM skill_categories WHERE slug = 'development'), 'Backend Development', 1),
((SELECT id FROM skill_categories WHERE slug = 'development'), 'JavaScript', 1),
((SELECT id FROM skill_categories WHERE slug = 'development'), 'React', 1);