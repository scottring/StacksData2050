-- ============================================================================
-- Stacks Data 2050 -- Core-table schema reconciliation (dev -> prod)
-- ============================================================================
-- Generated 2026-07-06/07. Method, code-driven and evidence-based:
--   1. Inventoried every column the rebuild/v2 app code selects / inserts /
--      updates on the seven core tables (requests, sheets, answers, users,
--      companies, choices, questions) by grepping src/ for .from('<table>')
--      and collecting the column lists from select strings and insert/update
--      payload objects. Main consumers: the station mapping route, the
--      answers routes (single + batch), the command/station pages, the
--      export lib (src/lib/export/sheet-data.ts), compliance-stats, the
--      contacts API, and settings/users.
--   2. Probed PROD read-only for each collected column (GET select <col>
--      limit 1; error 42703 = missing) and cross-checked DEV the same way.
--      Also probed the PostgREST relationship embeds the code relies on.
--   3. This file adds ONLY what is missing in prod AND exercised by
--      rebuild/v2 code. Strictly additive and idempotent: ADD COLUMN IF NOT
--      EXISTS, guarded FK constraints, one data backfill where prod already
--      holds the data under another name. NO drops, NO renames, NO type
--      changes. Types match dev's src/lib/database.types.ts (string -> text,
--      boolean -> boolean, FK ids -> uuid).
--
-- Apply to prod at cutover as Step 2b (see README.md), AFTER 01-schema.sql.
-- Rerun-safe.
--
-- ----------------------------------------------------------------------------
-- Probe results at authoring time (prod, read-only, 2026-07-06/07):
--
-- MISSING in prod, used by rebuild/v2 code, ADDED below (19 columns):
--   answers.clarification            (answers routes write it)
--   answers.text_area_value          (answers routes, mapping, ingest match)
--   answers.file_url                 (mapping route select, parameter-mapper)
--   answers.parent_question_id       (export lib select + legacy fallback)
--   answers.originating_question_id  (export lib select + legacy fallback)
--   questions.question_type          (mapping route, export lib)
--   questions.section_name_sort      (mapping route, ingest match embed)
--   questions.subsection_name_sort   (mapping route, ingest match embed)
--   questions.optional_question      (mapping route)
--   questions.clarification          (mapping route)
--   questions.list_table_id          (export lib)
--   questions.parent_section_id      (export lib + compliance-stats embeds; FK added)
--   questions.parent_subsection_id   (export lib embed; FK added)
--   companies.location_text          (command network route, customer/supplier pages; backfilled from companies.location)
--   requests.product_name            (command page, station page, review pages)
--   requests.comment_requestor       (command page, station page)
--   users.first_name                 (contacts API, settings/users)
--   users.last_name                  (contacts API, settings/users)
--   users.phone_text                 (contacts API)
--
-- MISSING in prod, NOT added (probed, but no rebuild/v2 code reads or
-- writes them; adding them would be speculation, not reconciliation):
--   answers.support_file_url, answers.support_text, companies.show_as_supplier,
--   requests.status, choices.parent_question_id (code uses choices.question_id,
--   which IS present in prod)
--
-- MISSING in BOTH dev and prod (app-code bugs, not schema drift; adding a
-- column dev does not have would create new drift, so these are flagged for
-- code fixes instead):
--   answers.parent_sheet_id  (selected by src/lib/compliance-stats.ts; that
--     select errors in both environments today)
--   users.name               (selected by stacks/seed-sappi-workflow.ts's
--     role-assignment lookup; see 03-seed-plants.md)
--
-- PRESENT in prod already (probed, no action): answers.additional_notes,
-- answers.list_table_row_id/list_table_column_id/question_id/choice_id/
-- company_id/created_by/modified_at; questions.subsection_id/
-- section_sort_number/subsection_sort_number/order_number/required/name/
-- response_type/content/created_at; companies.logo_url; requests.processed/
-- requestor_id/requesting_from_id/sheet_id/created_by; sheets.status/version/
-- requesting_company_id/created_by/import_source/modified_at; choices.
-- question_id/content/order_number; users.full_name/job_title/
-- is_company_main_contact/has_logged_in/is_super_admin/role/company_id/email.
--
-- Relationship embeds probed on prod: questions->subsections OK,
-- answers->choices OK, answers->questions (answers_question_id_fkey) OK,
-- requests->sheets OK, requests->companies (both hints) OK, sheets->companies
-- (both named FKs) OK. The one broken embed was questions->sections
-- (PGRST200: no relationship), fixed below by the parent_section_id FK.
--
-- KNOWN SIDE EFFECT of the parent_subsection_id FK: once questions has TWO
-- FKs to subsections (the pre-existing questions_subsection_id_fkey plus the
-- new questions_parent_subsection_id_fkey), any UNHINTED
-- `subsections( ... )` embed on questions becomes ambiguous and fails with
-- PGRST201. Verified live in dev, which already carries both FKs: the
-- unhinted embed errors there today. Mitigation shipped with this file's
-- commit: the two consumers of the unhinted embed
-- (src/app/sheets/[id]/page.tsx and src/app/sheets/[id]/edit/page.tsx) now
-- hint it as `subsections!questions_subsection_id_fkey( ... )`, which was
-- probed working on BOTH prod (single-FK, pre-05) and dev (dual-FK). The
-- runbook (README.md Step 2b) sequences this file immediately before the
-- code deploy to keep the window between FK creation and hinted-code deploy
-- to minutes, and documents the rollback interaction.
--
-- Data-population note (honest scope limit): in DEV these question metadata
-- columns are structurally present but almost entirely NULL (question_type,
-- clarification, list_table_id, section_name_sort, subsection_name_sort,
-- parent_section_id, parent_subsection_id all 0 non-null rows of 201
-- questions; optional_question 201 non-null). The app code tolerates NULLs
-- in all of them. This file restores COLUMN PARITY so selects stop erroring
-- with 42703; it does not invent data neither environment has.
-- ============================================================================


-- ============================================================================
-- SECTION 1: answers
-- ============================================================================
ALTER TABLE answers ADD COLUMN IF NOT EXISTS clarification text;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS text_area_value text;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS parent_question_id uuid;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS originating_question_id uuid;

-- ============================================================================
-- SECTION 2: questions
-- ============================================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS section_name_sort text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subsection_name_sort text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS optional_question boolean;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS clarification text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS list_table_id uuid;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS parent_section_id uuid;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS parent_subsection_id uuid;

-- FK constraints so the PostgREST embeds the code uses actually resolve:
--   export lib:        sections:parent_section_id(...), subsections:parent_subsection_id(...)
--   compliance-stats:  sections!inner(name)
-- Safe: both columns are brand new (all NULL), so the constraints cannot be
-- violated by existing data. Guarded for rerun safety. sections (21 rows)
-- and subsections (80 rows) verified present in prod.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_parent_section_id_fkey'
      AND conrelid = 'questions'::regclass
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT questions_parent_section_id_fkey
      FOREIGN KEY (parent_section_id) REFERENCES sections(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_parent_subsection_id_fkey'
      AND conrelid = 'questions'::regclass
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT questions_parent_subsection_id_fkey
      FOREIGN KEY (parent_subsection_id) REFERENCES subsections(id);
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: companies (with backfill: prod holds the data as `location`)
-- ============================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location_text text;

-- Backfill: prod's `location` column (29 non-null rows at authoring time)
-- carries the value the code reads as `location_text`. Idempotent: only
-- fills rows where location_text is still NULL. `location` itself is left
-- untouched (no drops, no renames).
UPDATE companies SET location_text = location WHERE location_text IS NULL AND location IS NOT NULL;

-- ============================================================================
-- SECTION 4: requests
-- ============================================================================
ALTER TABLE requests ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS comment_requestor text;

-- ============================================================================
-- SECTION 5: users
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_text text;

-- ============================================================================
-- SECTION 6: what this file deliberately does NOT do
-- ============================================================================
-- - No changes to sheets or choices: every column rebuild/v2 code uses on
--   those two tables is already present in prod (probed).
-- - No backfill of the questions metadata columns: dev, the reference
--   environment, has them NULL too (see header). Populating prod question
--   metadata (e.g. section_name_sort for the mapping route) is a data task
--   for the go/no-go gate discussion, not a schema file.
-- - No RLS changes on any core table (same boundary as 01-schema.sql).
-- - No fix for the two both-environments code bugs noted in the header
--   (answers.parent_sheet_id in compliance-stats, users.name in
--   seed-sappi-workflow); those need code changes, not columns.
-- ============================================================================
