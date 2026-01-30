import { supabase } from './src/migration/supabase-client.js'

async function checkSchema() {
  console.log('Checking answers table schema and data...\n')
  
  // Get a sample answer to see the schema
  const { data: sampleAnswer } = await supabase
    .from('answers')
    .select('*')
    .limit(1)
    .single()
  
  if (sampleAnswer) {
    console.log('Sample answer fields:')
    console.log(Object.keys(sampleAnswer).sort().join(', '))
    console.log('\nSample data:')
    console.log(sampleAnswer)
  }
  
  // Check specifically for HYDROCARB sheets
  const hydrocarbSheetIds = [
    '8a3424ae-49d9-4f8a-a4af-fda13a222b28',
    '8222b70c-14dd-48ab-8ceb-e972c9d797c3',
    'fc48461e-7a18-4cb1-887e-1a3686244ef0'
  ]
  
  console.log('\n\nChecking for answers with sheet_id:')
  for (const sheetId of hydrocarbSheetIds) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', sheetId)
    
    console.log('  sheet_id = ' + sheetId + ': ' + (count || 0) + ' answers')
  }
  
  console.log('\nChecking for answers with parent_sheet_id:')
  for (const sheetId of hydrocarbSheetIds) {
    const { count } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('parent_sheet_id', sheetId)
    
    console.log('  parent_sheet_id = ' + sheetId + ': ' + (count || 0) + ' answers')
  }
}

checkSchema()
