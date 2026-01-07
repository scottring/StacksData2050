import { supabase } from './src/migration/supabase-client.js'

console.log('=== CHECKING AQURATE REQUEST SHEET_ID ===\n')

// Find requests for Aqurate products
const { data: requests } = await supabase
  .from('requests')
  .select('id, sheet_id, product_name, requestor_id')
  .ilike('product_name', '%Aqurate HA 25 ME 60%')

console.log(`Found ${requests?.length} requests:\n`)

for (const req of requests || []) {
  console.log(`Product: ${req.product_name}`)
  console.log(`Sheet ID in request: ${req.sheet_id}`)

  // Check if this sheet exists
  if (req.sheet_id) {
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, name')
      .eq('id', req.sheet_id)
      .maybeSingle()

    if (sheet) {
      console.log(`  ✓ Sheet exists: ${sheet.name}`)

      // Count answers
      const { count } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', req.sheet_id)

      console.log(`  Answers: ${count}`)
    } else {
      console.log(`  ❌ Sheet does NOT exist in database!`)
    }
  } else {
    console.log(`  No sheet_id set`)
  }
  console.log()
}
