-- Product Introduction Workflow
--
-- Introduces a multi-role approval workflow that attaches to a Sheet and
-- gates whether the sheet is "approved for use" at a specific plant.
--
-- Built for Sappi Alfeld (replacing their Outlook-based Formblatt
-- process — MP_04_02_04_001_01), but the primitive is generic and
-- tenant-scoped: any customer can define plants, role assignments, and
-- run sheets through the approval pipeline.
--
-- Five new tables:
--   plants                         — physical mills/sites per tenant
--   plant_role_assignments         — named enum role → user(s) per plant
--   product_introduction_workflows — workflow attached to a sheet
--   workflow_steps                 — ordered steps in a workflow
--   workflow_conditions            — append-only conditions log

-- ============================================================================
-- plants
-- ============================================================================

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

-- ============================================================================
-- plant_role_assignments
-- ============================================================================

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

-- ============================================================================
-- product_introduction_workflows
-- ============================================================================

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

-- ============================================================================
-- workflow_steps
-- ============================================================================

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

-- ============================================================================
-- workflow_conditions (append-only log)
-- ============================================================================

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

-- ============================================================================
-- RLS: tenant-scoped via user_company_id()
-- ============================================================================

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_introduction_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;

-- plants --------------------------------------------------------------------

CREATE POLICY "plants_select"
ON plants FOR SELECT
USING (
  public.is_super_admin() = true
  OR company_id = public.user_company_id()
);

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

CREATE POLICY "plants_delete"
ON plants FOR DELETE
USING (public.is_super_admin() = true);

-- plant_role_assignments ----------------------------------------------------

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

-- product_introduction_workflows --------------------------------------------

CREATE POLICY "piw_select"
ON product_introduction_workflows FOR SELECT
USING (
  public.is_super_admin() = true
  OR company_id = public.user_company_id()
);

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

CREATE POLICY "piw_delete"
ON product_introduction_workflows FOR DELETE
USING (public.is_super_admin() = true);

-- workflow_steps ------------------------------------------------------------

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

CREATE POLICY "workflow_steps_delete"
ON workflow_steps FOR DELETE
USING (public.is_super_admin() = true);

-- workflow_conditions -------------------------------------------------------
-- Append-only from app perspective: no UPDATE/DELETE policies beyond super-admin.

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

CREATE POLICY "workflow_conditions_delete"
ON workflow_conditions FOR DELETE
USING (public.is_super_admin() = true);

-- ============================================================================
-- updated_at triggers (match existing convention)
-- ============================================================================

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
