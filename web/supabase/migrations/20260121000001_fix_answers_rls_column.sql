-- Fix RLS policies on answers table to use correct column name
-- The policies were using parent_sheet_id but the actual column is sheet_id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Editors can insert answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Editors can update answers for accessible sheets" ON answers;
DROP POLICY IF EXISTS "Admins can delete answers" ON answers;

-- Recreate with correct column name (sheet_id instead of parent_sheet_id)

-- SELECT: Users can access answers if they can access parent sheet
CREATE POLICY "Users can access answers for their sheets"
ON answers
FOR SELECT
USING (
  auth.is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.sheet_id  -- FIXED: was parent_sheet_id
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
      WHERE s.id = answers.sheet_id  -- FIXED: was parent_sheet_id
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
      WHERE s.id = answers.sheet_id  -- FIXED: was parent_sheet_id
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
      WHERE s.id = answers.sheet_id  -- FIXED: was parent_sheet_id
      AND (s.company_id = auth.user_company_id() OR s.assigned_to_company_id = auth.user_company_id())
    )
  )
);
