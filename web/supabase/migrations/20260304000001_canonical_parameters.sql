-- Phase 1: Canonical Parameter Library
-- Seeds the foundation for CDR convergence.
-- These tables live alongside existing questions/answers/sheets (no modifications to those).

-- 1. Answer type schemas (18 dropdown patterns from HQ 2.1 Drop-Downs tab)
CREATE TABLE IF NOT EXISTS canonical_answer_types (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  options     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. Canonical parameters (~80 questions from 5 HQ 2.1 tabs)
CREATE TABLE IF NOT EXISTS canonical_parameters (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text UNIQUE NOT NULL,
  section             text NOT NULL,
  subsection          text,
  name                text NOT NULL,
  description         text,
  jurisdiction        text,
  answer_type_code    text NOT NULL REFERENCES canonical_answer_types(code),
  answer_pattern      text NOT NULL DEFAULT 'simple',
  detail_table_schema jsonb,
  sort_order          integer,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),

  CONSTRAINT valid_answer_pattern CHECK (answer_pattern IN ('simple', 'with_detail_table'))
);

-- 3. PIDSL reference substances (~230+ declarable substances)
CREATE TABLE IF NOT EXISTS canonical_reference_substances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cas_number            text,
  ec_number             text,
  chemical_name         text NOT NULL,
  reason                text,
  application           text,
  declaration_level_ppm text,
  sort_order            integer,
  is_active             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canonical_params_section ON canonical_parameters(section);
CREATE INDEX IF NOT EXISTS idx_canonical_params_answer_type ON canonical_parameters(answer_type_code);
CREATE INDEX IF NOT EXISTS idx_canonical_ref_substances_cas ON canonical_reference_substances(cas_number);

-- RLS
ALTER TABLE canonical_answer_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_reference_substances ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Authenticated users can read canonical_answer_types"
  ON canonical_answer_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read canonical_parameters"
  ON canonical_parameters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read canonical_reference_substances"
  ON canonical_reference_substances FOR SELECT
  TO authenticated
  USING (true);

-- Service role has full access by default (bypasses RLS)
