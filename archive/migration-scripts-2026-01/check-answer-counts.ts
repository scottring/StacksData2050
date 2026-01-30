import { supabase } from './src/migration/supabase-client.js'

async function checkAnswers() {
  console.log('Checking answer counts...\n')

  // Total answers
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })

  console.log(`Total answers in database: ${count}\n`)

  // Check a sample of sheets for answers
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, bubble_id')
    .limit(10)

  console.log('Checking first 10 sheets for answers:')
  for (const sheet of sheets || []) {
    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('parent_sheet_id', sheet.id)

    console.log(`  Sheet ${sheet.bubble_id}: ${answerCount} answers`)
  }
}

checkAnswers().catch(console.error)
