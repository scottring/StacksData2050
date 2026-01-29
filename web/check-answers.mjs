import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check answers for list table data on an existing sheet
// First find a sheet that has list table answers
const { data: ltAnswers } = await supabase
  .from('answers')
  .select('*')
  .not('list_table_column_id', 'is', null)
  .limit(5)

console.log('List table answers sample:')
ltAnswers?.forEach(a => {
  console.log(`  question_id: ${a.question_id}`)
  console.log(`  list_table_column_id: ${a.list_table_column_id}`)
  console.log(`  list_table_row_id: ${a.list_table_row_id}`)
  console.log()
})

// Now get the column for that column_id
if (ltAnswers?.[0]?.list_table_column_id) {
  const { data: col } = await supabase
    .from('list_table_columns')
    .select('*')
    .eq('id', ltAnswers[0].list_table_column_id)
    .single()
  console.log('Matching column:', col)
}
