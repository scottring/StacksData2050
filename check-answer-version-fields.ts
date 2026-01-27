import { supabase } from './src/migration/supabase-client.js'

async function checkVersionFields() {
  const { data } = await supabase
    .from('answers')
    .select('*')
    .limit(1)
    .single()

  if (data) {
    console.log('Answer table columns with "version" in name:\n')
    Object.keys(data).filter(k => k.toLowerCase().includes('version')).forEach(key => {
      console.log(`  ${key}: ${data[key]}`)
    })

    console.log('\nAll columns (sorted):\n')
    Object.keys(data).sort().forEach(key => {
      console.log(`  ${key}`)
    })
  }
}

checkVersionFields().catch(console.error)
