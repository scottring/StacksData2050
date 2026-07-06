-- Dev-only: creates canonical_answer_types and canonical_reference_substances,
-- which exist on prod (backing /parameters) but were never applied to dev.
-- Schema mirrors the original design in 20260304000001_canonical_parameters.sql
-- (columns verified against prod row samples via read-only introspection).
-- canonical_parameters already exists on dev and is untouched here.
-- DEV-ONLY: running this on prod would enable RLS on live tables (access-affecting).

CREATE TABLE IF NOT EXISTS canonical_answer_types (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  options     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_canonical_ref_substances_cas ON canonical_reference_substances(cas_number);

ALTER TABLE canonical_answer_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_reference_substances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read canonical_answer_types" ON canonical_answer_types;
CREATE POLICY "Authenticated users can read canonical_answer_types"
  ON canonical_answer_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read canonical_reference_substances" ON canonical_reference_substances;
CREATE POLICY "Authenticated users can read canonical_reference_substances"
  ON canonical_reference_substances FOR SELECT
  TO authenticated
  USING (true);
