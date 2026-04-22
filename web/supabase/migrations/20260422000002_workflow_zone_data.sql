-- Store Zone A (product identity) and Zone B (compliance checks) form
-- data as JSONB on the workflow. This is the requestor's submission plus
-- any edits reviewers make to their owned fields.
--
-- Using JSONB rather than columns because:
--   - the field set evolves per-plant (Alfeld differs from Gratkorn)
--   - role-owned-fields lists can change without schema migrations
--   - the field set is long (~25 fields) and most are optional
--
-- When the field set stabilises we can extract columns — nothing in the
-- JSONB approach locks us in.

ALTER TABLE product_introduction_workflows
  ADD COLUMN IF NOT EXISTS zone_a_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS zone_b_data JSONB NOT NULL DEFAULT '{}'::jsonb;
