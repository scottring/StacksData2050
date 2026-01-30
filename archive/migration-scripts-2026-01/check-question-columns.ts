import { supabase } from './src/migration/supabase-client.js'

async function checkColumns() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error:', error)
  } else if (data && data.length > 0) {
    console.log('Question columns:', Object.keys(data[0]))
    console.log('\nSample question:', JSON.stringify(data[0], null, 2))
  }
}

checkColumns().then(() => process.exit(0))
