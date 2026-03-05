-- Stacks Intelligence Pipeline - Database Migration
-- Run this in Supabase SQL Editor
--
-- NOTE: FK references to companies, users, sheets, and chemical_inventory
-- are intentionally soft (no REFERENCES constraint) so this migration
-- can run even if those tables haven't been created yet.
-- Add FK constraints later with ALTER TABLE if desired.

-- ============================================================
-- 1. extraction_documents - Uploaded source files
-- ============================================================
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

-- ============================================================
-- 2. extraction_items - Individual extracted data points
-- ============================================================
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

-- ============================================================
-- 3. regulatory_frameworks - The 6 top-level regulations
-- ============================================================
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

-- ============================================================
-- 4. regulatory_rules - Individual rules within a framework
-- ============================================================
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

-- ============================================================
-- 5. compliance_assessments - Product evaluated against frameworks
-- ============================================================
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

-- ============================================================
-- 6. compliance_results - Individual rule evaluation results
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,

  -- Nullable FKs: when using seed rules (not yet in DB), these can be null
  rule_id UUID,             -- FK to regulatory_rules(id) when rules exist in DB
  framework_id UUID,        -- FK to regulatory_frameworks(id) when frameworks exist in DB

  -- Store codes as fallback identifiers when seed rules are used
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

-- ============================================================
-- 7. generated_documents - Compliance output documents
-- ============================================================
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

-- ============================================================
-- Enable RLS on all new tables
-- ============================================================
ALTER TABLE extraction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow authenticated users to access their company's data
-- (Simplified for now - can be tightened later)
CREATE POLICY "Users can view their company extraction documents"
  ON extraction_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert extraction documents"
  ON extraction_documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update extraction documents"
  ON extraction_documents FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view extraction items"
  ON extraction_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert extraction items"
  ON extraction_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update extraction items"
  ON extraction_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view regulatory frameworks"
  ON regulatory_frameworks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view regulatory rules"
  ON regulatory_rules FOR SELECT
  USING (true);

CREATE POLICY "Users can view compliance assessments"
  ON compliance_assessments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert compliance assessments"
  ON compliance_assessments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update compliance assessments"
  ON compliance_assessments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view compliance results"
  ON compliance_results FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert compliance results"
  ON compliance_results FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update compliance results"
  ON compliance_results FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view generated documents"
  ON generated_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert generated documents"
  ON generated_documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Seed regulatory frameworks
-- ============================================================
INSERT INTO regulatory_frameworks (code, name, jurisdiction, flag_emoji, color, description, version) VALUES
  ('reach', 'REACH', 'EU', '🇪🇺', 'blue', 'Registration, Evaluation, Authorisation and Restriction of Chemicals (EC 1907/2006)', 'SVHC Candidate List 2025'),
  ('tsca', 'TSCA', 'US', '🇺🇸', 'red', 'Toxic Substances Control Act + California Proposition 65', '2024'),
  ('china_epa', 'China EPA', 'CN', '🇨🇳', 'rose', 'China MEE regulations including IECSC inventory and GB 9685-2016 for food contact', 'GB 9685-2016'),
  ('k_reach', 'K-REACH', 'KR', '🇰🇷', 'sky', 'Korean Registration and Evaluation of Chemicals Act', 'KECL 2024'),
  ('dpp', 'Digital Product Passport', 'EU', '🇪🇺', 'emerald', 'EU Ecodesign for Sustainable Products Regulation (ESPR 2024/1781)', 'ESPR 2024'),
  ('bfr', 'BfR Recommendations', 'DE', '🇩🇪', 'amber', 'German Federal Institute for Risk Assessment recommendations for food contact materials', 'Rec. XXXVI 2024')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Optional: Add FK constraints after verifying tables exist
-- Run these separately if companies, users, sheets tables exist
-- ============================================================
-- ALTER TABLE extraction_documents ADD CONSTRAINT fk_extraction_docs_company FOREIGN KEY (company_id) REFERENCES companies(id);
-- ALTER TABLE extraction_documents ADD CONSTRAINT fk_extraction_docs_user FOREIGN KEY (uploaded_by) REFERENCES users(id);
-- ALTER TABLE extraction_documents ADD CONSTRAINT fk_extraction_docs_sheet FOREIGN KEY (sheet_id) REFERENCES sheets(id);
-- ALTER TABLE extraction_items ADD CONSTRAINT fk_extraction_items_user FOREIGN KEY (reviewed_by) REFERENCES users(id);
-- ALTER TABLE extraction_items ADD CONSTRAINT fk_extraction_items_chemical FOREIGN KEY (chemical_id) REFERENCES chemical_inventory(id);
-- ALTER TABLE compliance_assessments ADD CONSTRAINT fk_assessments_sheet FOREIGN KEY (sheet_id) REFERENCES sheets(id);
-- ALTER TABLE compliance_assessments ADD CONSTRAINT fk_assessments_company FOREIGN KEY (company_id) REFERENCES companies(id);
-- ALTER TABLE generated_documents ADD CONSTRAINT fk_gen_docs_sheet FOREIGN KEY (sheet_id) REFERENCES sheets(id);
-- ALTER TABLE generated_documents ADD CONSTRAINT fk_gen_docs_company FOREIGN KEY (company_id) REFERENCES companies(id);
