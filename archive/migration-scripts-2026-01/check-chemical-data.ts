import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkChemicalData() {
  console.log('\n📊 Checking Chemical Inventory Data\n')
  console.log('='.repeat(60))

  // Total chemicals
  const { count: totalChemicals, error: totalError } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotal Chemicals: ${totalChemicals}`)

  // Sample chemicals with flags
  const { data: sampleChemicals, error: sampleError } = await supabase
    .from('chemical_inventory')
    .select('chemical_name, cas_number, is_pfas, is_reach_svhc, is_prop65, risk_level')
    .limit(10)

  console.log('\nSample Chemicals:')
  console.table(sampleChemicals)

  // Count regulatory flags
  const { count: pfasCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_pfas', true)

  const { count: reachCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_reach_svhc', true)

  const { count: prop65Count } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('is_prop65', true)

  const { count: highRiskCount } = await supabase
    .from('chemical_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('risk_level', 'high')

  console.log(`\nRegulatory Flags:`)
  console.log(`  PFAS: ${pfasCount}`)
  console.log(`  REACH SVHC: ${reachCount}`)
  console.log(`  Prop 65: ${prop65Count}`)
  console.log(`  High Risk: ${highRiskCount}`)

  // Check sheet_chemicals junction table
  const { count: totalSheetChemicals } = await supabase
    .from('sheet_chemicals')
    .select('*', { count: 'exact', head: true })

  console.log(`\nSheet-Chemical Relationships: ${totalSheetChemicals}`)

  // Check how many sheets each chemical appears in
  const { data: sheetChems } = await supabase
    .from('sheet_chemicals')
    .select('chemical_id, sheet_id')

  // Group by chemical_id and count unique sheets
  const chemicalSheetMap = new Map<string, Set<string>>()
  sheetChems?.forEach((sc: any) => {
    if (!chemicalSheetMap.has(sc.chemical_id)) {
      chemicalSheetMap.set(sc.chemical_id, new Set())
    }
    chemicalSheetMap.get(sc.chemical_id)!.add(sc.sheet_id)
  })

  const chemicalSheetCounts = Array.from(chemicalSheetMap.entries()).map(([chemical_id, sheets]) => ({
    chemical_id,
    count: sheets.size
  }))

  console.log('\nChemicals by Sheet Count (top 10):')
  const sortedCounts = chemicalSheetCounts
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

  for (const item of sortedCounts) {
    const { data: chemical } = await supabase
      .from('chemical_inventory')
      .select('chemical_name, cas_number')
      .eq('id', item.chemical_id)
      .single()

    console.log(`  ${chemical?.chemical_name || 'Unknown'} (${chemical?.cas_number}): ${item.count} sheets`)
  }

  // Check if the page query is correct
  console.log('\n\n🔍 Testing Page Query\n')
  console.log('='.repeat(60))

  const { data: chemicals, error: queryError } = await supabase
    .from('chemical_inventory')
    .select(`
      *,
      sheet_chemicals(count)
    `)
    .order('chemical_name')
    .limit(5)

  console.log('\nPage Query Results (first 5):')
  if (queryError) {
    console.error('Query Error:', queryError)
  } else {
    chemicals?.forEach(chem => {
      const sheetCount = Array.isArray(chem.sheet_chemicals)
        ? chem.sheet_chemicals.length
        : (chem.sheet_chemicals as any)?.count || 0
      console.log(`  ${chem.chemical_name}: ${sheetCount} sheets`)
    })
  }
}

checkChemicalData().catch(console.error)
