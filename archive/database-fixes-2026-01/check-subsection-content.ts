import { supabase } from './src/migration/supabase-client.js'

async function check() {
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number, content, help')
    .eq('section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
    .order('order_number')

  console.log('=== ECOLABEL SUBSECTIONS WITH CONTENT ===\n')

  subsections?.forEach(sub => {
    console.log(`${sub.order_number}. ${sub.name}`)
    console.log(`   Content: ${sub.content || 'NULL'}`)
    console.log(`   Help: ${sub.help || 'NULL'}`)
    console.log()
  })
}

check()
