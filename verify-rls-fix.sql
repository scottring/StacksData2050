-- Verification script to check RLS policies after applying the fix

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ Disabled'
  END as rls_status
FROM pg_tables
WHERE tablename IN ('choices', 'answers')
  AND schemaname = 'public'
ORDER BY tablename;

-- 2. List all policies
SELECT 
  tablename,
  policyname as policy_name,
  cmd as command,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✓ Permissive'
    ELSE 'Restrictive'
  END as type,
  roles,
  CASE 
    WHEN qual = 'true' THEN '✓ Allows all rows'
    ELSE qual
  END as condition
FROM pg_policies
WHERE tablename IN ('choices', 'answers')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Expected result:
-- Both tables should have RLS enabled
-- Both tables should have a policy "Enable read access for all users"
-- Both policies should be FOR SELECT with USING (true)
-- Both policies should apply to {public} role (or all roles)
