import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Get actual column names from questions table
const { data, error } = await supabase
  .from('questions')
  .select('*')
  .limit(1)

if (error) console.log('Error:', error)
else {
  console.log('Columns in questions table:')
  console.log(Object.keys(data[0]).sort().join('\n'))
}
