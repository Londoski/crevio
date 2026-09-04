-- Extend project_media table
ALTER TABLE project_media ADD COLUMN user_id INTEGER;
ALTER TABLE project_media ADD COLUMN title TEXT;
ALTER TABLE project_media ADD COLUMN description TEXT;
ALTER TABLE project_media ADD COLUMN caption TEXT;
ALTER TABLE project_media ADD COLUMN category TEXT;
ALTER TABLE project_media ADD COLUMN tags TEXT;
ALTER TABLE project_media ADD COLUMN thumbnail_url TEXT;
ALTER TABLE project_media ADD COLUMN file_size INTEGER;
ALTER TABLE project_media ADD COLUMN duration INTEGER;
ALTER TABLE project_media ADD COLUMN width INTEGER;
ALTER TABLE project_media ADD COLUMN height INTEGER;
ALTER TABLE project_media ADD COLUMN is_private BOOLEAN DEFAULT 1;
ALTER TABLE project_media ADD COLUMN updated_at DATETIME;

-- Populate user_id from projects for existing records
UPDATE project_media
SET user_id = (SELECT user_id FROM projects WHERE projects.id = project_media.project_id)
WHERE project_id IS NOT NULL;