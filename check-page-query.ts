import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPageQuery() {
  console.log('\n🔍 Testing Page Query Structure\n')
  console.log('='.repeat(60))

  // This is the exact query from the page
  const { data: chemicals, error } = await supabase
    .from('chemical_inventory')
    .select(`
      *,
      sheet_chemicals(count)
    `)
    .order('chemical_name')
    .limit(5)

  if (error) {
    console.error('Query Error:', error)
    return
  }

  console.log('\nRaw Response Structure:')
  console.log(JSON.stringify(chemicals, null, 2))

  console.log('\n\nParsed Results:')
  chemicals?.forEach(chem => {
    console.log(`\nChemical: ${chem.chemical_name}`)
    console.log(`  sheet_chemicals type: ${typeof chem.sheet_chemicals}`)
    console.log(`  sheet_chemicals is array: ${Array.isArray(chem.sheet_chemicals)}`)
    console.log(`  sheet_chemicals value:`, chem.sheet_chemicals)

    const sheetCount = Array.isArray(chem.sheet_chemicals)
      ? chem.sheet_chemicals.length
      : 0
    console.log(`  Calculated count: ${sheetCount}`)
  })

  // Now test the correct query
  console.log('\n\n✅ CORRECT Query (without count aggregation):\n')
  console.log('='.repeat(60))

  const { data: correctChemicals, error: correctError } = await supabase
    .from('chemical_inventory')
    .select(`
      *,
      sheet_chemicals(sheet_id)
    `)
    .order('chemical_name')
    .limit(5)

  if (correctError) {
    console.error('Query Error:', correctError)
    return
  }

  console.log('\nResults with proper counting:')
  correctChemicals?.forEach(chem => {
    // Get unique sheet IDs
    const uniqueSheets = new Set(
      (chem.sheet_chemicals as any[])?.map((sc: any) => sc.sheet_id) || []
    )
    console.log(`  ${chem.chemical_name}: ${uniqueSheets.size} sheets`)
  })
}

checkPageQuery().catch(console.error)
