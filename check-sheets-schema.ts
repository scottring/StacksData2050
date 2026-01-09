import { supabase } from './src/migration/supabase-client.js'

async function checkSheetsSchema() {
  console.log('=== Checking Sheets Table Schema ===\n')

  const { data: sample, error } = await supabase
    .from('sheets')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.log(`Error: ${error.message}`)
    return
  }

  if (sample) {
    console.log('Available fields in sheets table:\n')
    Object.keys(sample).sort().forEach(field => {
      const value = sample[field]
      const type = value === null ? 'null' : typeof value
      console.log(`  ${field}: ${type}`)
    })

    console.log('\n=== Sample Sheet Data ===\n')
    console.log(JSON.stringify(sample, null, 2))
  }
}

checkSheetsSchema()
