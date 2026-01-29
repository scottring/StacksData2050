import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Get all columns from a question
const { data, error } = await supabase
  .from('questions')
  .select('*')
  .limit(1)

if (error) {
  console.log('Error:', error.message)
} else {
  console.log('Question columns:')
  console.log(Object.keys(data[0]).sort().join('\n'))
}
