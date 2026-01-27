-- Fix RLS policies for choices and answers tables
-- This allows anonymous/public read access

-- ============================================
-- CHOICES TABLE
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON choices;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON choices;
DROP POLICY IF EXISTS "choices_select_policy" ON choices;

-- Enable RLS if not already enabled
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows SELECT for all users (including anonymous)
CREATE POLICY "Enable read access for all users" ON choices
  FOR SELECT
  USING (true);

-- ============================================
-- ANSWERS TABLE  
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON answers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON answers;
DROP POLICY IF EXISTS "answers_select_policy" ON answers;

-- Enable RLS if not already enabled
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows SELECT for all users (including anonymous)
CREATE POLICY "Enable read access for all users" ON answers
  FOR SELECT
  USING (true);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname as policy_name,
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('choices', 'answers')
  AND schemaname = 'public'
ORDER BY tablename, policyname;
