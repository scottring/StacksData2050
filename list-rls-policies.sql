-- List all RLS policies on tag-related tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  substring(qual::text, 1, 100) as using_clause,
  substring(with_check::text, 1, 100) as with_check_clause
FROM pg_policies 
WHERE tablename IN ('sheet_tags', 'question_tags', 'tags')
ORDER BY tablename, policyname;
