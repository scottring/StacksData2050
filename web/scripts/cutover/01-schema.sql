-- ============================================================================
-- Stacks Data 2050 -- Production Cutover Schema
-- ============================================================================
-- Assembled for the rebuild/v2 -> production cutover. Applies to PROD.
--
-- Idempotent by construction: every CREATE TABLE / CREATE INDEX uses
-- IF NOT EXISTS, every CREATE POLICY is preceded by DROP POLICY IF EXISTS,
-- and column additions use ADD COLUMN IF NOT EXISTS. Safe to run more than
-- once against the same database.
--
-- Sources adapted:
--   1. src/lib/pipeline/migration.sql            (pipeline tables)
--   2. supabase/migrations/20260421000002_product_introduction_workflow.sql
--   3. supabase/migrations/20260422000001_workflow_conditions_nullable_role.sql
--   4. supabase/migrations/20260422000002_workflow_zone_data.sql
--   5. supabase/migrations/20260706000003_notifications_columns.sql
--   6. supabase/migrations/20260706000002_pipeline_storage_policies.sql
--      (table-level DELETE policies only; the storage.objects policies in
--      that file are applied separately, see 02-buckets-and-storage-policies.ts)
--
-- What changed vs. the dev migrations: every dev-grade
-- `USING (auth.uid() IS NOT NULL)` table policy on a company-owned resource
-- is tightened to company scoping. Reference-data policies (regulatory
-- frameworks/rules, readable by any authenticated user by design) are left
-- as `USING (true)` but still wrapped in DROP POLICY IF EXISTS for rerun
-- safety. See Section 5 for what this file deliberately does not change.
--
-- Apply via: supabase CLI linked to prod (`supabase db push` or the SQL
-- editor's "run" against a pasted copy of this file). Prod already has the
-- pipeline tables with data; the CREATE TABLE IF NOT EXISTS statements below
-- are no-ops there. The policy statements are the real change.
-- ============================================================================


-- ============================================================================
-- SECTION 1: Pipeline tables (extraction, compliance, generated documents)
-- Adapted from src/lib/pipeline/migration.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 extraction_documents
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extraction_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,          -- soft FK to companies(id)
  uploaded_by UUID,         -- soft FK to users(id)

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  document_type TEXT NOT NULL CHECK (document_type IN ('sds', 'coa', 'lab_report', 'sap_csv', 'questionnaire', 'questionnaire_filled', 'other')),

  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'extracted', 'confirmed', 'failed', 'superseded')),

  extraction_model TEXT,
  extraction_prompt_version TEXT,
  extraction_started_at TIMESTAMPTZ,
  extraction_completed_at TIMESTAMPTZ,
  extraction_duration_ms INTEGER,
  extraction_token_count INTEGER,
  extraction_error TEXT,

  raw_extraction JSONB,

  sheet_id UUID,            -- soft FK to sheets(id)
  product_name TEXT,
  supplier_name TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_documents_company ON extraction_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_extraction_documents_status ON extraction_documents(status);
CREATE INDEX IF NOT EXISTS idx_extraction_documents_sheet ON extraction_documents(sheet_id);

-- ----------------------------------------------------------------------------
-- 1.2 extraction_items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extraction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES extraction_documents(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL CHECK (item_type IN ('chemical', 'hazard', 'test_result', 'traceability', 'physical_property', 'question_requirement', 'questionnaire_metadata')),

  data JSONB NOT NULL,

  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  reviewed BOOLEAN DEFAULT false,
  review_status TEXT CHECK (review_status IN ('accepted', 'modified', 'rejected')),
  reviewed_by UUID,         -- soft FK to users(id)
  reviewed_at TIMESTAMPTZ,

  original_data JSONB,

  chemical_id UUID,         -- soft FK to chemical_inventory(id)

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_items_document ON extraction_items(document_id);
CREATE INDEX IF NOT EXISTS idx_extraction_items_type ON extraction_items(item_type);
CREATE INDEX IF NOT EXISTS idx_extraction_items_chemical ON extraction_items(chemical_id);

-- ----------------------------------------------------------------------------
-- 1.3 regulatory_frameworks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regulatory_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  description TEXT,
  effective_date DATE,
  version TEXT,
  url TEXT,
  flag_emoji TEXT,
  color TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1.4 regulatory_rules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regulatory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES regulatory_frameworks(id),

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  rule_type TEXT NOT NULL CHECK (rule_type IN ('cas_list', 'concentration_threshold', 'property_check', 'custom')),

  rule_config JSONB NOT NULL,

  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('block', 'fail', 'warning', 'info')),

  message_template TEXT,
  remediation_text TEXT,

  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(framework_id, code)
);

CREATE INDEX IF NOT EXISTS idx_regulatory_rules_framework ON regulatory_rules(framework_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_type ON regulatory_rules(rule_type);

-- ----------------------------------------------------------------------------
-- 1.5 compliance_assessments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sheet_id UUID,            -- soft FK to sheets(id)
  company_id UUID,          -- soft FK to companies(id)
  product_name TEXT,

  assessed_by UUID,         -- soft FK to users(id)
  assessed_at TIMESTAMPTZ DEFAULT now(),
  assessment_type TEXT NOT NULL DEFAULT 'automatic' CHECK (assessment_type IN ('automatic', 'manual', 'hybrid')),

  overall_status TEXT NOT NULL DEFAULT 'pending' CHECK (overall_status IN ('pass', 'fail', 'warning', 'pending', 'incomplete')),

  total_rules_evaluated INTEGER DEFAULT 0,
  rules_passed INTEGER DEFAULT 0,
  rules_failed INTEGER DEFAULT 0,
  rules_warning INTEGER DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_assessments_sheet ON compliance_assessments(sheet_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_company ON compliance_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_status ON compliance_assessments(overall_status);

-- ----------------------------------------------------------------------------
-- 1.6 compliance_results
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,

  rule_id UUID,             -- FK to regulatory_rules(id) when rules exist in DB
  framework_id UUID,        -- FK to regulatory_frameworks(id) when frameworks exist in DB

  rule_code TEXT,
  framework_code TEXT,

  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'not_applicable', 'insufficient_data')),

  triggered_by JSONB,
  message TEXT,

  overridden BOOLEAN DEFAULT false,
  override_reason TEXT,
  overridden_by UUID,       -- soft FK to users(id)
  overridden_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_results_assessment ON compliance_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_rule ON compliance_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_compliance_results_status ON compliance_results(status);

-- ----------------------------------------------------------------------------
-- 1.7 generated_documents
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  assessment_id UUID REFERENCES compliance_assessments(id),
  sheet_id UUID,            -- soft FK to sheets(id)
  company_id UUID,          -- soft FK to companies(id)

  document_type TEXT NOT NULL CHECK (document_type IN ('reach_svhc_declaration', 'fda_compliance_letter', 'dpp_json_ld', 'china_gb_certificate')),

  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,

  template_version TEXT,
  language TEXT DEFAULT 'en',

  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed', 'expired')),

  generated_by UUID,        -- soft FK to users(id)
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,

  dpp_credential JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_assessment ON generated_documents(assessment_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_sheet ON generated_documents(sheet_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(document_type);

-- ----------------------------------------------------------------------------
-- 1.8 Enable RLS (idempotent: re-enabling on an already-RLS table is a no-op)
-- ----------------------------------------------------------------------------
ALTER TABLE extraction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1.9 Policies -- COMPANY SCOPED (this is the real change vs. dev)
-- ----------------------------------------------------------------------------

-- extraction_documents: direct company_id column ------------------------------
DROP POLICY IF EXISTS "Users can view their company extraction documents" ON extraction_documents;
CREATE POLICY "Users can view their company extraction documents"
  ON extraction_documents FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert extraction documents" ON extraction_documents;
CREATE POLICY "Users can insert extraction documents"
  ON extraction_documents FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update extraction documents" ON extraction_documents;
CREATE POLICY "Users can update extraction documents"
  ON extraction_documents FOR UPDATE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- DELETE policy: originally introduced in 20260706000002 (dev discovered the
-- real DELETE route silently no-op'd under RLS with no DELETE policy at all).
-- Table-level policy, tightened here to company scoping like the rest.
DROP POLICY IF EXISTS "Users can delete extraction documents" ON extraction_documents;
CREATE POLICY "Users can delete extraction documents"
  ON extraction_documents FOR DELETE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- extraction_items: scoped via the parent document's company -----------------
DROP POLICY IF EXISTS "Users can view extraction items" ON extraction_items;
CREATE POLICY "Users can view extraction items"
  ON extraction_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM extraction_documents d
      WHERE d.id = extraction_items.document_id
        AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert extraction items" ON extraction_items;
CREATE POLICY "Users can insert extraction items"
  ON extraction_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM extraction_documents d
      WHERE d.id = extraction_items.document_id
        AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update extraction items" ON extraction_items;
CREATE POLICY "Users can update extraction items"
  ON extraction_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM extraction_documents d
      WHERE d.id = extraction_items.document_id
        AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete extraction items" ON extraction_items;
CREATE POLICY "Users can delete extraction items"
  ON extraction_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM extraction_documents d
      WHERE d.id = extraction_items.document_id
        AND d.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- regulatory_frameworks / regulatory_rules: intentionally public reference
-- data for any authenticated user. Not tightened (nothing to scope to), only
-- wrapped for rerun safety. -------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view regulatory frameworks" ON regulatory_frameworks;
CREATE POLICY "Anyone can view regulatory frameworks"
  ON regulatory_frameworks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view regulatory rules" ON regulatory_rules;
CREATE POLICY "Anyone can view regulatory rules"
  ON regulatory_rules FOR SELECT
  USING (true);

-- compliance_assessments: direct company_id column ---------------------------
DROP POLICY IF EXISTS "Users can view compliance assessments" ON compliance_assessments;
CREATE POLICY "Users can view compliance assessments"
  ON compliance_assessments FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert compliance assessments" ON compliance_assessments;
CREATE POLICY "Users can insert compliance assessments"
  ON compliance_assessments FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update compliance assessments" ON compliance_assessments;
CREATE POLICY "Users can update compliance assessments"
  ON compliance_assessments FOR UPDATE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- compliance_results: scoped via the parent assessment's company ------------
-- The original migration.sql defines SELECT, INSERT, and UPDATE policies on
-- this table (the UPDATE backs api/compliance/results/[id]/override); all
-- three are tightened to company scoping here.
DROP POLICY IF EXISTS "Users can view compliance results" ON compliance_results;
CREATE POLICY "Users can view compliance results"
  ON compliance_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM compliance_assessments a
      WHERE a.id = compliance_results.assessment_id
        AND a.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert compliance results" ON compliance_results;
CREATE POLICY "Users can insert compliance results"
  ON compliance_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM compliance_assessments a
      WHERE a.id = compliance_results.assessment_id
        AND a.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update compliance results" ON compliance_results;
CREATE POLICY "Users can update compliance results"
  ON compliance_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM compliance_assessments a
      WHERE a.id = compliance_results.assessment_id
        AND a.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- generated_documents: direct company_id column ------------------------------
DROP POLICY IF EXISTS "Users can view generated documents" ON generated_documents;
CREATE POLICY "Users can view generated documents"
  ON generated_documents FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert generated documents" ON generated_documents;
CREATE POLICY "Users can insert generated documents"
  ON generated_documents FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 1.10 Seed regulatory frameworks (reference data, safe to re-run)
-- ----------------------------------------------------------------------------
INSERT INTO regulatory_frameworks (code, name, jurisdiction, flag_emoji, color, description, version) VALUES
  ('reach', 'REACH', 'EU', '🇪🇺', 'blue', 'Registration, Evaluation, Authorisation and Restriction of Chemicals (EC 1907/2006)', 'SVHC Candidate List 2025'),
  ('tsca', 'TSCA', 'US', '🇺🇸', 'red', 'Toxic Substances Control Act + California Proposition 65', '2024'),
  ('china_epa', 'China EPA', 'CN', '🇨🇳', 'rose', 'China MEE regulations including IECSC inventory and GB 9685-2016 for food contact', 'GB 9685-2016'),
  ('k_reach', 'K-REACH', 'KR', '🇰🇷', 'sky', 'Korean Registration and Evaluation of Chemicals Act', 'KECL 2024'),
  ('dpp', 'Digital Product Passport', 'EU', '🇪🇺', 'emerald', 'EU Ecodesign for Sustainable Products Regulation (ESPR 2024/1781)', 'ESPR 2024'),
  ('bfr', 'BfR Recommendations', 'DE', '🇩🇪', 'amber', 'German Federal Institute for Risk Assessment recommendations for food contact materials', 'Rec. XXXVI 2024')
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- SECTION 2: Product introduction workflow tables
-- Adapted from 20260421000002, 20260422000001, 20260422000002
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 plants
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS plants_company_id_idx ON plants (company_id);

-- ----------------------------------------------------------------------------
-- 2.2 plant_role_assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plant_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plant_id, user_id, role),
  CHECK (role IN (
    'requestor',
    'operator',
    'procurement',
    'incident_officer',
    'water_protection',
    'pqm',
    'security_specialist',
    'head_procurement',
    'operator_brk',
    'fire_protection'
  ))
);

CREATE INDEX IF NOT EXISTS plant_role_assignments_plant_id_idx
  ON plant_role_assignments (plant_id);
CREATE INDEX IF NOT EXISTS plant_role_assignments_user_id_idx
  ON plant_role_assignments (user_id);

-- ----------------------------------------------------------------------------
-- 2.3 product_introduction_workflows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_introduction_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  requestor_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  CHECK (status IN (
    'draft',
    'submitted',
    'triage',
    'in_review',
    'approved',
    'returned',
    'rejected'
  ))
);

CREATE INDEX IF NOT EXISTS piw_company_id_idx
  ON product_introduction_workflows (company_id);
CREATE INDEX IF NOT EXISTS piw_plant_id_idx
  ON product_introduction_workflows (plant_id);
CREATE INDEX IF NOT EXISTS piw_sheet_id_idx
  ON product_introduction_workflows (sheet_id);
CREATE INDEX IF NOT EXISTS piw_status_idx
  ON product_introduction_workflows (status);
CREATE INDEX IF NOT EXISTS piw_requestor_user_id_idx
  ON product_introduction_workflows (requestor_user_id);

-- 20260422000002: Zone A / Zone B form data as JSONB (idempotent already) ---
ALTER TABLE product_introduction_workflows
  ADD COLUMN IF NOT EXISTS zone_a_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS zone_b_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- 2.4 workflow_steps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES product_introduction_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  signed_by_user_id UUID REFERENCES users(id),
  return_reason TEXT,
  owned_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, step_order),
  CHECK (decision IN ('pending', 'approved', 'returned', 'skipped')),
  CHECK (role IN (
    'requestor',
    'operator',
    'procurement',
    'incident_officer',
    'water_protection',
    'pqm',
    'security_specialist',
    'head_procurement',
    'operator_brk',
    'fire_protection'
  ))
);

CREATE INDEX IF NOT EXISTS workflow_steps_workflow_id_idx
  ON workflow_steps (workflow_id);
CREATE INDEX IF NOT EXISTS workflow_steps_decision_idx
  ON workflow_steps (decision);

-- ----------------------------------------------------------------------------
-- 2.5 workflow_conditions (append-only log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES product_introduction_workflows(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (category IN (
    'emission',
    'wastewater',
    'storage',
    'osh',
    'fire',
    'wastewater_treatment',
    'other'
  ))
);

CREATE INDEX IF NOT EXISTS workflow_conditions_workflow_id_idx
  ON workflow_conditions (workflow_id);
CREATE INDEX IF NOT EXISTS workflow_conditions_step_id_idx
  ON workflow_conditions (step_id);

-- 20260422000001: role is nullable (some conditions are added by users who
-- hold no named plant role, e.g. a super-admin clarifying an entry) --------
ALTER TABLE workflow_conditions
  ALTER COLUMN role DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2.6 RLS: tenant-scoped via user_company_id() / is_super_admin()
-- Depends on the public.user_company_id() and public.is_super_admin()
-- helper functions already present in prod (predate this migration; created
-- alongside the original Bubble->Supabase schema).
-- ----------------------------------------------------------------------------
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_introduction_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;

-- plants ----------------------------------------------------------------
DROP POLICY IF EXISTS "plants_select" ON plants;
CREATE POLICY "plants_select"
ON plants FOR SELECT
USING (
  public.is_super_admin() = true
  OR company_id = public.user_company_id()
);

DROP POLICY IF EXISTS "plants_insert" ON plants;
CREATE POLICY "plants_insert"
ON plants FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

DROP POLICY IF EXISTS "plants_update" ON plants;
CREATE POLICY "plants_update"
ON plants FOR UPDATE
USING (
  public.is_super_admin() = true
  OR (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

DROP POLICY IF EXISTS "plants_delete" ON plants;
CREATE POLICY "plants_delete"
ON plants FOR DELETE
USING (public.is_super_admin() = true);

-- plant_role_assignments --------------------------------------------------
DROP POLICY IF EXISTS "plant_role_assignments_select" ON plant_role_assignments;
CREATE POLICY "plant_role_assignments_select"
ON plant_role_assignments FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM plants p
    WHERE p.id = plant_role_assignments.plant_id
      AND p.company_id = public.user_company_id()
  )
);

DROP POLICY IF EXISTS "plant_role_assignments_insert" ON plant_role_assignments;
CREATE POLICY "plant_role_assignments_insert"
ON plant_role_assignments FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM plants p
      WHERE p.id = plant_role_assignments.plant_id
        AND p.company_id = public.user_company_id()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

DROP POLICY IF EXISTS "plant_role_assignments_update" ON plant_role_assignments;
CREATE POLICY "plant_role_assignments_update"
ON plant_role_assignments FOR UPDATE
USING (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM plants p
      WHERE p.id = plant_role_assignments.plant_id
        AND p.company_id = public.user_company_id()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

DROP POLICY IF EXISTS "plant_role_assignments_delete" ON plant_role_assignments;
CREATE POLICY "plant_role_assignments_delete"
ON plant_role_assignments FOR DELETE
USING (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM plants p
      WHERE p.id = plant_role_assignments.plant_id
        AND p.company_id = public.user_company_id()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
);

-- product_introduction_workflows ------------------------------------------
DROP POLICY IF EXISTS "piw_select" ON product_introduction_workflows;
CREATE POLICY "piw_select"
ON product_introduction_workflows FOR SELECT
USING (
  public.is_super_admin() = true
  OR company_id = public.user_company_id()
);

DROP POLICY IF EXISTS "piw_insert" ON product_introduction_workflows;
CREATE POLICY "piw_insert"
ON product_introduction_workflows FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor', 'reviewer')
    )
  )
);

DROP POLICY IF EXISTS "piw_update" ON product_introduction_workflows;
CREATE POLICY "piw_update"
ON product_introduction_workflows FOR UPDATE
USING (
  public.is_super_admin() = true
  OR (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor', 'reviewer')
    )
  )
);

DROP POLICY IF EXISTS "piw_delete" ON product_introduction_workflows;
CREATE POLICY "piw_delete"
ON product_introduction_workflows FOR DELETE
USING (public.is_super_admin() = true);

-- workflow_steps ------------------------------------------------------------
DROP POLICY IF EXISTS "workflow_steps_select" ON workflow_steps;
CREATE POLICY "workflow_steps_select"
ON workflow_steps FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM product_introduction_workflows w
    WHERE w.id = workflow_steps.workflow_id
      AND w.company_id = public.user_company_id()
  )
);

DROP POLICY IF EXISTS "workflow_steps_insert" ON workflow_steps;
CREATE POLICY "workflow_steps_insert"
ON workflow_steps FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM product_introduction_workflows w
      WHERE w.id = workflow_steps.workflow_id
        AND w.company_id = public.user_company_id()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'editor', 'reviewer')
    )
  )
);

DROP POLICY IF EXISTS "workflow_steps_update" ON workflow_steps;
CREATE POLICY "workflow_steps_update"
ON workflow_steps FOR UPDATE
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM product_introduction_workflows w
    WHERE w.id = workflow_steps.workflow_id
      AND w.company_id = public.user_company_id()
  )
);

DROP POLICY IF EXISTS "workflow_steps_delete" ON workflow_steps;
CREATE POLICY "workflow_steps_delete"
ON workflow_steps FOR DELETE
USING (public.is_super_admin() = true);

-- workflow_conditions -------------------------------------------------------
-- Append-only from app perspective: no UPDATE policy beyond super-admin.
DROP POLICY IF EXISTS "workflow_conditions_select" ON workflow_conditions;
CREATE POLICY "workflow_conditions_select"
ON workflow_conditions FOR SELECT
USING (
  public.is_super_admin() = true
  OR EXISTS (
    SELECT 1 FROM product_introduction_workflows w
    WHERE w.id = workflow_conditions.workflow_id
      AND w.company_id = public.user_company_id()
  )
);

DROP POLICY IF EXISTS "workflow_conditions_insert" ON workflow_conditions;
CREATE POLICY "workflow_conditions_insert"
ON workflow_conditions FOR INSERT
WITH CHECK (
  public.is_super_admin() = true
  OR (
    EXISTS (
      SELECT 1 FROM product_introduction_workflows w
      WHERE w.id = workflow_conditions.workflow_id
        AND w.company_id = public.user_company_id()
    )
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "workflow_conditions_delete" ON workflow_conditions;
CREATE POLICY "workflow_conditions_delete"
ON workflow_conditions FOR DELETE
USING (public.is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- 2.7 updated_at triggers (match existing convention)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plants_set_updated_at ON plants;
CREATE TRIGGER plants_set_updated_at
  BEFORE UPDATE ON plants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS piw_set_updated_at ON product_introduction_workflows;
CREATE TRIGGER piw_set_updated_at
  BEFORE UPDATE ON product_introduction_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS workflow_steps_set_updated_at ON workflow_steps;
CREATE TRIGGER workflow_steps_set_updated_at
  BEFORE UPDATE ON workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SECTION 3: notifications columns + realtime
-- Adapted from 20260706000003_notifications_columns.sql
-- ============================================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;

-- Legacy column predating the NotificationBell contract: event_type is
-- NOT NULL with no default in dev and nothing in the codebase reads or
-- writes it (grep confirmed dead). Guarded existence check since prod's
-- exact legacy shape was not independently re-verified column-by-column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE notifications ALTER COLUMN event_type DROP NOT NULL;
  END IF;
END $$;

-- Defensive backfill: any pre-existing legacy row (title IS NULL, meaning it
-- predates this migration) is marked read so it never renders as a blank
-- unread item once the bell goes live. Prod carries 0 notifications rows as
-- of 2026-07-06 (verified read-only via 00-preflight.ts), so this is a
-- no-op today; it stays as a safety net for rows written between preflight
-- and cutover execution.
UPDATE notifications SET read = true WHERE title IS NULL AND read IS DISTINCT FROM true;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Realtime for the bell's INSERT subscription (idempotent guard: adding a
-- table to a publication twice raises an error, so check first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;


-- ============================================================================
-- SECTION 4: helper function existence check (informational, does not fail)
-- ============================================================================
-- Section 2's RLS policies call public.user_company_id() and
-- public.is_super_admin(). Both predate this migration (used throughout the
-- original Bubble->Supabase schema's RLS) and are NOT (re)created here. If
-- either is missing on the target database, Section 2's CREATE POLICY
-- statements will fail loudly at apply time -- that failure is the correct
-- signal to stop and investigate, not something to swallow silently.


-- ============================================================================
-- SECTION 5: What this file deliberately does NOT do
-- ============================================================================
-- - Does not create or alter canonical_answer_types / canonical_reference_substances.
--   Both already exist on prod with data (verified read-only 2026-07-06);
--   20260706000001_canonical_answer_types.sql is marked DEV-ONLY in its own
--   header and must not be run against prod.
-- - Does not copy any row data between dev and prod. Reference data
--   (regulatory_frameworks) is seeded via ON CONFLICT DO NOTHING only.
-- - Does not create storage buckets or storage.objects policies. See
--   02-buckets-and-storage-policies.ts for extraction-documents /
--   generated-documents bucket creation and the storage.objects SQL it prints.
-- - Does not touch RLS on sheets / requests / answers / questions / choices.
--   Those tables predate the pipeline rebuild; SP2's cutover checklist item 4
--   calls for verifying prod RLS permits the specific reads the new UI paths
--   need (answers/batch reads of questions.response_type and choices;
--   review-client reads of requests.requestor_id). That verification is a
--   README smoke-test step, not a schema change here.
-- - Does not regenerate src/lib/database.types.ts (standing post-cutover
--   ticket, tracked in README.md).
-- ============================================================================
