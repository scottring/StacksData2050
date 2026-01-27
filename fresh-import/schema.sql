-- Fresh Schema for Stacks Data
-- Based on PRD and actual business flows
-- Created: 2026-01-23

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Companies (customers and/or suppliers)
-- A company can be BOTH a customer (requesting data) and supplier (providing data)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domain TEXT,  -- for auto-associating users
  type TEXT,  -- 'customer' | 'supplier' | 'both'
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
  role TEXT DEFAULT 'user',  -- 'user' | 'admin' | 'super_admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- QUESTION HIERARCHY
-- ============================================================================

-- Sections (top level grouping, e.g., "Food Contact", "General Information")
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

-- Questions (individual data fields)
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id UUID REFERENCES subsections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,  -- short identifier
  content TEXT,  -- the actual question text
  description TEXT,  -- help text
  response_type TEXT NOT NULL,  -- 'text' | 'textarea' | 'boolean' | 'choice' | 'number' | 'date' | 'list_table'
  order_number INT,
  required BOOLEAN DEFAULT false,
  -- Denormalized for easier querying/display
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

-- ============================================================================
-- LIST TABLES (dynamic tables within questions)
-- ============================================================================

-- Column definitions for list table questions
CREATE TABLE list_table_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_number INT,
  response_type TEXT,  -- 'text' | 'number' | 'dropdown'
  choice_options JSONB,  -- for dropdown: ["mg/kg", "percent", ...]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TAGS (determines which questions appear in a sheet request)
-- ============================================================================

-- Tags like "HQ 2.0.1", "Food Contact", "PIDSL"
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Which questions belong to which tags
CREATE TABLE question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, tag_id)
);

-- ============================================================================
-- SHEETS (questionnaire instances sent to suppliers)
-- ============================================================================

-- A sheet is a questionnaire for a specific product from a specific supplier
CREATE TABLE sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- product name

  -- Company relationships
  company_id UUID REFERENCES companies(id),  -- supplier (answers)
  requesting_company_id UUID REFERENCES companies(id),  -- customer (requests)

  -- Versioning
  version INT DEFAULT 1,
  father_sheet_id UUID REFERENCES sheets(id),  -- previous version

  -- Status workflow: draft -> submitted -> needs_revision -> resubmitted -> approved
  status TEXT DEFAULT 'draft',

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

-- Which tags were selected for this sheet request
-- This determines which questions the supplier sees
CREATE TABLE sheet_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sheet_id, tag_id)
);

-- ============================================================================
-- ANSWERS
-- ============================================================================

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) NOT NULL,

  -- Value (only one populated based on question type)
  text_value TEXT,
  number_value NUMERIC,
  boolean_value BOOLEAN,
  date_value DATE,
  choice_id UUID REFERENCES choices(id),  -- for choice questions

  -- List table support
  list_table_row_id UUID,  -- groups cells into rows
  list_table_column_id UUID REFERENCES list_table_columns(id),

  -- Tracking
  company_id UUID REFERENCES companies(id),  -- supplier who answered
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient answer queries
CREATE INDEX idx_answers_sheet_question ON answers(sheet_id, question_id);
CREATE INDEX idx_answers_list_table_row ON answers(list_table_row_id) WHERE list_table_row_id IS NOT NULL;

-- ============================================================================
-- REVIEW & FLAGGING WORKFLOW
-- ============================================================================

-- Flags on answers (customer marks answers as problematic)
CREATE TABLE answer_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES answers(id) ON DELETE CASCADE NOT NULL,
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE NOT NULL,  -- denormalized for easier queries

  -- Flag details
  reason TEXT NOT NULL,  -- required comment explaining why flagged

  -- Status: 'open' (awaiting supplier response), 'resolved' (supplier addressed), 'accepted' (customer satisfied)
  status TEXT DEFAULT 'open',

  -- Tracking
  flagged_by UUID REFERENCES users(id),
  flagged_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- Comments (on flags, answers, or sheets)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What this comment is attached to (polymorphic)
  parent_type TEXT NOT NULL,  -- 'answer_flag' | 'answer' | 'sheet'
  parent_id UUID NOT NULL,

  -- Comment content
  content TEXT NOT NULL,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_parent ON comments(parent_type, parent_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notification events for email triggers
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who receives this notification
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),

  -- What triggered it
  event_type TEXT NOT NULL,  -- 'sheet_request' | 'sheet_submitted' | 'review_received' | 'sheet_approved'

  -- Reference to relevant entity
  sheet_id UUID REFERENCES sheets(id),

  -- Status
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Find sheets by supplier company
CREATE INDEX idx_sheets_company ON sheets(company_id);

-- Find sheets by requesting company
CREATE INDEX idx_sheets_requesting_company ON sheets(requesting_company_id);

-- Find sheets by status
CREATE INDEX idx_sheets_status ON sheets(status);

-- Find users by company
CREATE INDEX idx_users_company ON users(company_id);

-- Find open flags for a sheet
CREATE INDEX idx_flags_sheet_status ON answer_flags(sheet_id, status);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Questions for a sheet (based on sheet's tags)
CREATE OR REPLACE VIEW sheet_questions AS
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
