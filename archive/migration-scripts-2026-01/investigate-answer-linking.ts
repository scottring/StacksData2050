import { supabase } from './src/migration/supabase-client.js'

console.log('=== Investigating Answer Linking ===\n')

// Check how answers are linked to sheets
const { data: sampleAnswers } = await supabase
  .from('answers')
  .select('id, sheet_id, parent_sheet_id, question_id, parent_question_id')
  .limit(10)

console.log('Sample answers structure:')
console.log(JSON.stringify(sampleAnswers, null, 2))

// Check which field is used for sheet linking
console.log('\n\nChecking answer counts by field:')

const { count: bySheetId } = await supabase
  .from('answers')
  .select('*', { count: 'exact', head: true })
  .not('sheet_id', 'is', null)

const { count: byParentSheetId } = await supabase
  .from('answers')
  .select('*', { count: 'exact', head: true })
  .not('parent_sheet_id', 'is', null)

console.log(`Answers with sheet_id: ${bySheetId}`)
console.log(`Answers with parent_sheet_id: ${byParentSheetId}`)

// Get UPM sheet with answers
console.log('\n\n=== Finding UPM Sheets with Answers ===')

const { data: upm } = await supabase
  .from('companies')
  .select('id')
  .eq('name', 'UPM')
  .single()

if (upm) {
  const { data: upmSheets } = await supabase
    .from('sheets')
    .select('id, name')
    .eq('company_id', upm.id)
    .limit(10)

  console.log(`\nChecking first 10 UPM sheets:`)
  for (const sheet of upmSheets || []) {
    // Try both fields
    const { count: countBySheetId } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)

    const { count: countByParentSheetId } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('parent_sheet_id', sheet.id)

    const total = (countBySheetId || 0) + (countByParentSheetId || 0)

    console.log(`${sheet.name}:`)
    console.log(`  sheet_id: ${countBySheetId}`)
    console.log(`  parent_sheet_id: ${countByParentSheetId}`)
    console.log(`  Total: ${total}`)
  }
}
