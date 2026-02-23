-- ============================================
-- FIX: Add INSERT policy for sheet_tags table
-- Date: 2026-02-05
--
-- Issue: The sheet_tags table has RLS enabled but only a SELECT policy.
-- When creating a request, the code tries to insert sheet_tags but fails
-- silently because no INSERT policy exists.
-- ============================================

-- Add INSERT policy for sheet_tags
CREATE POLICY "Users can insert sheet tags for their sheets"
ON sheet_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = sheet_id
    AND (
      s.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      OR s.requesting_company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  )
);

-- Also add DELETE policy
CREATE POLICY "Users can delete sheet tags for their sheets"
ON sheet_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = sheet_id
    AND (
      s.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      OR s.requesting_company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  )
);
