import { supabase } from './src/migration/supabase-client.js'

async function checkSchema() {
  const { data } = await supabase.from('users').select('*').limit(1)
  console.log('Users table columns:', Object.keys(data?.[0] || {}))
}

checkSchema()
