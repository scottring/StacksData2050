import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data, error } = await supabase.from('sheets').select('*').limit(1)

  if (error) {
    console.error('Error:', error)
  } else if (data && data.length > 0) {
    console.log('Sheets table fields:', Object.keys(data[0]))
  } else {
    console.log('No sheets found')
  }
}

main()
