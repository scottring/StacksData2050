import { supabase } from './src/migration/supabase-client.js'

async function main() {
  console.log('=== Checking Sections in Database ===\n')

  const { data: sections, error } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')

  console.log('Sections query error:', error)
  console.log('Total sections:', sections?.length || 0)

  if (sections && sections.length > 0) {
    console.log('\nSection names:')
    sections.forEach(s => {
      console.log(`  ${s.order_number}. ${s.name} (ID: ${s.id.substring(0, 8)})`)
    })
  } else {
    console.log('\n⚠️  NO SECTIONS FOUND IN DATABASE!')
  }
}

main().catch(console.error)
