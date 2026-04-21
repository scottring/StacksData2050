-- ============================================================================
-- DEV SCHEMA SETUP - Stacks Data 2050
-- Run this in the Supabase SQL Editor for: cvsevqcmfiwkjuwppeir
-- This creates all tables, functions, views, and RLS policies from scratch.
-- ============================================================================

-- ============================================================================
-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Enum Types
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer', 'reviewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Core Tables (in FK dependency order)
-- ============================================================================

-- --- ASSOCIATIONS ---
CREATE TABLE IF NOT EXISTS associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- STACKS ---
CREATE TABLE IF NOT EXISTS stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  is_bundle BOOLEAN DEFAULT false,
  association_id UUID REFERENCES associations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- COMPANIES ---
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  name_lower_case TEXT,
  email_suffix TEXT,
  email_domain TEXT,
  type TEXT,
  location_text TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  show_as_supplier BOOLEAN DEFAULT false,
  hide_hq_import BOOLEAN DEFAULT false,
  is_zapier BOOLEAN DEFAULT false,
  patch_status_applied BOOLEAN DEFAULT false,
  plan_started_at TIMESTAMPTZ,
  subscription_anniversary_date TIMESTAMPTZ,
  subscription_trial_ends TIMESTAMPTZ,
  subscription_cancel_at_trial BOOLEAN DEFAULT false,
  subscription_canceled BOOLEAN DEFAULT false,
  subscription_expired BOOLEAN DEFAULT false,
  subscription_sheets_allowed INTEGER,
  premium_features_requested TEXT[],
  list_emails_prefix TEXT[],
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- ASSOCIATION_COMPANIES (junction) ---
CREATE TABLE IF NOT EXISTS association_companies (
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (association_id, company_id)
);

-- --- USERS ---
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  bubble_id TEXT UNIQUE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone_text TEXT,
  phone_number NUMERIC,
  profile_pic_url TEXT,
  company_id UUID REFERENCES companies(id),
  user_type TEXT,
  language TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  is_super_admin BOOLEAN DEFAULT false,
  is_company_main_contact BOOLEAN DEFAULT false,
  is_company_point_person BOOLEAN DEFAULT false,
  is_supplier_pointguard BOOLEAN DEFAULT false,
  is_sup_get_email_notifications BOOLEAN DEFAULT false,
  is_sup_cert_manager BOOLEAN DEFAULT false,
  is_sup_cert_tmplt_creator BOOLEAN DEFAULT false,
  is_sup_reviewer BOOLEAN DEFAULT false,
  is_sup_view_question_menu BOOLEAN DEFAULT false,
  invitation_sent BOOLEAN DEFAULT false,
  password_changed BOOLEAN DEFAULT false,
  profile_done BOOLEAN DEFAULT false,
  is_prospect BOOLEAN DEFAULT false,
  is_in_payed_or_established_plan BOOLEAN DEFAULT false,
  prospect_agree BOOLEAN DEFAULT false,
  prospect_paid BOOLEAN DEFAULT false,
  prospect_company_text TEXT,
  plan_first_started TIMESTAMPTZ,
  self_sign_up_invitation_code TEXT,
  one_time_message TEXT,
  comments TEXT,
  a_lnk TEXT,
  email_count INTEGER DEFAULT 0,
  emails_changes TEXT[],
  email_changes_dates TEXT[],
  slug TEXT,
  -- Deprecated permission columns (kept for backward compat)
  _deprecated_can_add_associations BOOLEAN DEFAULT false,
  _deprecated_can_add_companies BOOLEAN DEFAULT false,
  _deprecated_can_add_new_questions BOOLEAN DEFAULT false,
  _deprecated_can_add_new_sheet BOOLEAN DEFAULT false,
  _deprecated_can_add_new_stack BOOLEAN DEFAULT false,
  _deprecated_can_add_new_user BOOLEAN DEFAULT false,
  _deprecated_can_change_answers BOOLEAN DEFAULT false,
  _deprecated_can_change_sheet_status BOOLEAN DEFAULT false,
  _deprecated_can_change_status BOOLEAN DEFAULT false,
  _deprecated_can_run_reports BOOLEAN DEFAULT false,
  _deprecated_can_see_all_sheets BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- --- TAGS ---
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  group_number INTEGER,
  company_id UUID REFERENCES companies(id),
  custom_company_id UUID REFERENCES companies(id),
  custom_active BOOLEAN DEFAULT false,
  custom_any_can_see BOOLEAN DEFAULT false,
  custom_only_if_requested_or_shared BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- TAG_HIDDEN_COMPANIES (junction) ---
CREATE TABLE IF NOT EXISTS tag_hidden_companies (
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, company_id)
);

-- --- LIST TABLES ---
CREATE TABLE IF NOT EXISTS list_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- SECTIONS ---
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  order_number INTEGER,
  help TEXT,
  stack_id UUID REFERENCES stacks(id),
  association_id UUID REFERENCES associations(id),
  questionnaire_text TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- SUBSECTIONS ---
CREATE TABLE IF NOT EXISTS subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  show_title_and_group BOOLEAN DEFAULT true,
  section_id UUID REFERENCES sections(id),
  order_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- QUESTIONS ---
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT,
  content TEXT,
  question_description TEXT,
  clarification TEXT,
  clarification_yes_no BOOLEAN DEFAULT false,
  static_text TEXT,
  a_q_help TEXT,
  question_type TEXT,
  response_type TEXT,
  question_id_number INTEGER,
  order_number INTEGER,
  required BOOLEAN DEFAULT false,
  optional_question BOOLEAN DEFAULT false,
  dependent_no_show BOOLEAN DEFAULT false,
  lock BOOLEAN DEFAULT false,
  highlight BOOLEAN DEFAULT false,
  support_file_requested BOOLEAN DEFAULT false,
  support_file_reason TEXT,
  section_name_sort TEXT,
  section_sort_number INTEGER,
  subsection_name_sort TEXT,
  subsection_sort_number INTEGER,
  company_id UUID REFERENCES companies(id),
  parent_section_id UUID REFERENCES sections(id),
  parent_subsection_id UUID REFERENCES subsections(id),
  parent_choice_id UUID,  -- FK added after choices table
  list_table_id UUID REFERENCES list_tables(id),
  subsection_id UUID REFERENCES subsections(id),
  created_by UUID REFERENCES users(id),
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- CHOICES ---
CREATE TABLE IF NOT EXISTS choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  content TEXT,
  import_map TEXT,
  parent_question_id UUID REFERENCES questions(id),
  question_id UUID REFERENCES questions(id),
  order_number INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from questions to choices now that choices exists
DO $$ BEGIN
  ALTER TABLE questions ADD CONSTRAINT fk_questions_parent_choice
    FOREIGN KEY (parent_choice_id) REFERENCES choices(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- LIST TABLE COLUMNS ---
CREATE TABLE IF NOT EXISTS list_table_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  response_type TEXT,
  order_number INTEGER,
  parent_table_id UUID REFERENCES list_tables(id),
  question_id UUID REFERENCES questions(id),
  choice_options JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- LIST TABLE ROWS ---
CREATE TABLE IF NOT EXISTS list_table_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  row_id INTEGER,
  table_id UUID REFERENCES list_tables(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- QUESTION_TAGS (junction) ---
CREATE TABLE IF NOT EXISTS question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, tag_id)
);

-- --- QUESTION_COMPANIES (junction) ---
CREATE TABLE IF NOT EXISTS question_companies (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, company_id)
);

-- --- SECTION_QUESTIONS (junction) ---
CREATE TABLE IF NOT EXISTS section_questions (
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_number INTEGER,
  PRIMARY KEY (section_id, question_id)
);

-- --- QUESTION_CHOICES (junction) ---
CREATE TABLE IF NOT EXISTS question_choices (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_id UUID NOT NULL REFERENCES choices(id) ON DELETE CASCADE,
  order_number INTEGER,
  PRIMARY KEY (question_id, choice_id)
);

-- --- SHEETS ---
CREATE TABLE IF NOT EXISTS sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT NOT NULL,
  name_lower_case TEXT,
  company_id UUID REFERENCES companies(id),
  requesting_company_id UUID REFERENCES companies(id),
  assigned_to_company_id UUID REFERENCES companies(id),
  original_requestor_assoc_id UUID REFERENCES companies(id),
  requestor_name TEXT,
  requestor_email TEXT,
  contact_profile_id UUID REFERENCES users(id),
  stack_id UUID REFERENCES stacks(id),
  new_status TEXT,
  status TEXT DEFAULT 'draft',
  new_name BOOLEAN DEFAULT false,
  unread_comment BOOLEAN DEFAULT false,
  mark_as_archived BOOLEAN DEFAULT false,
  mark_as_test_sheet BOOLEAN DEFAULT false,
  test_being_deleted BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  version_lock BOOLEAN DEFAULT false,
  version_description TEXT,
  version_close_date TIMESTAMPTZ,
  version_closed_by UUID REFERENCES users(id),
  version_count_expected INTEGER,
  version_count_original INTEGER,
  version_count_processed INTEGER,
  father_sheet_id UUID REFERENCES sheets(id),
  prev_sheet_id UUID REFERENCES sheets(id),
  imported_file_url TEXT,
  imported_processed INTEGER,
  imported_to_process INTEGER,
  current_number_of_col_row INTEGER,
  supplier_assignment_log TEXT[],
  created_by UUID REFERENCES users(id),
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sheets_company_id ON sheets(company_id);
CREATE INDEX IF NOT EXISTS idx_sheets_requesting_company_id ON sheets(requesting_company_id);

-- --- SHEET_TAGS (junction) ---
CREATE TABLE IF NOT EXISTS sheet_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sheet_id, tag_id)
);

-- --- SHEET_QUESTIONS (junction) ---
CREATE TABLE IF NOT EXISTS sheet_questions (
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_number INTEGER,
  PRIMARY KEY (sheet_id, question_id)
);

-- --- SHEET_SHAREABLE_COMPANIES (junction) ---
CREATE TABLE IF NOT EXISTS sheet_shareable_companies (
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (sheet_id, company_id)
);

-- --- SHEET_SUPPLIER_USERS_ASSIGNED (junction) ---
CREATE TABLE IF NOT EXISTS sheet_supplier_users_assigned (
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (sheet_id, user_id)
);

-- --- ANSWERS ---
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  answer_name TEXT,
  answer_id_number INTEGER,
  order_number INTEGER,
  sheet_id UUID REFERENCES sheets(id),
  question_id UUID REFERENCES questions(id),
  company_id UUID REFERENCES companies(id),
  supplier_id UUID REFERENCES companies(id),
  customer_id UUID REFERENCES users(id),
  originating_question_id UUID REFERENCES questions(id),
  parent_question_id UUID REFERENCES questions(id),
  choice_id UUID REFERENCES choices(id),
  list_table_column_id UUID REFERENCES list_table_columns(id),
  list_table_row_id TEXT,
  stack_id UUID REFERENCES stacks(id),
  parent_subsection_id UUID REFERENCES subsections(id),
  text_value TEXT,
  text_area_value TEXT,
  number_value NUMERIC,
  boolean_value BOOLEAN,
  date_value DATE,
  file_url TEXT,
  support_file_url TEXT,
  support_text TEXT,
  clarification TEXT,
  custom_comment_text TEXT,
  custom_row_text TEXT,
  import_double_check TEXT,
  version_in_sheet INTEGER,
  version_copied BOOLEAN DEFAULT false,
  additional_notes TEXT,
  created_by UUID REFERENCES users(id),
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_answers_sheet_id ON answers(sheet_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_company_id ON answers(company_id);

-- --- ANSWER_SHAREABLE_COMPANIES (junction) ---
CREATE TABLE IF NOT EXISTS answer_shareable_companies (
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, company_id)
);

-- --- ANSWER_TEXT_CHOICES (junction) ---
CREATE TABLE IF NOT EXISTS answer_text_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  text_choice TEXT NOT NULL,
  order_number INTEGER
);

-- --- ANSWER_REJECTIONS ---
CREATE TABLE IF NOT EXISTS answer_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  answer_id UUID REFERENCES answers(id),
  reason TEXT,
  rejected_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- --- ANSWER_FLAGS ---
CREATE TABLE IF NOT EXISTS answer_flags (
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

-- --- ANSWER_DOCUMENTS ---
CREATE TABLE IF NOT EXISTS answer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES answers(id),
  document_type TEXT CHECK (document_type IN ('primary', 'support')),
  file_url TEXT NOT NULL,
  filename TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES users(id)
);

-- --- SHEET_STATUSES ---
CREATE TABLE IF NOT EXISTS sheet_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  sheet_name TEXT,
  sheet_id UUID REFERENCES sheets(id),
  company_id UUID REFERENCES companies(id),
  supplier_id UUID REFERENCES companies(id),
  father_of_sheet_id UUID REFERENCES sheets(id),
  status TEXT,
  completed BOOLEAN DEFAULT false,
  complete_text TEXT,
  observations TEXT,
  version INTEGER,
  father_of_sheet_version INTEGER,
  reminders_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- --- REQUESTS ---
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  product_name TEXT,
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
  requestor_id UUID REFERENCES companies(id),
  requesting_from_id UUID REFERENCES companies(id),
  owner_company_id UUID REFERENCES companies(id),
  reader_company_id UUID REFERENCES companies(id),
  processed BOOLEAN DEFAULT false,
  manufacturer_marked_as_provided BOOLEAN DEFAULT false,
  show_as_removed BOOLEAN DEFAULT false,
  comment_requestor TEXT,
  comment_supplier TEXT,
  creator_email TEXT,
  status TEXT DEFAULT 'Created',
  notes TEXT,
  first_shared_date TIMESTAMPTZ,
  last_share_date TIMESTAMPTZ,
  days_to_first_share INTEGER,
  days_to_last_share INTEGER,
  first_shared_date_2 TIMESTAMPTZ,
  last_share_date_2 TIMESTAMPTZ,
  days_to_first_share_2 INTEGER,
  days_to_last_share_2 INTEGER,
  created_by UUID REFERENCES users(id),
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_sheet_id ON requests(sheet_id);
CREATE INDEX IF NOT EXISTS idx_requests_requestor_id ON requests(requestor_id);
CREATE INDEX IF NOT EXISTS idx_requests_requesting_from_id ON requests(requesting_from_id);
CREATE INDEX IF NOT EXISTS idx_requests_owner_company ON requests(owner_company_id);
CREATE INDEX IF NOT EXISTS idx_requests_reader_company ON requests(reader_company_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- --- REQUEST_TAGS (junction) ---
CREATE TABLE IF NOT EXISTS request_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_request_tags_request ON request_tags(request_id);
CREATE INDEX IF NOT EXISTS idx_request_tags_tag ON request_tags(tag_id);

-- --- INVITATIONS ---
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_name TEXT,
  company_id UUID REFERENCES companies(id),
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  invitation_type TEXT DEFAULT 'supplier',
  trial_batch_id UUID,  -- FK added after trial_batches
  notes TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(invitation_type);

-- --- CHEMICAL_INVENTORY ---
CREATE TABLE IF NOT EXISTS chemical_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cas_number TEXT UNIQUE NOT NULL,
  pubchem_cid INTEGER,
  chemical_name TEXT,
  molecular_formula TEXT,
  molecular_weight NUMERIC,
  synonyms TEXT[],
  iupac_name TEXT,
  inchi_key TEXT,
  is_pfas BOOLEAN DEFAULT false,
  is_reach_svhc BOOLEAN DEFAULT false,
  is_prop65 BOOLEAN DEFAULT false,
  is_epa_tosca BOOLEAN DEFAULT false,
  is_rohs BOOLEAN DEFAULT false,
  is_food_contact_restricted BOOLEAN DEFAULT false,
  risk_level TEXT CHECK (risk_level IN ('high', 'medium', 'low')),
  warnings TEXT[],
  restrictions TEXT[],
  hazards TEXT[],
  last_updated TIMESTAMPTZ DEFAULT now(),
  data_source TEXT DEFAULT 'pubchem',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chemical_inventory_cas ON chemical_inventory(cas_number);

-- --- SHEET_CHEMICALS ---
CREATE TABLE IF NOT EXISTS sheet_chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  chemical_id UUID NOT NULL REFERENCES chemical_inventory(id) ON DELETE CASCADE,
  concentration NUMERIC,
  concentration_unit TEXT,
  list_table_row_id UUID,
  answer_id UUID REFERENCES answers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sheet_id, chemical_id, list_table_row_id)
);

CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_sheet ON sheet_chemicals(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_chemicals_chemical ON sheet_chemicals(chemical_id);

-- --- QUESTION_COMMENTS ---
CREATE TABLE IF NOT EXISTS question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_comments_sheet_question ON question_comments(sheet_id, question_id);

-- --- _MIGRATION_ID_MAP ---
CREATE TABLE IF NOT EXISTS _migration_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT NOT NULL,
  supabase_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bubble_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_migration_id_map_bubble ON _migration_id_map(bubble_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_migration_id_map_supabase ON _migration_id_map(supabase_id, entity_type);

-- --- TRIAL_ISSUES ---
CREATE TABLE IF NOT EXISTS trial_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  reporter_email TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- --- TRIAL_BATCHES ---
CREATE TABLE IF NOT EXISTS trial_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  accepted_count INTEGER DEFAULT 0
);

-- Add FK from invitations to trial_batches now
DO $$ BEGIN
  ALTER TABLE invitations ADD CONSTRAINT fk_invitations_trial_batch
    FOREIGN KEY (trial_batch_id) REFERENCES trial_batches(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_invitations_batch ON invitations(trial_batch_id);

-- --- TRIAL_DISCOVERY_RESPONSES ---
CREATE TABLE IF NOT EXISTS trial_discovery_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  invitation_id UUID REFERENCES invitations(id),
  responded_at TIMESTAMPTZ DEFAULT now(),
  motivation_interest TEXT,
  learning_goals TEXT,
  success_definition TEXT,
  impact_measurement TEXT,
  concerns_questions TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_completed_at TIMESTAMPTZ,
  follow_up_sent_at TIMESTAMPTZ,
  follow_up_responded_at TIMESTAMPTZ,
  platform_experience TEXT,
  biggest_surprise TEXT,
  remaining_questions TEXT,
  likelihood_to_recommend INTEGER CHECK (likelihood_to_recommend BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_discovery_email ON trial_discovery_responses(email);

-- --- TRIAL_ACTIVITY_EVENTS ---
CREATE TABLE IF NOT EXISTS trial_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_activity_user_id ON trial_activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_activity_email ON trial_activity_events(email);
CREATE INDEX IF NOT EXISTS idx_trial_activity_event_type ON trial_activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trial_activity_created_at ON trial_activity_events(created_at DESC);

-- --- CANONICAL_PARAMETERS ---
CREATE TABLE IF NOT EXISTS canonical_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  subsection TEXT,
  description TEXT,
  data_type TEXT,
  unit TEXT,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  polarity TEXT DEFAULT 'neutral',
  legacy_question_id UUID REFERENCES questions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canonical_params_legacy_q ON canonical_parameters(legacy_question_id);

-- --- CANONICAL_PARAMETER_TAGS (junction) ---
CREATE TABLE IF NOT EXISTS canonical_parameter_tags (
  tag_id UUID NOT NULL REFERENCES tags(id),
  canonical_parameter_id UUID NOT NULL REFERENCES canonical_parameters(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tag_id, canonical_parameter_id)
);

CREATE INDEX IF NOT EXISTS idx_cpt_tag ON canonical_parameter_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_cpt_param ON canonical_parameter_tags(canonical_parameter_id);

-- --- NORMALIZATION_MAPPINGS ---
CREATE TABLE IF NOT EXISTS normalization_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_parameter_id UUID REFERENCES canonical_parameters(id),
  legacy_question_id UUID REFERENCES questions(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --- CANONICAL_ANSWER_LINKS ---
CREATE TABLE IF NOT EXISTS canonical_answer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_parameter_id UUID REFERENCES canonical_parameters(id),
  answer_id UUID REFERENCES answers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Additional junction/utility tables from base schema
CREATE TABLE IF NOT EXISTS packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS answer_packets (
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  packet_id UUID NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, packet_id)
);

CREATE TABLE IF NOT EXISTS sheet_packets (
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  packet_id UUID NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  PRIMARY KEY (sheet_id, packet_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  event_type TEXT NOT NULL,
  sheet_id UUID REFERENCES sheets(id),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stack_sections (
  stack_id UUID REFERENCES stacks(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  order_number INTEGER,
  PRIMARY KEY (stack_id, section_id)
);

CREATE TABLE IF NOT EXISTS tag_stacks (
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  stack_id UUID REFERENCES stacks(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, stack_id)
);

CREATE TABLE IF NOT EXISTS company_employees (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS company_members (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, user_id)
);

-- ============================================================================
-- 3. Helper Functions
-- ============================================================================

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS helper functions (public schema only -- auth schema is restricted in Supabase)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.users WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid AS $$
  SELECT company_id
  FROM public.users
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_company_id() TO authenticated;

-- question_comments updated_at trigger
CREATE OR REPLACE FUNCTION update_question_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_question_comments_updated_at ON question_comments;
CREATE TRIGGER trigger_question_comments_updated_at
  BEFORE UPDATE ON question_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_question_comments_updated_at();

-- requests updated_at trigger
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Views
-- ============================================================================

CREATE OR REPLACE VIEW sheet_answers_display AS
WITH
ranked_single_answers AS (
  SELECT
    a.id, a.sheet_id, a.question_id,
    a.text_value, a.number_value, a.boolean_value, a.date_value,
    a.choice_id, a.additional_notes,
    a.list_table_row_id, a.list_table_column_id,
    a.created_at, a.modified_at,
    q.name as question_name, q.content as question_content,
    q.response_type, q.section_sort_number, q.subsection_sort_number,
    q.order_number as question_order,
    c.content as choice_content,
    NULL::text as list_table_column_name,
    NULL::integer as list_table_column_order,
    NULL::text as list_table_column_response_type,
    NULL::jsonb as list_table_column_choice_options,
    ROW_NUMBER() OVER (
      PARTITION BY a.sheet_id, a.question_id
      ORDER BY a.modified_at DESC NULLS LAST
    ) as rn
  FROM answers a
  JOIN questions q ON a.question_id = q.id
  LEFT JOIN choices c ON a.choice_id = c.id
  WHERE a.list_table_row_id IS NULL
),
ranked_list_table_answers AS (
  SELECT
    a.id, a.sheet_id, a.question_id,
    a.text_value, a.number_value, a.boolean_value, a.date_value,
    a.choice_id, a.additional_notes,
    a.list_table_row_id, a.list_table_column_id,
    a.created_at, a.modified_at,
    q.name as question_name, q.content as question_content,
    q.response_type, q.section_sort_number, q.subsection_sort_number,
    q.order_number as question_order,
    c.content as choice_content,
    ltc.name as list_table_column_name,
    ltc.order_number as list_table_column_order,
    ltc.response_type as list_table_column_response_type,
    ltc.choice_options as list_table_column_choice_options,
    ROW_NUMBER() OVER (
      PARTITION BY a.sheet_id, a.question_id, a.list_table_row_id, a.list_table_column_id
      ORDER BY a.modified_at DESC NULLS LAST
    ) as rn
  FROM answers a
  JOIN questions q ON a.question_id = q.id
  LEFT JOIN choices c ON a.choice_id = c.id
  LEFT JOIN list_table_columns ltc ON a.list_table_column_id = ltc.id
  WHERE a.list_table_row_id IS NOT NULL
)
SELECT id, sheet_id, question_id, text_value, number_value, boolean_value,
  date_value, choice_id, additional_notes, list_table_row_id, list_table_column_id,
  created_at, modified_at, question_name, question_content, response_type,
  section_sort_number, subsection_sort_number, question_order, choice_content,
  list_table_column_name, list_table_column_order, list_table_column_response_type,
  list_table_column_choice_options
FROM ranked_single_answers WHERE rn = 1
UNION ALL
SELECT id, sheet_id, question_id, text_value, number_value, boolean_value,
  date_value, choice_id, additional_notes, list_table_row_id, list_table_column_id,
  created_at, modified_at, question_name, question_content, response_type,
  section_sort_number, subsection_sort_number, question_order, choice_content,
  list_table_column_name, list_table_column_order, list_table_column_response_type,
  list_table_column_choice_options
FROM ranked_list_table_answers WHERE rn = 1;

-- Request views
CREATE OR REPLACE VIEW pending_requests AS
SELECT
  r.*,
  oc.name as owner_company_name,
  rc.name as reader_company_name,
  s.name as sheet_name,
  u.full_name as created_by_name
FROM requests r
LEFT JOIN companies oc ON r.owner_company_id = oc.id
LEFT JOIN companies rc ON r.reader_company_id = rc.id
LEFT JOIN sheets s ON r.sheet_id = s.id
LEFT JOIN users u ON r.created_by = u.id
WHERE r.status IN ('Created', 'Reviewed');

CREATE OR REPLACE VIEW approved_requests AS
SELECT
  r.*,
  oc.name as owner_company_name,
  rc.name as reader_company_name,
  s.name as sheet_name,
  u.full_name as created_by_name
FROM requests r
LEFT JOIN companies oc ON r.owner_company_id = oc.id
LEFT JOIN companies rc ON r.reader_company_id = rc.id
LEFT JOIN sheets s ON r.sheet_id = s.id
LEFT JOIN users u ON r.created_by = u.id
WHERE r.status = 'Approved';

-- ============================================================================
-- 5. RLS - Enable on all tables, start with open read for dev
-- ============================================================================

ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_table_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_table_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_discovery_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_parameter_tags ENABLE ROW LEVEL SECURITY;

-- Dev-friendly: authenticated users can read everything
-- (mirrors production structure tables, relaxed for dev)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'associations', 'stacks', 'companies', 'users', 'tags', 'sections',
      'subsections', 'questions', 'choices', 'list_table_columns', 'list_table_rows',
      'list_tables', 'sheets', 'answers', 'answer_rejections', 'sheet_statuses',
      'requests', 'request_tags', 'question_tags', 'sheet_tags', 'invitations',
      'chemical_inventory', 'sheet_chemicals', 'question_comments',
      'trial_issues', 'trial_batches', 'trial_discovery_responses',
      'trial_activity_events', 'canonical_parameters', 'canonical_parameter_tags'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "dev_authenticated_select" ON %I FOR SELECT TO authenticated USING (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "dev_authenticated_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "dev_authenticated_update" ON %I FOR UPDATE TO authenticated USING (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "dev_authenticated_delete" ON %I FOR DELETE TO authenticated USING (true)',
      tbl
    );
  END LOOP;
END $$;

-- Service role bypass (needed for seed scripts)
-- Service role already bypasses RLS by default in Supabase, so no explicit policies needed.

-- ============================================================================
-- 6. Done
-- ============================================================================
-- After running this, execute the seed script:
--   cd stacks && npx tsx seed-dev-db.ts
