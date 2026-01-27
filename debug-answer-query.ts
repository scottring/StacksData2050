import { supabase } from './src/migration/supabase-client.js'

async function debugAnswers() {
  console.log('Debugging answer queries...\n')

  // Get a sample sheet
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, bubble_id')
    .limit(1)

  if (!sheets || sheets.length === 0) {
    console.log('No sheets found')
    return
  }

  const sheet = sheets[0]
  console.log(`Testing with sheet: ${sheet.bubble_id} (ID: ${sheet.id})\n`)

  // Try different query methods
  console.log('Method 1: count with head:true')
  const { count: count1, error: error1 } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('parent_sheet_id', sheet.id)

  console.log(`  Result: ${count1}`)
  if (error1) console.log(`  Error: ${error1.message}`)

  console.log('\nMethod 2: select with count')
  const { data: data2, count: count2, error: error2 } = await supabase
    .from('answers')
    .select('id', { count: 'exact' })
    .eq('parent_sheet_id', sheet.id)

  console.log(`  Result: ${count2} (data length: ${data2?.length})`)
  if (error2) console.log(`  Error: ${error2.message}`)

  console.log('\nMethod 3: full select')
  const { data: data3, error: error3 } = await supabase
    .from('answers')
    .select('id')
    .eq('parent_sheet_id', sheet.id)

  console.log(`  Result: ${data3?.length} answers`)
  if (error3) console.log(`  Error: ${error3.message}`)

  // Check answers table schema
  console.log('\nSample answer structure:')
  const { data: sampleAnswers } = await supabase
    .from('answers')
    .select('*')
    .limit(1)

  if (sampleAnswers && sampleAnswers.length > 0) {
    console.log('  Columns:', Object.keys(sampleAnswers[0]))
  }
}

debugAnswers().catch(console.error)
