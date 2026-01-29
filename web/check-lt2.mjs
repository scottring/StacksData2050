import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Find distinct response_types that contain 'list'
const { data: types } = await supabase
  .from('questions')
  .select('response_type')
  .ilike('response_type', '%list%')

const uniqueTypes = [...new Set(types?.map(t => t.response_type))]
console.log('Response types containing list:', uniqueTypes)

// Find question 3.1.2
const { data: q312 } = await supabase
  .from('questions')
  .select('id, name, response_type, list_table_id, section_sort_number')
  .eq('section_sort_number', 3)
  .order('order_number')
  .limit(10)

console.log('\nSection 3 questions:')
q312?.forEach(q => {
  console.log(`  - ${q.name?.substring(0, 60)}... | type: ${q.response_type} | lt_id: ${q.list_table_id || 'NULL'}`)
})
