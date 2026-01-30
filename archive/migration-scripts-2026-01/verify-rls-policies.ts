import { supabase } from './src/migration/supabase-client.js'

async function verifyRLS() {
  console.log('=== Verifying RLS Policies ===\n')

  // Check if RLS is enabled on tag tables
  const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status', {}).catch(() => ({
    data: null,
    error: 'RPC function not available'
  }))

  // Instead, query pg_class directly
  const { data: tables } = await supabase
    .from('pg_class')
    .select('relname, relrowsecurity')
    .in('relname', ['tags', 'question_tags', 'sheet_tags'])
    .catch(() => ({ data: null }))

  if (!tables) {
    console.log('❌ Cannot query pg_class table directly (expected - requires superuser)')
    console.log('Will check policies by listing them instead\n')
  }

  // List all policies on tag tables
  for (const tableName of ['tags', 'question_tags', 'sheet_tags']) {
    console.log(`\n--- ${tableName} policies ---`)

    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', tableName)
      .catch(() => ({ data: null, error: 'Cannot query pg_policies' }))

    if (error || !policies) {
      console.log(`❌ Cannot query pg_policies: ${error}`)
      continue
    }

    if (policies.length === 0) {
      console.log(`⚠️  No policies found on ${tableName}`)
    } else {
      policies.forEach((p: any) => {
        console.log(`Policy: ${p.policyname}`)
        console.log(`  Command: ${p.cmd}`)
        console.log(`  Roles: ${p.roles}`)
        console.log(`  Using: ${p.qual}`)
      })
    }
  }
}

verifyRLS().catch(console.error)
