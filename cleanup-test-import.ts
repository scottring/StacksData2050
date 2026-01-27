import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAndClean() {
  const sheetId = '1db0649e-1ac1-406b-b758-24b6c3f07833'

  // Check what we imported
  const { data: answers } = await supabase
    .from('answers')
    .select('id, text_value, choice_id, number_value')
    .eq('sheet_id', sheetId)

  console.log('=== IMPORTED ANSWERS BREAKDOWN ===')

  let zeroCount = 0
  let realAnswers = 0
  for (const a of answers || []) {
    if (a.text_value === '0') {
      zeroCount++
    } else if (a.text_value || a.choice_id) {
      realAnswers++
    }
  }

  console.log('Total answers:', answers?.length)
  console.log('"0" placeholder values:', zeroCount)
  console.log('Real answers:', realAnswers)

  // Delete the test sheet's answers so we can re-import properly
  console.log('\nDeleting all answers from test sheet...')

  const { error: deleteError } = await supabase
    .from('answers')
    .delete()
    .eq('sheet_id', sheetId)

  if (deleteError) {
    console.log('Delete error:', deleteError.message)
  } else {
    console.log('Deleted successfully')
  }

  // Also delete list_table_rows that are now orphaned
  const { data: listRows } = await supabase
    .from('list_table_rows')
    .select('id')

  let orphanedCount = 0
  if (listRows) {
    for (const row of listRows) {
      const { count } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('list_table_row_id', row.id)

      if (count === 0) {
        await supabase.from('list_table_rows').delete().eq('id', row.id)
        orphanedCount++
      }
    }
  }

  console.log(`Cleaned up ${orphanedCount} orphaned list_table_rows`)

  // Verify cleanup
  const { count: remainingCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId)

  console.log(`\nRemaining answers in test sheet: ${remainingCount}`)
}

checkAndClean().catch(console.error)
