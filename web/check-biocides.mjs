import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Get section 3 questions to see the structure
const { data, error } = await supabase
  .from('questions')
  .select('id, name, response_type, section_sort_number, subsection_sort_number, order_number')
  .eq('section_sort_number', 3)
  .order('subsection_sort_number')
  .order('order_number')
  .limit(20)

if (error) {
  console.log('Error:', error.message)
} else {
  console.log('Section 3 questions:')
  data?.forEach(q => {
    console.log(`  ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} | ${q.response_type?.padEnd(15)} | ${q.name?.substring(0,50)}`)
  })
}
