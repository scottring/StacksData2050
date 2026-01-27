-- Phase 2: Enable RLS and Create Policies (BREAKING CHANGE)
-- WARNING: This migration enables Row Level Security on core tables.
-- Ensure frontend code is updated to work with RLS before deploying.

-- Step 1: Create advanced helper functions

-- Get user's association IDs (both paths: via stacks and via junction table)
CREATE OR REPLACE FUNCTION auth.user_association_ids()
RETURNS TABLE(association_id uuid) AS $$
  -- Path 1: via companies.stack_id -> stacks.association_id
  SELECT DISTINCT s.association_id
  FROM public.users u
  JOIN public.companies c ON u.company_id = c.id
  JOIN public.stacks s ON c.stack_id = s.id
  WHERE u.id = auth.uid()
    AND s.association_id IS NOT NULL

  UNION

  -- Path 2: via association_companies junction table
  SELECT DISTINCT ac.association_id
  FROM public.users u
  JOIN public.association_companies ac ON u.company_id = ac.company_id
  WHERE u.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get companies visible to user (own + association members + sheet relationships)
CREATE OR REPLACE FUNCTION auth.visible_company_ids()
RETURNS TABLE(company_id uuid) AS $$
  -- User's own company
  SELECT company_id FROM public.users WHERE id = auth.uid()

  UNION

  -- Association member companies (Path 1: via stacks)
  SELECT DISTINCT c.id
  FROM public.companies c
  JOIN public.stacks st ON c.stack_id = st.id
  WHERE st.association_id IN (SELECT association_id FROM auth.user_association_ids())

  UNION

  -- Association member companies (Path 2: via junction table)
  SELECT DISTINCT ac.company_id
  FROM public.association_companies ac
  WHERE ac.association_id IN (SELECT association_id FROM auth.user_association_ids())

  UNION

  -- Companies user has sheet relationships with (as customer)
  SELECT DISTINCT s.assigned_to_company_id
  FROM public.sheets s
  WHERE s.company_id = auth.user_company_id()
    AND s.assigned_to_company_id IS NOT NULL

  UNION

  -- Companies user has sheet relationships with (as supplier)
  SELECT DISTINCT s.company_id
  FROM public.sheets s
  WHERE s.assigned_to_company_id = auth.user_company_id()
    AND s.company_id IS NOT NULL
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Enable RLS on core tables
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies for Sheets

-- SELECT: Users can access sheets where their company is involved or in shareable list
CREATE POLICY "Users can access sheets they're involved with"
ON sheets
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR
  company_id = auth.user_company_id()  -- They're the customer
  OR
  assigned_to_company_id = auth.user_company_id()  -- They're the supplier
  OR
  id IN (  -- Sheet is shared with their company
    SELECT sheet_id
    FROM shareable_companies
    WHERE company_id = auth.user_company_id()
  )
);

-- INSERT: Admins and editors can create sheets for their company
CREATE POLICY "Admins and editors can insert sheets"
ON sheets
FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR
  (
    company_id = auth.user_company_id()  -- Can only create sheets for own company
    AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  )
);

-- UPDATE: Admins, editors, and reviewers can update their company's sheets
CREATE POLICY "Admins and editors can update their company's sheets"
ON sheets
FOR UPDATE
USING (
  auth.is_super_admin() = true
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
  -- Can't reassign sheet to different customer
  company_id = auth.user_company_id()
  OR assigned_to_company_id = auth.user_company_id()
);

-- DELETE: Only super admins can delete sheets (soft delete preferred)
CREATE POLICY "Only super admins can delete sheets"
ON sheets
FOR DELETE
USING (auth.is_super_admin() = true);

-- Step 4: Create RLS Policies for Answers

-- SELECT: Users can access answers if they can access parent sheet
CREATE POLICY "Users can access answers for their sheets"
ON answers
FOR SELECT
USING (
  auth.is_super_admin() = true
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

-- INSERT: Editors can insert answers for accessible sheets
CREATE POLICY "Editors can insert answers for accessible sheets"
ON answers
FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
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

-- UPDATE: Editors can update answers for accessible sheets
CREATE POLICY "Editors can update answers for accessible sheets"
ON answers
FOR UPDATE
USING (
  auth.is_super_admin() = true
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

-- DELETE: Only admins and super admins can delete answers
CREATE POLICY "Admins can delete answers"
ON answers
FOR DELETE
USING (
  auth.is_super_admin() = true
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

-- Step 5: Create RLS Policies for Companies

-- SELECT: Users see own company + association members + sheet relationship companies
CREATE POLICY "Users can see visible companies"
ON companies
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR
  id IN (SELECT company_id FROM auth.visible_company_ids())
);

-- INSERT: Only admins can create companies
CREATE POLICY "Only admins can insert companies"
ON companies
FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- UPDATE: Only admins can update companies (own company only)
CREATE POLICY "Only admins can update companies"
ON companies
FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR
  (
    id = auth.user_company_id()  -- Can update own company
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- DELETE: Only super admins can delete companies
CREATE POLICY "Only super admins can delete companies"
ON companies
FOR DELETE
USING (auth.is_super_admin() = true);

-- Step 6: Create RLS Policies for Users

-- SELECT: Users see users in visible companies
CREATE POLICY "Users can see users in visible companies"
ON users
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR
  id = auth.uid()  -- Can see self
  OR
  company_id IN (SELECT company_id FROM auth.visible_company_ids())
);

-- INSERT: Only admins can create users (for their own company)
CREATE POLICY "Only admins can insert users"
ON users
FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR
  (
    company_id = auth.user_company_id()  -- Can only add users to own company
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- UPDATE: Admins can update users in their company, users can update themselves
CREATE POLICY "Admins can update users in their company"
ON users
FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR
  id = auth.uid()  -- Can update self
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
  -- Can't change user's company (only super admin)
  company_id = auth.user_company_id()
  OR
  auth.is_super_admin() = true
);

-- DELETE: Only super admins can delete users
CREATE POLICY "Only super admins can delete users"
ON users
FOR DELETE
USING (auth.is_super_admin() = true);

-- Step 7: Create association member profile view

-- View for basic company profiles (association members only)
CREATE VIEW public.association_member_profiles AS
SELECT
  c.id,
  c.name,
  c.logo_url,
  c.city,
  c.state,
  c.country,
  c.show_as_supplier,
  st.association_id
FROM companies c
LEFT JOIN stacks st ON c.stack_id = st.id
WHERE c.active = true;

-- Grant access to view
GRANT SELECT ON public.association_member_profiles TO authenticated;

-- RLS for the view (security invoker ensures user's permissions apply)
ALTER VIEW association_member_profiles SET (security_invoker = true);

-- Add helpful comments
COMMENT ON VIEW public.association_member_profiles IS 'Basic company profiles for association member directory - excludes contact info';
COMMENT ON FUNCTION auth.user_association_ids() IS 'Returns all association IDs that the current user belongs to (via both stack and junction table paths)';
COMMENT ON FUNCTION auth.visible_company_ids() IS 'Returns all company IDs visible to the current user (own + association members + sheet relationships)';
