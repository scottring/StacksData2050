-- Base Schema Migration
-- Creates all core tables for the Stacks application
-- This must run before any other migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domain TEXT,
  type TEXT,
  logo_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_id UUID REFERENCES companies(id),
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Sections table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_number INTEGER,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Subsections table
CREATE TABLE subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES sections(id),
  name TEXT NOT NULL,
  order_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id UUID REFERENCES subsections(id),
  name TEXT NOT NULL,
  content TEXT,
  description TEXT,
  response_type TEXT NOT NULL,
  order_number INTEGER,
  required BOOLEAN DEFAULT false,
  section_sort_number INTEGER,
  subsection_sort_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Choices table
CREATE TABLE choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  content TEXT NOT NULL,
  order_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- List table columns
CREATE TABLE list_table_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  name TEXT NOT NULL,
  order_number INTEGER,
  response_type TEXT,
  choice_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  bubble_id TEXT UNIQUE
);

-- Question-Tag junction
CREATE TABLE question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  tag_id UUID REFERENCES tags(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sheets table
CREATE TABLE sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  requesting_company_id UUID REFERENCES companies(id),
  version INTEGER DEFAULT 1,
  father_sheet_id UUID REFERENCES sheets(id),
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  bubble_id TEXT UNIQUE
);

-- Sheet-Tag junction
CREATE TABLE sheet_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id),
  tag_id UUID REFERENCES tags(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Answers table
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  text_value TEXT,
  number_value NUMERIC,
  boolean_value BOOLEAN,
  date_value DATE,
  choice_id UUID REFERENCES choices(id),
  list_table_row_id TEXT,
  list_table_column_id UUID REFERENCES list_table_columns(id),
  company_id UUID REFERENCES companies(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Answer flags for review workflow
CREATE TABLE answer_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES answers(id),
  sheet_id UUID NOT NULL REFERENCES sheets(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  flagged_by UUID REFERENCES users(id),
  flagged_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
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

-- Answer documents
CREATE TABLE answer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id UUID REFERENCES answers(id),
  document_type TEXT CHECK (document_type IN ('primary', 'support')),
  file_url TEXT NOT NULL,
  filename TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES users(id)
);

-- Answer rejections
CREATE TABLE answer_rejections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bubble_id TEXT UNIQUE,
  answer_id UUID REFERENCES answers(id),
  reason TEXT,
  rejected_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Packets
CREATE TABLE packets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bubble_id TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Junction tables
CREATE TABLE answer_packets (
  answer_id UUID REFERENCES answers(id),
  packet_id UUID REFERENCES packets(id),
  PRIMARY KEY (answer_id, packet_id)
);

CREATE TABLE sheet_packets (
  sheet_id UUID REFERENCES sheets(id),
  packet_id UUID REFERENCES packets(id),
  PRIMARY KEY (sheet_id, packet_id)
);

CREATE TABLE company_employees (
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  PRIMARY KEY (company_id, user_id)
);
COMMENT ON TABLE company_employees IS 'Employees list for companies';

CREATE TABLE company_members (
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  PRIMARY KEY (company_id, user_id)
);
COMMENT ON TABLE company_members IS 'Members list for companies';

CREATE TABLE company_demo_interactions (
  company_id UUID REFERENCES companies(id),
  demo_company_id UUID REFERENCES companies(id),
  PRIMARY KEY (company_id, demo_company_id)
);
COMMENT ON TABLE company_demo_interactions IS 'Demo sandbox companies interactions';

CREATE TABLE section_questions (
  section_id UUID REFERENCES sections(id),
  question_id UUID REFERENCES questions(id),
  order_number INTEGER,
  PRIMARY KEY (section_id, question_id)
);

CREATE TABLE question_choices (
  question_id UUID REFERENCES questions(id),
  choice_id UUID REFERENCES choices(id),
  order_number INTEGER,
  PRIMARY KEY (question_id, choice_id)
);

CREATE TABLE stack_sections (
  stack_id UUID,
  section_id UUID REFERENCES sections(id),
  order_number INTEGER,
  PRIMARY KEY (stack_id, section_id)
);

CREATE TABLE tag_stacks (
  tag_id UUID REFERENCES tags(id),
  stack_id UUID,
  PRIMARY KEY (tag_id, stack_id)
);

-- Note: request_tags table is created in the request_tracking migration
