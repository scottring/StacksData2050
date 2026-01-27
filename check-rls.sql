-- Check if RLS is enabled on the tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('choices', 'answers')
  AND schemaname = 'public'
ORDER BY tablename;

-- Check RLS policies for choices table
SELECT 
  schemaname,
  tablename,
  policyname as policy_name,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'choices'
  AND schemaname = 'public'
ORDER BY policyname;

-- Check RLS policies for answers table  
SELECT 
  schemaname,
  tablename,
  policyname as policy_name,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'answers'
  AND schemaname = 'public'
ORDER BY policyname;

-- Check grants on the tables
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('choices', 'answers')
  AND table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;
