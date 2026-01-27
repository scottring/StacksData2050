-- Phase 1: Add Role System (Non-Breaking)
-- This migration adds the new role-based permission system while preserving
-- the existing 11 boolean permission flags for backward compatibility.

-- Step 1: Create user_role enum type
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer', 'reviewer');

-- Step 2: Add role column to users table (nullable initially for safe migration)
ALTER TABLE users ADD COLUMN role user_role;

-- Step 3: Add super_admin flag
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;

-- Step 4: Map existing permissions to roles

-- Identify super admins (users who can see all sheets + all permissions)
UPDATE users
SET is_super_admin = true
WHERE can_see_all_sheets = true
  AND can_add_associations = true
  AND can_add_companies = true
  AND can_add_new_questions = true
  AND can_add_new_stack = true;

-- Assign admin role (can see all + add users)
UPDATE users
SET role = 'admin'
WHERE can_see_all_sheets = true
  AND can_add_new_user = true;

-- Assign editor role (can change answers/status but not add users)
-- Only set if role is still NULL (don't override admins)
UPDATE users
SET role = 'editor'
WHERE role IS NULL
  AND (
    can_change_answers = true
    OR can_change_sheet_status = true
    OR can_add_new_sheet = true
  );

-- Assign reviewer role (can change status but not answers)
-- Only set if role is still NULL
UPDATE users
SET role = 'reviewer'
WHERE role IS NULL
  AND can_change_status = true
  AND can_change_answers = false;

-- Default everyone else to viewer
UPDATE users
SET role = 'viewer'
WHERE role IS NULL;

-- Step 5: Make role NOT NULL now that all users have a role
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Step 6: Create helper functions for RLS (will be used in Phase 2)

-- Get user's company ID
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS uuid AS $$
  SELECT company_id
  FROM public.users
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(is_super_admin, false)
  FROM public.users
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 7: Rename old permission columns to deprecated (keep for rollback safety)
ALTER TABLE users RENAME COLUMN can_add_associations TO _deprecated_can_add_associations;
ALTER TABLE users RENAME COLUMN can_add_companies TO _deprecated_can_add_companies;
ALTER TABLE users RENAME COLUMN can_add_new_questions TO _deprecated_can_add_new_questions;
ALTER TABLE users RENAME COLUMN can_add_new_sheet TO _deprecated_can_add_new_sheet;
ALTER TABLE users RENAME COLUMN can_add_new_stack TO _deprecated_can_add_new_stack;
ALTER TABLE users RENAME COLUMN can_add_new_user TO _deprecated_can_add_new_user;
ALTER TABLE users RENAME COLUMN can_change_answers TO _deprecated_can_change_answers;
ALTER TABLE users RENAME COLUMN can_change_sheet_status TO _deprecated_can_change_sheet_status;
ALTER TABLE users RENAME COLUMN can_change_status TO _deprecated_can_change_status;
ALTER TABLE users RENAME COLUMN can_run_reports TO _deprecated_can_run_reports;
ALTER TABLE users RENAME COLUMN can_see_all_sheets TO _deprecated_can_see_all_sheets;

-- Add index on role for faster permission checks
CREATE INDEX idx_users_role ON users(role);

-- Add index on is_super_admin for faster super admin checks
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- Add helpful comment explaining the role system
COMMENT ON COLUMN users.role IS 'User role: admin (full control), editor (create/edit sheets), reviewer (approve/reject), viewer (read-only)';
COMMENT ON COLUMN users.is_super_admin IS 'Platform owner flag - bypasses all RLS restrictions';
