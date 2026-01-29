import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check if dependent_no_show exists and find dependent questions
const { data: deps, error } = await supabase
  .from('questions')
  .select('id, name, dependent_no_show, originating_question_id, order_number')
  .eq('dependent_no_show', true)
  .limit(10)

if (error) {
  console.log('Error:', error.message)
} else {
  console.log('Dependent questions found:', deps?.length)
  deps?.forEach(q => {
    console.log(`  ${q.name?.substring(0,50)} -> parent: ${q.originating_question_id}`)
  })
}
