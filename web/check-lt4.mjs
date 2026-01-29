import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Just get some questions
const { data: questions, error } = await supabase
  .from('questions')
  .select('id, name, response_type, list_table_id')
  .limit(5)

if (error) console.log('Error:', error)
console.log('Sample questions:', questions)

// Count total
const { count } = await supabase
  .from('questions')
  .select('*', { count: 'exact', head: true })

console.log('Total questions:', count)
