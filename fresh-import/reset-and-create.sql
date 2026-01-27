-- ============================================================================
-- RESET AND CREATE FRESH SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to reset the database
-- WARNING: This will DELETE ALL DATA
-- ============================================================================

-- Step 1: Drop all existing tables (in dependency order)
DROP TABLE IF EXISTS answer_text_choices CASCADE;
DROP TABLE IF EXISTS answer_shareable_companies CASCADE;
DROP TABLE IF EXISTS answer_flags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS sheet_tags CASCADE;
DROP TABLE IF EXISTS sheet_questions CASCADE;
DROP TABLE IF EXISTS sheet_shareable_companies CASCADE;
DROP TABLE IF EXISTS sheet_supplier_users_assigned CASCADE;
DROP TABLE IF EXISTS sheet_statuses CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS sheets CASCADE;
DROP TABLE IF EXISTS list_table_rows CASCADE;
DROP TABLE IF EXISTS list_table_columns CASCADE;
DROP TABLE IF EXISTS list_tables CASCADE;
DROP TABLE IF EXISTS choices CASCADE;
DROP TABLE IF EXISTS question_tags CASCADE;
DROP TABLE IF EXISTS question_companies CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS subsections CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS tag_hidden_companies CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS stack_tags CASCADE;
DROP TABLE IF EXISTS stacks CASCADE;
DROP TABLE IF EXISTS association_companies CASCADE;
DROP TABLE IF EXISTS associations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS _migration_id_map CASCADE;
DROP TABLE IF EXISTS chemical_inventory CASCADE;
DROP TABLE IF EXISTS sheet_chemicals CASCADE;

-- Drop views
DROP VIEW IF EXISTS sheet_questions CASCADE;
DROP VIEW IF EXISTS sheets_with_flag_counts CASCADE;

-- ============================================================================
-- Step 2: Create Fresh Schema
-- ============================================================================

-- Companies (customers and/or suppliers)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domain TEXT,
  type TEXT,
  logo_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Users belong to exactly one company
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_id UUID REFERENCES companies(id),
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Sections (top level grouping)
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_number INT,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subsections (within sections)
CREATE TABLE subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id UUID REFERENCES subsections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  content TEXT,
  description TEXT,
  response_type TEXT NOT NULL,
  order_number INT,
  required BOOLEAN DEFAULT false,
  section_sort_number INT,
  subsection_sort_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Choices (for single/multiple choice questions)
CREATE TABLE choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  order_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- List table columns
CREATE TABLE list_table_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_number INT,
  response_type TEXT,
  choice_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Question-Tag relationship
CREATE TABLE question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, tag_id)
);

-- Sheets
CREATE TABLE sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  requesting_company_id UUID REFERENCES companies(id),
  version INT DEFAULT 1,
  father_sheet_id UUID REFERENCES sheets(id),
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

-- Sheet-Tag relationship
CREATE TABLE sheet_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sheet_id, tag_id)
);

-- Answers
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) NOT NULL,
  text_value TEXT,
  number_value NUMERIC,
  boolean_value BOOLEAN,
  date_value DATE,
  choice_id UUID REFERENCES choices(id),
  list_table_row_id UUID,
  list_table_column_id UUID REFERENCES list_table_columns(id),
  company_id UUID REFERENCES companies(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Answer flags (for review workflow)
CREATE TABLE answer_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES answers(id) ON DELETE CASCADE NOT NULL,
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  flagged_by UUID REFERENCES users(id),
  flagged_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  event_type TEXT NOT NULL,
  sheet_id UUID REFERENCES sheets(id),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_answers_sheet_question ON answers(sheet_id, question_id);
CREATE INDEX idx_answers_list_table_row ON answers(list_table_row_id) WHERE list_table_row_id IS NOT NULL;
CREATE INDEX idx_sheets_company ON sheets(company_id);
CREATE INDEX idx_sheets_requesting_company ON sheets(requesting_company_id);
CREATE INDEX idx_sheets_status ON sheets(status);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_flags_sheet_status ON answer_flags(sheet_id, status);
CREATE INDEX idx_comments_parent ON comments(parent_type, parent_id);

-- ============================================================================
-- Views
-- ============================================================================

-- View: Questions for a sheet (based on sheet's tags)
CREATE OR REPLACE VIEW sheet_questions_view AS
SELECT DISTINCT
  st.sheet_id,
  q.*
FROM sheet_tags st
JOIN question_tags qt ON qt.tag_id = st.tag_id
JOIN questions q ON q.id = qt.question_id
ORDER BY q.section_sort_number, q.subsection_sort_number, q.order_number;

-- View: Sheets with open flags count
CREATE OR REPLACE VIEW sheets_with_flag_counts AS
SELECT
  s.*,
  COUNT(af.id) FILTER (WHERE af.status = 'open') as open_flags_count
FROM sheets s
LEFT JOIN answer_flags af ON af.sheet_id = s.id
GROUP BY s.id;

-- ============================================================================
-- Done! Now run: npx tsx fresh-import/import.ts
-- ============================================================================
