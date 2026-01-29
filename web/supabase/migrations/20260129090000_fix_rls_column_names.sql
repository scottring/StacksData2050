-- ============================================
-- FIX: RLS policies reference wrong column name
-- All policies used 'assigned_to_company_id' but actual column is 'requesting_company_id'
-- ============================================

-- Drop all existing sheet-related policies first
DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can insert sheets" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;
DROP POLICY IF EXISTS "Only super admins can delete sheets" ON sheets;

-- Drop answer-related policies
DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Editors can insert answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Editors can update answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;

-- ============================================
-- RECREATE SHEET POLICIES (with correct column name)
-- ============================================

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
    company_id = auth.user_company_id()
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
)
WITH CHECK (
  company_id = auth.user_company_id()
  OR requesting_company_id = auth.user_company_id()
);

-- DELETE: Only super admins
CREATE POLICY "Only super admins can delete sheets"
ON sheets FOR DELETE
USING (auth.is_super_admin() = true);

-- ============================================
-- RECREATE ANSWER POLICIES (with correct column name)
-- ============================================

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

-- ============================================
-- FIX visible_company_ids function
-- ============================================

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
  SELECT DISTINCT s.requesting_company_id
  FROM public.sheets s
  WHERE s.company_id = auth.user_company_id()
    AND s.requesting_company_id IS NOT NULL

  UNION

  -- Companies user has sheet relationships with (as supplier)
  SELECT DISTINCT s.company_id
  FROM public.sheets s
  WHERE s.requesting_company_id = auth.user_company_id()
    AND s.company_id IS NOT NULL
$$ LANGUAGE sql SECURITY DEFINER STABLE;
