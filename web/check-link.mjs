import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check list_table_columns structure
const { data: cols, error } = await supabase
  .from('list_table_columns')
  .select('*')
  .limit(3)

if (error) console.log('Error:', error)
else {
  console.log('Sample list_table_columns:')
  console.log('Columns:', Object.keys(cols[0]).sort().join(', '))
  cols.forEach(c => {
    console.log(`\n  id: ${c.id}`)
    console.log(`  name: ${c.name}`)
    console.log(`  parent_table_id: ${c.parent_table_id}`)
    console.log(`  question_id: ${c.question_id || 'N/A'}`)
  })
}

// Check if there's a list_tables table
const { data: lt } = await supabase
  .from('list_tables')
  .select('*')
  .limit(3)

console.log('\nlist_tables sample:', lt)
