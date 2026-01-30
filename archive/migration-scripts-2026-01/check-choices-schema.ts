import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const { data, error } = await supabase
    .from('choices')
    .select('*')
    .limit(3)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Choice table columns:', Object.keys(data?.[0] || {}))
  console.log('\nSample choices:')
  data?.forEach(c => {
    console.log(JSON.stringify(c, null, 2))
  })
}

main().catch(console.error)
