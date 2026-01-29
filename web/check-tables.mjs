import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// List all tables
const { data, error } = await supabase
  .rpc('get_tables')

if (error) {
  // Try another approach - query information_schema
  console.log('Checking question-related patterns...')
  
  // Check choices table - maybe it has branching info
  const { data: choices } = await supabase
    .from('choices')
    .select('*')
    .limit(5)
  
  console.log('Sample choice:', choices?.[0])
}
