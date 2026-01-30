-- ============================================
-- FIX RLS FOR TRIAL - January 30, 2026
-- This migration ensures RLS is properly working
-- ============================================

-- Step 1: Add is_super_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_super_admin column';
  ELSE
    RAISE NOTICE 'is_super_admin column already exists';
  END IF;
END $$;

-- Step 2: Set up super admin user (Scott)
UPDATE users
SET is_super_admin = true
WHERE email IN ('scott@stacksdata.com', 'scott.kaufman@stacksdata.com')
   OR email LIKE '%@stacksdata.com';

-- Step 3: Fix demo user roles
-- UPM (Kaisa) - Customer admin
UPDATE users SET role = 'admin' WHERE email = 'kaisa.herranen@upm.com';

-- Sappi (Christian) - Customer admin
UPDATE users SET role = 'admin' WHERE email = 'christian.torborg@sappi.com';

-- Kemira (Tiia) - Supplier editor
UPDATE users SET role = 'editor' WHERE email = 'tiia.aho@kemira.com';

-- Omya (Abdessamad) - Supplier editor
UPDATE users SET role = 'editor' WHERE email = 'abdessamad.arbaoui@omya.com';

-- Step 4: Set default role for users with NULL or invalid roles
UPDATE users SET role = 'viewer' WHERE role IS NULL OR role NOT IN ('admin', 'editor', 'reviewer', 'viewer');

-- Step 5: Ensure auth helper functions exist
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS uuid AS $$
  SELECT company_id
  FROM public.users
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(is_super_admin, false)
  FROM public.users
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 6: Enable RLS on core tables
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop and recreate sheet policies
DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can insert sheets" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;
DROP POLICY IF EXISTS "Only super admins can delete sheets" ON sheets;
DROP POLICY IF EXISTS "Enable read access for all users" ON sheets;
DROP POLICY IF EXISTS "Allow authenticated read" ON sheets;

-- SELECT: Users can access sheets where their company is involved
CREATE POLICY "Users can access sheets they're involved with"
ON sheets FOR SELECT
USING (
  auth.is_super_admin() = true
  OR company_id = auth.user_company_id()
  OR requesting_company_id = auth.user_company_id()
  OR id IN (
    SELECT sheet_id FROM sheet_shareable_companies
    WHERE company_id = auth.user_company_id()
  )
);

-- INSERT: Admins and editors can create sheets for their company
CREATE POLICY "Admins and editors can insert sheets"
ON sheets FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR (
    (company_id = auth.user_company_id() OR requesting_company_id = auth.user_company_id())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

-- UPDATE: Admins, editors, reviewers can update sheets they're involved with
CREATE POLICY "Admins and editors can update their company's sheets"
ON sheets FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR (
    (company_id = auth.user_company_id() OR requesting_company_id = auth.user_company_id())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor', 'reviewer')
    )
  )
);

-- DELETE: Only super admins
CREATE POLICY "Only super admins can delete sheets"
ON sheets FOR DELETE
USING (auth.is_super_admin() = true);

-- Step 8: Drop and recreate answer policies
DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Editors can insert answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Editors can update answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;
DROP POLICY IF EXISTS "Enable read access for all users" ON answers;
DROP POLICY IF EXISTS "Allow authenticated read" ON answers;

-- SELECT: Users can access answers if they can access parent sheet
CREATE POLICY "Users can access answers for their sheets"
ON answers FOR SELECT
USING (
  auth.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.sheet_id
    AND (
      s.company_id = auth.user_company_id()
      OR s.requesting_company_id = auth.user_company_id()
      OR s.id IN (
        SELECT sheet_id FROM sheet_shareable_companies
        WHERE company_id = auth.user_company_id()
      )
    )
  )
);

-- INSERT: Editors can insert answers
CREATE POLICY "Editors can insert answers for accessible sheets"
ON answers FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
    AND EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.sheet_id
      AND (s.company_id = auth.user_company_id() OR s.requesting_company_id = auth.user_company_id())
    )
  )
);

-- UPDATE: Editors can update answers
CREATE POLICY "Editors can update answers for accessible sheets"
ON answers FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
    AND EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.sheet_id
      AND (s.company_id = auth.user_company_id() OR s.requesting_company_id = auth.user_company_id())
    )
  )
);

-- DELETE: Admins can delete answers
CREATE POLICY "Admins can delete answers"
ON answers FOR DELETE
USING (
  auth.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.sheet_id
      AND (s.company_id = auth.user_company_id() OR s.requesting_company_id = auth.user_company_id())
    )
  )
);

-- Step 9: Drop and recreate company policies
DROP POLICY IF EXISTS "Users can see visible companies" ON companies;
DROP POLICY IF EXISTS "Only admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Only admins can update companies" ON companies;
DROP POLICY IF EXISTS "Only super admins can delete companies" ON companies;
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Allow authenticated read" ON companies;

-- SELECT: Users can see their own company + companies they have sheet relationships with
CREATE POLICY "Users can see visible companies"
ON companies FOR SELECT
USING (
  auth.is_super_admin() = true
  OR id = auth.user_company_id()
  OR id IN (
    SELECT company_id FROM sheets WHERE requesting_company_id = auth.user_company_id()
  )
  OR id IN (
    SELECT requesting_company_id FROM sheets WHERE company_id = auth.user_company_id()
  )
);

-- INSERT: Admins can create companies
CREATE POLICY "Only admins can insert companies"
ON companies FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- UPDATE: Only super admins can update companies (for now)
CREATE POLICY "Only admins can update companies"
ON companies FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR (
    id = auth.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- DELETE: Only super admins can delete companies
CREATE POLICY "Only super admins can delete companies"
ON companies FOR DELETE
USING (auth.is_super_admin() = true);

-- Step 10: Users table policies
DROP POLICY IF EXISTS "Users can see users in visible companies" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Only super admins can delete users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Allow authenticated read" ON users;

-- SELECT: Users can see themselves + users in their company
CREATE POLICY "Users can see users in visible companies"
ON users FOR SELECT
USING (
  auth.is_super_admin() = true
  OR id = auth.uid()
  OR company_id = auth.user_company_id()
);

-- INSERT: Admins can create users in their company
CREATE POLICY "Only admins can insert users"
ON users FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR (
    company_id = auth.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- UPDATE: Users can update themselves, admins can update company users
CREATE POLICY "Admins can update users in their company"
ON users FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR id = auth.uid()
  OR (
    company_id = auth.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- DELETE: Only super admins can delete users
CREATE POLICY "Only super admins can delete users"
ON users FOR DELETE
USING (auth.is_super_admin() = true);

-- Step 11: Verify the fix
DO $$
DECLARE
  super_admin_count INT;
  users_with_roles INT;
BEGIN
  SELECT COUNT(*) INTO super_admin_count FROM users WHERE is_super_admin = true;
  SELECT COUNT(*) INTO users_with_roles FROM users WHERE role IS NOT NULL;

  RAISE NOTICE 'Super admins: %', super_admin_count;
  RAISE NOTICE 'Users with roles: %', users_with_roles;
END $$;
