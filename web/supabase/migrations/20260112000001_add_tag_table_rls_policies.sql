-- Migration: Add RLS policies for tag tables to allow authenticated users to read them
-- This fixes the issue where frontend users cannot read sheet_tags/question_tags due to RLS
-- Date: 2026-01-12

-- ============================================================================
-- 1. tags table - Allow all authenticated users to read tags
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can read tags" ON tags;

-- Allow all authenticated users to read tags (tags are not sensitive)
CREATE POLICY "Authenticated users can read tags" ON tags
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 2. question_tags table - Allow all authenticated users to read question tags
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read question tags" ON question_tags;

-- Allow all authenticated users to read question_tags
-- (Questions and their tags are not sensitive - users need this to render questions correctly)
CREATE POLICY "Authenticated users can read question tags" ON question_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. sheet_tags table - Allow users to read tags for sheets they can access
-- ============================================================================

DROP POLICY IF EXISTS "Users can read sheet tags for accessible sheets" ON sheet_tags;

-- Allow users to read sheet_tags for sheets they have access to
-- A user has access if they belong to a company that is either:
-- - The customer company (company_id)
-- - The supplier company (supplier_company_id)
CREATE POLICY "Users can read sheet tags for accessible sheets" ON sheet_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sheets s
      INNER JOIN user_companies uc ON (
        uc.company_id = s.company_id
        OR uc.company_id = s.supplier_company_id
      )
      WHERE s.id = sheet_tags.sheet_id
      AND uc.user_id = auth.uid()
    )
  );

-- Verify RLS is enabled on all three tables
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'tags') THEN
    ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on tags table';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'question_tags') THEN
    ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on question_tags table';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'sheet_tags') THEN
    ALTER TABLE sheet_tags ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on sheet_tags table';
  END IF;
END $$;
