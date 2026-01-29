import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Find question with 'specify the substance' in name
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, response_type, list_table_id')
  .ilike('name', '%specify%substance%')
  .limit(5)

console.log('Questions matching specify substance:')
questions?.forEach(q => {
  console.log(`  id: ${q.id}`)
  console.log(`  name: ${q.name}`)
  console.log(`  response_type: ${q.response_type}`)
  console.log(`  list_table_id: ${q.list_table_id || 'NULL'}`)
  console.log()
})

// Now let's check a List table type question
const { data: ltQuestions } = await supabase
  .from('questions')
  .select('id, name, response_type, list_table_id')
  .or('response_type.eq.List table,response_type.eq.PIDSL List')
  .limit(5)

console.log('\nList table type questions:')
ltQuestions?.forEach(q => {
  console.log(`  ${q.name?.substring(0, 50)} | lt_id: ${q.list_table_id || 'NULL'}`)
})
