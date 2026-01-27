-- Fix RLS policies to properly allow super admin universal access
-- Create a public schema function that checks auth.users.is_super_admin

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM auth.users WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Drop existing policies that reference is_super_admin
DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can insert sheets" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;
DROP POLICY IF EXISTS "Only super admins can delete sheets" ON sheets;

DROP POLICY IF EXISTS "Users can see visible companies" ON companies;
DROP POLICY IF EXISTS "Only admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Only admins can update companies" ON companies;
DROP POLICY IF EXISTS "Only super admins can delete companies" ON companies;

DROP POLICY IF EXISTS "Users can see users in visible companies" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Only super admins can delete users" ON users;

DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Editors can insert answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Editors can update answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;

-- Recreate policies with the new function
-- SHEETS policies
CREATE POLICY "Super admins have full access to sheets"
ON sheets
FOR ALL
USING (public.is_super_admin() = true)
WITH CHECK (public.is_super_admin() = true);

CREATE POLICY "Users can access sheets they're involved with"
ON sheets
FOR SELECT
USING (
  public.is_super_admin() = true
  OR
  company_id = auth.user_company_id()
  OR
  assigned_to_company_id = auth.user_company_id()
  OR
  id IN (
    SELECT sheet_id
    FROM shareable_companies
    WHERE company_id = auth.user_company_id()
  )
);

CREATE POLICY "Admins and editors can insert sheets"
ON sheets
FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR
  (
    company_id = auth.user_company_id()
    AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  )
);

CREATE POLICY "Admins and editors can update their company's sheets"
ON sheets
FOR UPDATE
USING (
  public.is_super_admin() = true
  OR
  (
    (company_id = auth.user_company_id() OR assigned_to_company_id = auth.user_company_id())
    AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor', 'reviewer')
    )
  )
)
WITH CHECK (
  public.is_super_admin() = true
  OR
  company_id = auth.user_company_id()
  OR assigned_to_company_id = auth.user_company_id()
);

CREATE POLICY "Only super admins can delete sheets"
ON sheets
FOR DELETE
USING (public.is_super_admin() = true);

-- COMPANIES policies
CREATE POLICY "Super admins have full access to companies"
ON companies
FOR ALL
USING (public.is_super_admin() = true)
WITH CHECK (public.is_super_admin() = true);

CREATE POLICY "Users can see visible companies"
ON companies
FOR SELECT
USING (
  public.is_super_admin() = true
  OR
  id IN (SELECT company_id FROM auth.visible_company_ids())
);

CREATE POLICY "Only admins can insert companies"
ON companies
FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update companies"
ON companies
FOR UPDATE
USING (
  public.is_super_admin() = true
  OR
  (
    id = auth.user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

CREATE POLICY "Only super admins can delete companies"
ON companies
FOR DELETE
USING (public.is_super_admin() = true);

-- USERS policies
CREATE POLICY "Super admins have full access to users"
ON users
FOR ALL
USING (public.is_super_admin() = true)
WITH CHECK (public.is_super_admin() = true);

CREATE POLICY "Users can see users in visible companies"
ON users
FOR SELECT
USING (
  public.is_super_admin() = true
  OR
  id = auth.uid()
  OR
  company_id IN (SELECT company_id FROM auth.visible_company_ids())
);

CREATE POLICY "Only admins can insert users"
ON users
FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR
  (
    company_id = auth.user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

CREATE POLICY "Admins can update users in their company"
ON users
FOR UPDATE
USING (
  public.is_super_admin() = true
  OR
  id = auth.uid()
  OR
  (
    company_id = auth.user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
)
WITH CHECK (
  public.is_super_admin() = true
  OR
  company_id = auth.user_company_id()
);

CREATE POLICY "Only super admins can delete users"
ON users
FOR DELETE
USING (public.is_super_admin() = true);

-- ANSWERS policies
CREATE POLICY "Super admins have full access to answers"
ON answers
FOR ALL
USING (public.is_super_admin() = true)
WITH CHECK (public.is_super_admin() = true);

CREATE POLICY "Users can access answers for their sheets"
ON answers
FOR SELECT
USING (
  public.is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.parent_sheet_id
    AND (
      s.company_id = auth.user_company_id()
      OR s.assigned_to_company_id = auth.user_company_id()
      OR s.id IN (
        SELECT sheet_id FROM shareable_companies
        WHERE company_id = auth.user_company_id()
      )
    )
  )
);

CREATE POLICY "Editors can insert answers for accessible sheets"
ON answers
FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR
  (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
    AND
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.parent_sheet_id
      AND (s.company_id = auth.user_company_id() OR s.assigned_to_company_id = auth.user_company_id())
    )
  )
);

CREATE POLICY "Editors can update answers for accessible sheets"
ON answers
FOR UPDATE
USING (
  public.is_super_admin() = true
  OR
  (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
    AND
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.parent_sheet_id
      AND (s.company_id = auth.user_company_id() OR s.assigned_to_company_id = auth.user_company_id())
    )
  )
);

CREATE POLICY "Admins can delete answers"
ON answers
FOR DELETE
USING (
  public.is_super_admin() = true
  OR
  (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
    AND
    EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.parent_sheet_id
      AND (s.company_id = auth.user_company_id() OR s.assigned_to_company_id = auth.user_company_id())
    )
  )
);

-- Add helpful comment
COMMENT ON FUNCTION public.is_super_admin() IS 'Check if current user has super admin flag in auth.users table';
