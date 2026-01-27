import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findGoodTestSheet() {
  console.log('=== Finding Good Production Sheet to Test ===\n')

  // Get all sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, contact_user_id, modified_at')
    .order('modified_at', { ascending: false })
    .limit(100)

  // Filter out obvious test patterns
  const testPatterns = ['import test', 'unknown']

  const productionSheets = sheets?.filter(s =>
    s.name &&
    s.name.trim().length > 0 &&
    !testPatterns.some(pattern => s.name.toLowerCase().includes(pattern.toLowerCase()))
  ) || []

  console.log(`Found ${productionSheets.length} recent production sheets\n`)

  // Get answer counts for each
  console.log('Top 10 production sheets with answer counts:\n')

  for (const sheet of productionSheets.slice(0, 10)) {
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', sheet.company_id)
      .single()

    console.log(`${sheet.name}`)
    console.log(`  Company: ${company?.name || 'Unknown'}`)
    console.log(`  Answers: ${count}`)
    console.log(`  Sheet ID: ${sheet.id}`)
    console.log(`  Modified: ${sheet.modified_at ? new Date(sheet.modified_at).toLocaleDateString() : 'N/A'}`)
    console.log(`  URL: http://localhost:3002/sheets/${sheet.id}/demo`)
    console.log('')
  }
}

findGoodTestSheet().catch(console.error)
