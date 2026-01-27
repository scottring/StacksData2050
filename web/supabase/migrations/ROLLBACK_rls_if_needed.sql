-- ROLLBACK SCRIPT: Emergency RLS Disable
-- Use this file if RLS causes issues in production
--
-- OPTION 1: EMERGENCY DISABLE (keeps changes, just turns off RLS)
-- Run this first if you need immediate relief:

ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- This instantly restores pre-RLS behavior while keeping the role system.
-- The app will work exactly as before, using the old permission flags.

-- ========================================================================

-- OPTION 2: FULL ROLLBACK (removes all changes)
-- Only use this if you want to completely undo the role system:

-- Step 1: Drop all RLS policies
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

-- Step 4: Disable RLS
ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 5: Drop indexes
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_is_super_admin;

-- Step 6: Restore old permission columns
ALTER TABLE users RENAME COLUMN _deprecated_can_add_associations TO can_add_associations;
ALTER TABLE users RENAME COLUMN _deprecated_can_add_companies TO can_add_companies;
ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_questions TO can_add_new_questions;
ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_sheet TO can_add_new_sheet;
ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_stack TO can_add_new_stack;
ALTER TABLE users RENAME COLUMN _deprecated_can_add_new_user TO can_add_new_user;
ALTER TABLE users RENAME COLUMN _deprecated_can_change_answers TO can_change_answers;
ALTER TABLE users RENAME COLUMN _deprecated_can_change_sheet_status TO can_change_sheet_status;
ALTER TABLE users RENAME COLUMN _deprecated_can_change_status TO can_change_status;
ALTER TABLE users RENAME COLUMN _deprecated_can_run_reports TO can_run_reports;
ALTER TABLE users RENAME COLUMN _deprecated_can_see_all_sheets TO can_see_all_sheets;

-- Step 7: Remove new columns
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS is_super_admin;

-- Step 8: Drop the enum type
DROP TYPE IF EXISTS user_role;

-- ========================================================================

-- VERIFICATION QUERIES (run after rollback to verify):

-- Check that RLS is disabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sheets', 'answers', 'companies', 'users');
-- All should show rowsecurity = false

-- Check that old permission columns are back:
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name LIKE 'can_%';
-- Should see all 11 can_* columns

-- Check that new columns are gone:
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('role', 'is_super_admin');
-- Should return 0 rows
