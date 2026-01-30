-- ============================================
-- SMART LIST TABLE COLUMNS - January 30, 2026
-- Adds choice_options for dropdowns and updates
-- Concentration/Units columns for better UX
-- ============================================

-- Step 1: Add choice_options column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_table_columns' AND column_name = 'choice_options'
  ) THEN
    ALTER TABLE list_table_columns ADD COLUMN choice_options JSONB DEFAULT NULL;
    RAISE NOTICE 'Added choice_options column';
  ELSE
    RAISE NOTICE 'choice_options column already exists';
  END IF;
END $$;

-- Step 2: Set concentration columns to Number type
UPDATE list_table_columns
SET response_type = 'Number'
WHERE LOWER(name) LIKE '%concentration%'
   OR LOWER(name) = 'conc'
   OR LOWER(name) = 'conc.';

-- Step 3: Set units columns to Dropdown with standard options
UPDATE list_table_columns
SET response_type = 'Dropdown',
    choice_options = '["ppm", "%", "ppb", "mg/kg", "mg/L", "g/kg", "g/L", "µg/kg", "µg/L"]'::jsonb
WHERE LOWER(name) = 'units'
   OR LOWER(name) = 'unit';

-- Step 4: Verify the changes
DO $$
DECLARE
  concentration_count INT;
  units_count INT;
BEGIN
  SELECT COUNT(*) INTO concentration_count
  FROM list_table_columns
  WHERE response_type = 'Number' AND LOWER(name) LIKE '%concentration%';

  SELECT COUNT(*) INTO units_count
  FROM list_table_columns
  WHERE response_type = 'Dropdown' AND LOWER(name) LIKE '%unit%';

  RAISE NOTICE 'Concentration columns updated to Number type: %', concentration_count;
  RAISE NOTICE 'Units columns updated to Dropdown type: %', units_count;
END $$;
