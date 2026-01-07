import { supabase } from './src/migration/supabase-client.js'

const { data: subsections } = await supabase
  .from('subsections')
  .select('name, content, help, order_number')
  .eq('section_id', '77c534ef-1f7a-4bec-9933-b31f1607817f')
  .order('order_number')

console.log('=== ECOLABEL SUBSECTIONS ===\n')

subsections?.forEach(sub => {
  console.log(`${sub.order_number}. ${sub.name}`)
  console.log(`   Content: ${sub.content ? sub.content.substring(0, 100) + '...' : 'NULL'}`)
  console.log(`   Help: ${sub.help ? sub.help.substring(0, 100) + '...' : 'NULL'}`)
  console.log()
})
