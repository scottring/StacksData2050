-- Fix RLS policies to use correct column names
-- Previous policies referenced non-existent columns:
--   - assigned_to_company_id (actual: requesting_company_id)
--   - parent_sheet_id (actual: sheet_id)

-- ============================================
-- Step 1: Fix helper function for visible companies
-- ============================================

CREATE OR REPLACE FUNCTION auth.visible_company_ids()
RETURNS TABLE(company_id uuid) AS $$
  -- User's own company
  SELECT company_id FROM public.users WHERE id = auth.uid()

  UNION

  -- Companies user has sheet relationships with (as manufacturer/requester)
  SELECT DISTINCT s.company_id
  FROM public.sheets s
  WHERE s.requesting_company_id = auth.user_company_id()
    AND s.company_id IS NOT NULL

  UNION

  -- Companies user has sheet relationships with (as supplier)
  SELECT DISTINCT s.requesting_company_id
  FROM public.sheets s
  WHERE s.company_id = auth.user_company_id()
    AND s.requesting_company_id IS NOT NULL
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Step 2: Drop old/broken policies on sheets
-- ============================================

DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can insert sheets" ON sheets;
DROP POLICY IF EXISTS "Admins and editors can update their company's sheets" ON sheets;
DROP POLICY IF EXISTS "Only super admins can delete sheets" ON sheets;
DROP POLICY IF EXISTS "Enable read access for all users" ON sheets;

-- ============================================
-- Step 3: Create correct policies for sheets
-- ============================================

-- SELECT: Users can access sheets where their company is involved
CREATE POLICY "sheets_select_policy"
ON sheets
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR company_id = auth.user_company_id()  -- They're the supplier
  OR requesting_company_id = auth.user_company_id()  -- They're the requester/manufacturer
);

-- INSERT: Users can create sheets for their company
CREATE POLICY "sheets_insert_policy"
ON sheets
FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR company_id = auth.user_company_id()  -- Supplier creates for themselves
  OR requesting_company_id = auth.user_company_id()  -- Manufacturer creates request
);

-- UPDATE: Users can update sheets they're involved with
CREATE POLICY "sheets_update_policy"
ON sheets
FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR company_id = auth.user_company_id()
  OR requesting_company_id = auth.user_company_id()
);

-- DELETE: Only super admins can delete
CREATE POLICY "sheets_delete_policy"
ON sheets
FOR DELETE
USING (auth.is_super_admin() = true);

-- ============================================
-- Step 4: Drop old/broken policies on answers
-- ============================================

DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Editors can insert answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Editors can update answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;
DROP POLICY IF EXISTS "Enable read access for all users" ON answers;

-- ============================================
-- Step 5: Create correct policies for answers
-- ============================================

-- SELECT: Users can access answers if they can access parent sheet
CREATE POLICY "answers_select_policy"
ON answers
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.sheet_id
    AND (
      s.company_id = auth.user_company_id()
      OR s.requesting_company_id = auth.user_company_id()
    )
  )
);

-- INSERT: Users can insert answers for accessible sheets
CREATE POLICY "answers_insert_policy"
ON answers
FOR INSERT
WITH CHECK (
  auth.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.sheet_id
    AND (
      s.company_id = auth.user_company_id()
      OR s.requesting_company_id = auth.user_company_id()
    )
  )
);

-- UPDATE: Users can update answers for accessible sheets
CREATE POLICY "answers_update_policy"
ON answers
FOR UPDATE
USING (
  auth.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.sheet_id
    AND (
      s.company_id = auth.user_company_id()
      OR s.requesting_company_id = auth.user_company_id()
    )
  )
);

-- DELETE: Only super admins can delete answers
CREATE POLICY "answers_delete_policy"
ON answers
FOR DELETE
USING (auth.is_super_admin() = true);

-- ============================================
-- Step 6: Fix users table - restrict to own company
-- ============================================

DROP POLICY IF EXISTS "Users can see users in visible companies" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

CREATE POLICY "users_select_policy"
ON users
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR id = auth.uid()  -- Can see self
  OR company_id = auth.user_company_id()  -- Can see own company users
  OR company_id IN (SELECT company_id FROM auth.visible_company_ids())  -- Can see related companies
);

-- ============================================
-- Step 7: Keep public read on truly public tables
-- (sections, subsections, questions, tags, choices)
-- These are questionnaire structure, not company data
-- ============================================

-- These tables remain publicly readable (no changes needed)
-- sections, subsections, questions, tags, question_tags, choices, list_table_columns

