-- ============================================
-- Production RLS -- March 11, 2026
-- Replaces all USING (true) policies with company-scoped access.
-- Baseline: 20260130_fix_rls_for_trial.sql (correct column names, correct logic)
-- ============================================

-- ============================================
-- Step 1: Drop ALL "Enable read access for all users" USING(true) policies
-- These were set by 20260122000001/2 for demo and are still active.
-- ============================================

DROP POLICY IF EXISTS "Enable read access for all users" ON sheets;
DROP POLICY IF EXISTS "Enable read access for all users" ON answers;
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON sheet_statuses;
DROP POLICY IF EXISTS "Enable read access for all users" ON answer_rejections;
DROP POLICY IF EXISTS "Enable read access for all users" ON sections;
DROP POLICY IF EXISTS "Enable read access for all users" ON subsections;
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON choices;
DROP POLICY IF EXISTS "Enable read access for all users" ON tags;
DROP POLICY IF EXISTS "Enable read access for all users" ON question_tags;
DROP POLICY IF EXISTS "Enable read access for all users" ON sheet_tags;
DROP POLICY IF EXISTS "Enable read access for all users" ON list_table_columns;
DROP POLICY IF EXISTS "Enable read access for all users" ON list_table_rows;

-- Also drop any leftover policies from previous migration attempts
DROP POLICY IF EXISTS "Allow authenticated read" ON sheets;
DROP POLICY IF EXISTS "Allow authenticated read" ON answers;
DROP POLICY IF EXISTS "Allow authenticated read" ON companies;
DROP POLICY IF EXISTS "Allow authenticated read" ON users;
DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets;
DROP POLICY IF EXISTS "Users can access answers for their sheets" ON answers;
DROP POLICY IF EXISTS "Users can see visible companies" ON companies;
DROP POLICY IF EXISTS "Users can see users in visible companies" ON users;
DROP POLICY IF EXISTS "sheets_select_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_insert_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_update_policy" ON sheets;
DROP POLICY IF EXISTS "sheets_delete_policy" ON sheets;
DROP POLICY IF EXISTS "answers_select_policy" ON answers;
DROP POLICY IF EXISTS "answers_insert_policy" ON answers;
DROP POLICY IF EXISTS "answers_update_policy" ON answers;
DROP POLICY IF EXISTS "answers_delete_policy" ON answers;
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- ============================================
-- Step 2: Re-enable RLS on tag tables (disabled by 20260112000002)
-- ============================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_tags ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on all sensitive tables
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 3: Authenticated-only read policies for shared/structure tables
-- These are questionnaire structure, not company data.
-- Blocks anonymous access but allows all authenticated users to read.
-- ============================================

CREATE POLICY "sections_select_authenticated"
ON sections FOR SELECT TO authenticated
USING (true);

CREATE POLICY "subsections_select_authenticated"
ON subsections FOR SELECT TO authenticated
USING (true);

CREATE POLICY "questions_select_authenticated"
ON questions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "choices_select_authenticated"
ON choices FOR SELECT TO authenticated
USING (true);

CREATE POLICY "tags_select_authenticated"
ON tags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "question_tags_select_authenticated"
ON question_tags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "sheet_tags_select_authenticated"
ON sheet_tags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "list_table_columns_select_authenticated"
ON list_table_columns FOR SELECT TO authenticated
USING (true);

CREATE POLICY "list_table_rows_select_authenticated"
ON list_table_rows FOR SELECT TO authenticated
USING (true);

CREATE POLICY "canonical_parameters_select_authenticated"
ON canonical_parameters FOR SELECT TO authenticated
USING (true);

CREATE POLICY "canonical_parameter_tags_select_authenticated"
ON canonical_parameter_tags FOR SELECT TO authenticated
USING (true);

-- ============================================
-- Step 4: Company-scoped policies for sensitive tables
-- ============================================

-- --- SHEETS ---

CREATE POLICY "sheets_select"
ON sheets FOR SELECT
USING (
  public.is_super_admin() = true
  OR company_id = public.user_company_id()
  OR requesting_company_id = public.user_company_id()
);

CREATE POLICY "sheets_insert"
ON sheets FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    (company_id = public.user_company_id() OR requesting_company_id = public.user_company_id())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

CREATE POLICY "sheets_update"
ON sheets FOR UPDATE
USING (
  public.is_super_admin() = true
  OR (
    (company_id = public.user_company_id() OR requesting_company_id = public.user_company_id())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor', 'reviewer')
    )
  )
);

CREATE POLICY "sheets_delete"
ON sheets FOR DELETE
USING (public.is_super_admin() = true);

-- --- ANSWERS ---

CREATE POLICY "answers_select"
ON answers FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = answers.sheet_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

CREATE POLICY "answers_insert"
ON answers FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
    AND EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.sheet_id
      AND (s.company_id = public.user_company_id() OR s.requesting_company_id = public.user_company_id())
    )
  )
);

CREATE POLICY "answers_update"
ON answers FOR UPDATE
USING (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
    AND EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.sheet_id
      AND (s.company_id = public.user_company_id() OR s.requesting_company_id = public.user_company_id())
    )
  )
);

CREATE POLICY "answers_delete"
ON answers FOR DELETE
USING (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM sheets s
      WHERE s.id = answers.sheet_id
      AND (s.company_id = public.user_company_id() OR s.requesting_company_id = public.user_company_id())
    )
  )
);

-- --- COMPANIES ---

CREATE POLICY "companies_select"
ON companies FOR SELECT
USING (
  public.is_super_admin() = true
  OR id = public.user_company_id()
  OR id IN (
    SELECT company_id FROM sheets WHERE requesting_company_id = public.user_company_id()
  )
  OR id IN (
    SELECT requesting_company_id FROM sheets WHERE company_id = public.user_company_id()
  )
);

-- Keep existing INSERT/UPDATE/DELETE policies from 20260130 if they exist, otherwise create
DROP POLICY IF EXISTS "Only admins can insert companies" ON companies;
CREATE POLICY "companies_insert"
ON companies FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Only admins can update companies" ON companies;
CREATE POLICY "companies_update"
ON companies FOR UPDATE
USING (
  public.is_super_admin() = true
  OR (
    id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "Only super admins can delete companies" ON companies;
CREATE POLICY "companies_delete"
ON companies FOR DELETE
USING (public.is_super_admin() = true);

-- --- USERS ---

DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Only super admins can delete users" ON users;

CREATE POLICY "users_select"
ON users FOR SELECT
USING (
  public.is_super_admin() = true
  OR id = auth.uid()
  OR company_id = public.user_company_id()
);

CREATE POLICY "users_insert"
ON users FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "users_update"
ON users FOR UPDATE
USING (
  public.is_super_admin() = true
  OR id = auth.uid()
  OR (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "users_delete"
ON users FOR DELETE
USING (public.is_super_admin() = true);

-- --- ANSWER REJECTIONS ---

DROP POLICY IF EXISTS "answer_rejections_select" ON answer_rejections;
CREATE POLICY "answer_rejections_select"
ON answer_rejections FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM answers a
    JOIN sheets s ON s.id = a.sheet_id
    WHERE a.id = answer_rejections.answer_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

DROP POLICY IF EXISTS "answer_rejections_insert" ON answer_rejections;
CREATE POLICY "answer_rejections_insert"
ON answer_rejections FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM answers a
    JOIN sheets s ON s.id = a.sheet_id
    WHERE a.id = answer_rejections.answer_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

DROP POLICY IF EXISTS "answer_rejections_update" ON answer_rejections;
CREATE POLICY "answer_rejections_update"
ON answer_rejections FOR UPDATE
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM answers a
    JOIN sheets s ON s.id = a.sheet_id
    WHERE a.id = answer_rejections.answer_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

-- --- SHEET STATUSES ---

DROP POLICY IF EXISTS "sheet_statuses_select" ON sheet_statuses;
CREATE POLICY "sheet_statuses_select"
ON sheet_statuses FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = sheet_statuses.sheet_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

DROP POLICY IF EXISTS "sheet_statuses_insert" ON sheet_statuses;
CREATE POLICY "sheet_statuses_insert"
ON sheet_statuses FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = sheet_statuses.sheet_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

-- --- REQUESTS ---

DROP POLICY IF EXISTS "requests_select" ON requests;
CREATE POLICY "requests_select"
ON requests FOR SELECT
USING (
  public.is_super_admin() = true
  OR requestor_id = public.user_company_id()
  OR requesting_from_id = public.user_company_id()
);

DROP POLICY IF EXISTS "requests_insert" ON requests;
CREATE POLICY "requests_insert"
ON requests FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR requestor_id = public.user_company_id()
);

DROP POLICY IF EXISTS "requests_update" ON requests;
CREATE POLICY "requests_update"
ON requests FOR UPDATE
USING (
  public.is_super_admin() = true
  OR requestor_id = public.user_company_id()
  OR requesting_from_id = public.user_company_id()
);

-- --- SHEET CHEMICALS ---

DROP POLICY IF EXISTS "sheet_chemicals_select" ON sheet_chemicals;
CREATE POLICY "sheet_chemicals_select"
ON sheet_chemicals FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM sheets s
    WHERE s.id = sheet_chemicals.sheet_id
    AND (
      s.company_id = public.user_company_id()
      OR s.requesting_company_id = public.user_company_id()
    )
  )
);

-- --- CHEMICAL INVENTORY ---
-- Shared reference data, authenticated read

DROP POLICY IF EXISTS "chemical_inventory_select" ON chemical_inventory;
CREATE POLICY "chemical_inventory_select"
ON chemical_inventory FOR SELECT TO authenticated
USING (true);

-- ============================================
-- Step 5: Ensure index on answers.sheet_id for RLS performance (367k rows)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_answers_sheet_id ON answers(sheet_id);

-- ============================================
-- Step 6: Remove temporary comments from tag tables
-- ============================================

COMMENT ON TABLE tags IS NULL;
COMMENT ON TABLE question_tags IS NULL;
COMMENT ON TABLE sheet_tags IS NULL;
