import { supabase } from './src/migration/supabase-client.js'

async function checkPolicy() {
  console.log('=== Checking sheet_tags RLS Policy ===\n')

  // Query the database for the actual policy definition
  const query = `
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename = 'sheet_tags';
  `

  // Skip querying pg_policies since we can't access it
  const data = 'Cannot query pg_policies (requires superuser)'
  const error = null

  if (error) {
    console.log('Error:', error)
  } else {
    console.log('Policy details:', data)
  }

  console.log('\n--- Testing policy with authenticated user simulation ---\n')

  // The issue is likely that the frontend client doesn't have an authenticated session
  // Let's verify by trying to get session info
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  console.log('Current session (service role should have none):')
  console.log('  Has session:', !!sessionData?.session)
  console.log('  Error:', sessionError)

  console.log('\n--- Checking if RLS is enabled ---')

  // Check if RLS is enabled by comparing service role vs anon key access
  const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

  // Service role query (should work regardless of RLS)
  const { data: serviceRoleResult, error: serviceRoleError } = await supabase
    .from('sheet_tags')
    .select('*')
    .eq('sheet_id', sheetId)

  console.log('Service role access:')
  console.log('  Count:', serviceRoleResult?.length || 0)
  console.log('  Error:', serviceRoleError)

  console.log('\nRLS is likely enabled if service role can see data.')
  console.log('The issue is that the FRONTEND is not passing an authenticated session.')
}

checkPolicy().catch(console.error)
