import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Find list table questions and check if they have list_table_id
const { data: ltQuestions } = await supabase
  .from('questions')
  .select('id, name, response_type, list_table_id')
  .eq('response_type', 'List table')
  .limit(10)

console.log('List table questions:')
ltQuestions?.forEach(q => {
  console.log(`  - ${q.name?.substring(0, 50)}... | list_table_id: ${q.list_table_id || 'NULL'}`)
})

// Count columns
const { count } = await supabase
  .from('list_table_columns')
  .select('*', { count: 'exact', head: true })

console.log(`\nTotal list_table_columns: ${count}`)
