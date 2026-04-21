-- Add polarity column to canonical_parameters
-- Polarity indicates whether a "Yes" or "No" answer is favorable:
--   'positive' = Yes is favorable (compliance/certification questions)
--   'negative' = No is favorable (containment/presence questions)
--   'neutral'  = Informational, neither answer is inherently good/bad

ALTER TABLE canonical_parameters ADD COLUMN IF NOT EXISTS polarity text DEFAULT 'neutral';

-- Section 2: Ecolabels — "does product meet this standard?" → positive
UPDATE canonical_parameters SET polarity = 'positive' WHERE code LIKE '2.%';

-- Section 3: Biocides — mixed
UPDATE canonical_parameters SET polarity = 'negative' WHERE code = '3.1.1';  -- contains biocides?
UPDATE canonical_parameters SET polarity = 'neutral'  WHERE code IN ('3.1.2', '3.1.5', '3.1.8');  -- informational: what type?
UPDATE canonical_parameters SET polarity = 'positive' WHERE code IN ('3.1.3', '3.1.4', '3.1.6', '3.1.7', '3.1.9', '3.1.10');  -- Article 95 / approved supplier

-- Section 4: Food Contact — mostly positive (compliance), one negative
UPDATE canonical_parameters SET polarity = 'positive' WHERE code LIKE '4.%';
UPDATE canonical_parameters SET polarity = 'negative' WHERE code = '4.8.1';  -- components with specific limits in EU plastics

-- Section 5: PIDSL — all "does product contain [hazardous substance]?" → negative
UPDATE canonical_parameters SET polarity = 'negative' WHERE code LIKE '5.%';

-- Section 6: Additional Requirements — mixed
UPDATE canonical_parameters SET polarity = 'positive' WHERE code IN ('6.1.1', '6.1.2');  -- Kosher/Halal certification
UPDATE canonical_parameters SET polarity = 'negative' WHERE code IN (
  '6.2.1', '6.3.1', '6.4.1', '6.5.1',
  '6.6.1', '6.6.2', '6.7.1', '6.8.1',
  '6.9.1', '6.10.1', '6.11.1'
);  -- presence/containment questions
UPDATE canonical_parameters SET polarity = 'neutral' WHERE code = '6.5.2';  -- ethanol plant source (follow-up)
