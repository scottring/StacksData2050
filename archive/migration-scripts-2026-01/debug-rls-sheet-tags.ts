import { supabase } from './src/migration/supabase-client.js'

async function debugRLS() {
  const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'
  const userEmail = 'heather.harvey@omya.com'

  console.log('=== Debugging RLS Policy for sheet_tags ===\n')

  // 1. Check if sheet_tags exist for this sheet (service role bypasses RLS)
  const { data: allSheetTags, error: allTagsError } = await supabase
    .from('sheet_tags')
    .select('*')
    .eq('sheet_id', sheetId)

  console.log('1. Sheet tags (service role, bypasses RLS):')
  console.log('   Count:', allSheetTags?.length || 0)
  console.log('   Data:', allSheetTags)
  console.log('   Error:', allTagsError)
  console.log()

  // 2. Get sheet details
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, company_id, assigned_to_company_id, created_by')
    .eq('id', sheetId)
    .single()

  console.log('2. Sheet details:')
  console.log('   Sheet ID:', sheet?.id)
  console.log('   Customer company_id:', sheet?.company_id)
  console.log('   Supplier company_id:', sheet?.assigned_to_company_id)
  console.log('   Created by:', sheet?.created_by)
  console.log()

  // 3. Get user details
  const { data: user } = await supabase
    .from('users')
    .select('id, email, company_id')
    .eq('email', userEmail)
    .single()

  console.log('3. User details:')
  console.log('   User ID:', user?.id)
  console.log('   Email:', user?.email)
  console.log('   Company ID:', user?.company_id)
  console.log()

  // 4. Get company names
  if (sheet && user) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', [sheet.company_id, sheet.assigned_to_company_id, user.company_id].filter(Boolean))

    console.log('4. Company details:')
    companies?.forEach(c => {
      console.log(`   ${c.id}: ${c.name}`)
    })
    console.log()

    // 5. Check RLS conditions
    console.log('5. RLS Policy Condition Checks:')
    console.log('   matches_customer:', sheet.company_id === user.company_id)
    console.log('   matches_supplier:', sheet.assigned_to_company_id === user.company_id)
    console.log('   is_creator:', sheet.created_by === user.id)
    console.log('   ANY match?:',
      sheet.company_id === user.company_id ||
      sheet.assigned_to_company_id === user.company_id ||
      sheet.created_by === user.id
    )
    console.log()
  }

  // 6. Test the actual RLS policy with a manual query
  console.log('6. Testing RLS policy manually:')
  const { data: testResult, error: testError } = await supabase.rpc('test_sheet_tags_rls', {
    p_sheet_id: sheetId,
    p_user_id: user?.id
  }).catch(() => ({ data: null, error: 'RPC function does not exist - skipping' }))

  if (testError === 'RPC function does not exist - skipping') {
    console.log('   ⚠️  RPC test function not created yet')
  } else {
    console.log('   Result:', testResult)
    console.log('   Error:', testError)
  }
}

debugRLS().catch(console.error)
