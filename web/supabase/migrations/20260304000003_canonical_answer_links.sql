-- Phase 3: Canonical answer links — connects existing answers to canonical parameters
-- Non-destructive: creates new linking table only, no modifications to existing tables

CREATE TABLE IF NOT EXISTS canonical_answer_links (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id               uuid NOT NULL REFERENCES answers(id),
  canonical_parameter_id  uuid NOT NULL REFERENCES canonical_parameters(id),
  normalization_mapping_id uuid REFERENCES normalization_mappings(id),
  created_at              timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_cal_answer ON canonical_answer_links(answer_id);
CREATE INDEX idx_cal_canonical_param ON canonical_answer_links(canonical_parameter_id);
CREATE INDEX idx_cal_mapping ON canonical_answer_links(normalization_mapping_id);

-- Unique constraint: one link per answer-parameter pair
CREATE UNIQUE INDEX idx_cal_unique_answer_param ON canonical_answer_links(answer_id, canonical_parameter_id);

-- RLS
ALTER TABLE canonical_answer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read canonical answer links"
  ON canonical_answer_links FOR SELECT
  TO authenticated
  USING (true);
