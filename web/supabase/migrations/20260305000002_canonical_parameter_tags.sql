-- canonical_parameter_tags: Links tags to canonical parameters
-- Same pattern as question_tags, enabling tag-based filtering of canonical params.

-- 1. Create the join table
CREATE TABLE IF NOT EXISTS canonical_parameter_tags (
  tag_id                  uuid NOT NULL REFERENCES tags(id),
  canonical_parameter_id  uuid NOT NULL REFERENCES canonical_parameters(id),
  created_at              timestamptz DEFAULT now(),
  PRIMARY KEY (tag_id, canonical_parameter_id)
);

CREATE INDEX IF NOT EXISTS idx_cpt_tag ON canonical_parameter_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_cpt_param ON canonical_parameter_tags(canonical_parameter_id);

-- RLS
ALTER TABLE canonical_parameter_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read canonical_parameter_tags"
  ON canonical_parameter_tags FOR SELECT
  TO authenticated
  USING (true);

-- 2. Add legacy_question_id to canonical_parameters
-- Bridges FK constraint: canonical_parameter → legacy question → answers.question_id
ALTER TABLE canonical_parameters ADD COLUMN IF NOT EXISTS legacy_question_id uuid REFERENCES questions(id);

CREATE INDEX IF NOT EXISTS idx_canonical_params_legacy_q ON canonical_parameters(legacy_question_id);

-- 3. Seed: link HQ2.1 tag to all 80 active canonical parameters
INSERT INTO canonical_parameter_tags (tag_id, canonical_parameter_id)
SELECT 'a3fbb37e-cace-4aae-85c1-a2571e539e81', id
FROM canonical_parameters
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- 4. Seed legacy_question_id from normalization_mappings (accepted mappings)
UPDATE canonical_parameters cp
SET legacy_question_id = nm.legacy_question_id
FROM normalization_mappings nm
WHERE nm.canonical_parameter_id = cp.id
  AND nm.status = 'accepted'
  AND cp.legacy_question_id IS NULL;

-- Fallback: also try from canonical_answer_links → answers
-- (covers cases where normalization_mappings may not have an accepted mapping)
UPDATE canonical_parameters cp
SET legacy_question_id = sub.question_id
FROM (
  SELECT DISTINCT ON (cal.canonical_parameter_id)
    cal.canonical_parameter_id,
    a.question_id
  FROM canonical_answer_links cal
  JOIN answers a ON a.id = cal.answer_id
  ORDER BY cal.canonical_parameter_id, cal.created_at DESC
) sub
WHERE sub.canonical_parameter_id = cp.id
  AND cp.legacy_question_id IS NULL;
