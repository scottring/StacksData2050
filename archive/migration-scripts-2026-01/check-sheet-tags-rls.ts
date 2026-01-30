import { supabase } from './src/migration/supabase-client.js'

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a'

async function checkRLS() {
  console.log('=== Checking sheet_tags with service role ===\n')

  const { data, error } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)

  if (error) {
    console.log('❌ Error:', error)
  } else {
    console.log(`✅ Found ${data?.length || 0} tags`)
    data?.forEach(st => {
      console.log(`  - ${st.tags?.name} (${st.tag_id})`)
    })
  }
}

checkRLS().catch(console.error)
