import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Infer question→column links from existing answers
const { data: links } = await supabase
  .from('answers')
  .select('question_id, list_table_column_id')
  .not('list_table_column_id', 'is', null)

// Group by question
const questionColumns = new Map()
links?.forEach(l => {
  if (!questionColumns.has(l.question_id)) {
    questionColumns.set(l.question_id, new Set())
  }
  questionColumns.get(l.question_id).add(l.list_table_column_id)
})

console.log(`Found ${questionColumns.size} questions with list table columns`)
console.log('\nQuestion → Column mappings:')
for (const [qId, colIds] of questionColumns) {
  console.log(`  ${qId}: ${colIds.size} columns`)
}

// Now update list_table_columns to set question_id
console.log('\n--- Updating list_table_columns.question_id ---')
let updated = 0
for (const [questionId, columnIds] of questionColumns) {
  for (const columnId of columnIds) {
    const { error } = await supabase
      .from('list_table_columns')
      .update({ question_id: questionId })
      .eq('id', columnId)
    
    if (error) {
      console.log(`Error updating ${columnId}:`, error.message)
    } else {
      updated++
    }
  }
}
console.log(`Updated ${updated} column records`)
