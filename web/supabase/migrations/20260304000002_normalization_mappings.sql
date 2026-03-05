-- Phase 2: Normalization mappings — links legacy questions to canonical parameters
-- Non-destructive: creates new table only, no modifications to existing tables

CREATE TABLE IF NOT EXISTS normalization_mappings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_question_id      uuid NOT NULL REFERENCES questions(id),
  canonical_parameter_id  uuid REFERENCES canonical_parameters(id),  -- null if no match
  confidence              float NOT NULL,           -- 0.0 to 1.0
  reasoning               text NOT NULL,            -- AI explanation
  status                  text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'manual')),
  reviewed_by             uuid REFERENCES users(id),
  reviewed_at             timestamptz,
  created_at              timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_norm_mappings_legacy_question ON normalization_mappings(legacy_question_id);
CREATE INDEX idx_norm_mappings_canonical_param ON normalization_mappings(canonical_parameter_id);
CREATE INDEX idx_norm_mappings_confidence ON normalization_mappings(confidence DESC);
CREATE INDEX idx_norm_mappings_status ON normalization_mappings(status);

-- Unique constraint: one mapping per legacy question
CREATE UNIQUE INDEX idx_norm_mappings_unique_legacy ON normalization_mappings(legacy_question_id);

-- RLS
ALTER TABLE normalization_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read normalization mappings"
  ON normalization_mappings FOR SELECT
  TO authenticated
  USING (true);
