-- Temporarily disable RLS on tag tables for demo
-- This allows the frontend to read tags without authentication issues
-- Re-enable after demo with: ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_tags DISABLE ROW LEVEL SECURITY;

-- Add comment explaining this is temporary
COMMENT ON TABLE tags IS 'RLS temporarily disabled for demo - re-enable before production';
COMMENT ON TABLE question_tags IS 'RLS temporarily disabled for demo - re-enable before production';
COMMENT ON TABLE sheet_tags IS 'RLS temporarily disabled for demo - re-enable before production';
