import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugKathon() {
  console.log('\n🔍 Debugging Kathon 886 Sheets\n')
  console.log('='.repeat(60))

  // Get Kathon chemical
  const { data: kathon } = await supabase
    .from('chemical_inventory')
    .select('id, chemical_name, cas_number')
    .eq('cas_number', '55965-84-9')
    .single()

  console.log(`\nKathon Chemical:`)
  console.log(`  ID: ${kathon?.id}`)
  console.log(`  Name: ${kathon?.chemical_name}`)
  console.log(`  CAS: ${kathon?.cas_number}`)

  // Count sheet_chemicals entries
  const { count: totalEntries } = await supabase
    .from('sheet_chemicals')
    .select('*', { count: 'exact', head: true })
    .eq('chemical_id', kathon?.id)

  console.log(`\n  Total sheet_chemicals entries: ${totalEntries}`)

  // Get unique sheet IDs
  const { data: sheetChems } = await supabase
    .from('sheet_chemicals')
    .select('sheet_id, chemical_id')
    .eq('chemical_id', kathon?.id)

  const uniqueSheetIds = new Set(sheetChems?.map((sc: any) => sc.sheet_id))
  console.log(`  Unique sheet IDs: ${uniqueSheetIds.size}`)

  // Now try the nested query (what the page uses)
  const { data: nestedQuery, error } = await supabase
    .from('sheet_chemicals')
    .select(`
      sheet_id,
      concentration,
      concentration_unit,
      sheets (
        id,
        name,
        new_status,
        created_at,
        companies!sheets_company_id_fkey (
          name
        )
      )
    `)
    .eq('chemical_id', kathon?.id)
    .limit(5)

  if (error) {
    console.log(`\n❌ Error with nested query:`, error)
  } else {
    console.log(`\n✅ Nested query returned ${nestedQuery?.length} results`)
    console.log(`\nSample results:`)
    nestedQuery?.forEach((sc: any, idx: number) => {
      console.log(`  ${idx + 1}. Sheet ID: ${sc.sheet_id}`)
      console.log(`     sheets object:`, sc.sheets ? 'Present' : 'NULL')
      if (sc.sheets) {
        console.log(`     Product: ${sc.sheets.name}`)
        console.log(`     Status: ${sc.sheets.new_status}`)
        console.log(`     Company: ${sc.sheets.companies?.name || 'Unknown'}`)
      }
    })
  }
}

debugKathon().catch(console.error)
