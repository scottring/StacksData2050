import { supabase } from './src/migration/supabase-client.js'

async function listSheets() {
  const { data, count, error } = await supabase
    .from('sheets')
    .select('id, name, company_id', { count: 'exact' })
    .order('name')
    .limit(20)

  console.log('Error:', error)
  console.log('Total sheets:', count)
  console.log('\nFirst 20 sheets:')
  data?.forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.name}`)
    console.log(`   ID: ${s.id}`)
  })
}

listSheets().catch(console.error)
