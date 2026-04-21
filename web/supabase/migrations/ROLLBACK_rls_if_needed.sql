-- ROLLBACK SCRIPT: Emergency RLS Disable
-- Use this file if RLS causes issues in production
--
-- OPTION 1: EMERGENCY DISABLE (keeps changes, just turns off RLS)
-- Run this first if you need immediate relief:

ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE answer_rejections DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_chemicals DISABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_tags DISABLE ROW LEVEL SECURITY;

-- This instantly restores pre-RLS behavior while keeping the role system.
-- The app will work exactly as before, using the old permission flags.

-- ========================================================================

-- OPTION 2: FULL ROLLBACK (removes all changes)
-- Only use this if you want to completely undo the role system:

-- Step 1: Drop all RLS policies (new production policies)
DROP POLICY IF EXISTS "sheets_select" ON sheets;
DROP POLICY IF EXISTS "sheets_insert" ON sheets;
DROP POLICY IF EXISTS "sheets_update" ON sheets;
DROP POLICY IF EXISTS "sheets_delete" ON sheets;

DROP POLICY IF EXISTS "answers_select" ON answers;
DROP POLICY IF EXISTS "answers_insert" ON answers;
DROP POLICY IF EXISTS "answers_update" ON answers;
DROP POLICY IF EXISTS "answers_delete" ON answers;

DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

DROP POLICY IF EXISTS "sheet_statuses_select" ON sheet_statuses;
DROP POLICY IF EXISTS "sheet_statuses_insert" ON sheet_statuses;

DROP POLICY IF EXISTS "answer_rejections_select" ON answer_rejections;
DROP POLICY IF EXISTS "answer_rejections_insert" ON answer_rejections;
DROP POLICY IF EXISTS "answer_rejections_update" ON answer_rejections;

DROP POLICY IF EXISTS "requests_select" ON requests;
DROP POLICY IF EXISTS "requests_insert" ON requests;
DROP POLICY IF EXISTS "requests_update" ON requests;

DROP POLICY IF EXISTS "sheet_chemicals_select" ON sheet_chemicals;
DROP POLICY IF EXISTS "chemical_inventory_select" ON chemical_inventory;

DROP POLICY IF EXISTS "sections_select_authenticated" ON sections;
DROP POLICY IF EXISTS "subsections_select_authenticated" ON subsections;
DROP POLICY IF EXISTS "questions_select_authenticated" ON questions;
DROP POLICY IF EXISTS "choices_select_authenticated" ON choices;
DROP POLICY IF EXISTS "tags_select_authenticated" ON tags;
DROP POLICY IF EXISTS "question_tags_select_authenticated" ON question_tags;
DROP POLICY IF EXISTS "sheet_tags_select_authenticated" ON sheet_tags;
DROP POLICY IF EXISTS "list_table_columns_select_authenticated" ON list_table_columns;
DROP POLICY IF EXISTS "list_table_rows_select_authenticated" ON list_table_rows;
DROP POLICY IF EXISTS "canonical_parameters_select_authenticated" ON canonical_parameters;
DROP POLICY IF EXISTS "canonical_parameter_tags_select_authenticated" ON canonical_parameter_tags;

-- Also drop old-style policies if they exist
DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can insert sheets" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;
DROP POLICY IF EXISTS "Only super admins can delete sheets" ON sheets;
DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Editors can insert answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Editors can update answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;
DROP POLICY IF EXISTS "Users can see visible companies" ON companies;
DROP POLICY IF EXISTS "Only admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Only admins can update companies" ON companies;
DROP POLICY IF EXISTS "Only super admins can delete companies" ON companies;
DROP POLICY IF EXISTS "Users can see users in visible companies" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Only super admins can delete users" ON users;

-- Step 2: Drop the association member profile view
DROP VIEW IF EXISTS public.association_member_profiles;

-- Step 3: Drop helper functions
DROP FUNCTION IF EXISTS auth.visible_company_ids();
DROP FUNCTION IF EXISTS auth.user_association_ids();
DROP FUNCTION IF EXISTS auth.is_super_admin();
DROP FUNCTION IF EXISTS auth.user_company_id();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.user_company_id();

-- Step 4: Disable RLS on ALL tables
ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE answer_rejections DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_chemicals DISABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_tags DISABLE ROW LEVEL SECURITY;

-- Step 5: Drop indexes
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_is_super_admin;

-- Step 6: Restore old permission columns (if renamed)
-- ALTER TABLE users RENAME COLUMN _deprecated_can_add_associations TO can_add_associations;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_add_companies TO can_add_companies;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_questions TO can_add_new_questions;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_sheet TO can_add_new_sheet;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_stack TO can_add_new_stack;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_user TO can_add_new_user;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_change_answers TO can_change_answers;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_change_sheet_status TO can_change_sheet_status;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_change_status TO can_change_status;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_run_reports TO can_run_reports;
-- ALTER TABLE users RENAME COLUMN _deprecated_can_see_all_sheets TO can_see_all_sheets;

-- Step 7: Remove new columns
-- ALTER TABLE users DROP COLUMN IF EXISTS role;
-- ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin;

-- Step 8: Drop the enum type
-- DROP TYPE IF EXISTS user_role;

-- ========================================================================

-- VERIFICATION QUERIES (run after rollback to verify):

-- Check that RLS is disabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('sheets', 'answers', 'companies', 'users', 'sheet_statuses',
--     'answer_rejections', 'requests', 'sheet_chemicals', 'chemical_inventory',
--     'tags', 'question_tags', 'sheet_tags');
-- All should show rowsecurity = false
