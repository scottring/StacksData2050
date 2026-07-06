import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function inspect() {
  const { data, error } = await supabase.from('users').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
    return
  }
  console.log('Users table columns:')
  console.log(Object.keys(data[0] || {}).join('\n'))
  console.log('\nSample data:')
  console.log(JSON.stringify(data[0], null, 2))
}

inspect()
