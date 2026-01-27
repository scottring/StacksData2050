import { supabase } from './src/migration/supabase-client.js'

/**
 * Fix sheet company assignments
 *
 * Problem: All sheets have company_id = assigned_to_company_id (both point to supplier)
 * Solution: Use original_requestor_assoc_id as the customer (company_id)
 *
 * Correct model:
 * - company_id = customer who requested the data (original_requestor_assoc_id)
 * - assigned_to_company_id = supplier providing the data (stays the same)
 */

async function fixSheetAssignments() {
  console.log('🔧 Starting to fix sheet company assignments...\n')

  // First, check current state
  const { data: currentState, error: stateError } = await supabase
    .from('sheets')
    .select('id, company_id, assigned_to_company_id, original_requestor_assoc_id')
    .limit(10)

  if (stateError) {
    console.error('❌ Error checking current state:', stateError)
    return
  }

  console.log('📊 Sample of current data:')
  console.log(currentState?.slice(0, 3))
  console.log()

  // Fetch ALL sheets to check and fix (with pagination)
  console.log('📥 Fetching all sheets...')
  let allSheets: any[] = []
  let page = 0
  const PAGE_SIZE = 1000
  let fetchError = null

  while (true) {
    const { data, error } = await supabase
      .from('sheets')
      .select('id, company_id, assigned_to_company_id, original_requestor_assoc_id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      fetchError = error
      break
    }

    if (!data || data.length === 0) break

    allSheets = allSheets.concat(data)

    if (data.length < PAGE_SIZE) break

    page++
    console.log(`  Fetched ${allSheets.length} sheets...`)
  }

  console.log(`✅ Fetched ${allSheets.length} sheets total\n`)

  if (fetchError) {
    console.error('❌ Error fetching sheets:', fetchError)
    return
  }

  // Filter sheets that need fixing (where company_id != original_requestor_assoc_id)
  const sheetsToFix = allSheets?.filter(s =>
    s.original_requestor_assoc_id &&
    s.company_id !== s.original_requestor_assoc_id
  ) || []

  const selfAssignedCount = allSheets?.filter(s =>
    s.company_id === s.assigned_to_company_id
  ).length || 0

  console.log(`Found ${selfAssignedCount} sheets with company_id = assigned_to_company_id (self-assigned)`)
  console.log(`Found ${sheetsToFix.length} sheets where company_id != original_requestor_assoc_id (need fixing)\n`)

  if (sheetsToFix.length === 0) {
    console.log('✅ No sheets need fixing!')
    return
  }

  console.log(`📝 Updating ${sheetsToFix.length} sheets...\n`)

  let successCount = 0
  let errorCount = 0
  const batchSize = 100

  for (let i = 0; i < sheetsToFix.length; i += batchSize) {
    const batch = sheetsToFix.slice(i, i + batchSize)

    // Update each sheet in the batch
    for (const sheet of batch) {
      const { error: updateError } = await supabase
        .from('sheets')
        .update({
          company_id: sheet.original_requestor_assoc_id
        })
        .eq('id', sheet.id)

      if (updateError) {
        console.error(`❌ Error updating sheet ${sheet.id}:`, updateError)
        errorCount++
      } else {
        successCount++
      }
    }

    console.log(`Progress: ${Math.min(i + batchSize, sheetsToFix.length)}/${sheetsToFix.length} sheets processed`)
  }

  console.log(`\n✅ Successfully updated ${successCount} sheets`)
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} sheets`)
  }

  // Verify the fix
  console.log('\n🔍 Verifying fix...')

  const { count: stillSelfAssigned } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', 'assigned_to_company_id')

  const { count: nowProperlyAssigned } = await supabase
    .from('sheets')
    .select('*', { count: 'exact', head: true })
    .neq('company_id', 'assigned_to_company_id')

  console.log(`\nAfter fix:`)
  console.log(`  - Self-assigned (company_id = assigned_to_company_id): ${stillSelfAssigned}`)
  console.log(`  - Properly assigned (company_id != assigned_to_company_id): ${nowProperlyAssigned}`)

  // Show sample of fixed data
  const { data: sampleFixed } = await supabase
    .from('sheets')
    .select('id, company_id, assigned_to_company_id, original_requestor_assoc_id')
    .neq('company_id', 'assigned_to_company_id')
    .limit(3)

  console.log('\n📊 Sample of fixed data:')
  console.log(sampleFixed)

  console.log('\n✅ Fix complete!')
}

fixSheetAssignments().catch(console.error)
