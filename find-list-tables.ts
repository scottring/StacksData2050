import { supabase } from './src/migration/supabase-client.js'

async function find() {
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, content, list_table_id, section_sort_number, order_number')
    .not('list_table_id', 'is', null)
    .order('section_sort_number')
    .limit(5)

  console.log('Questions with list tables:', questions?.length || 0)

  for (const q of questions || []) {
    console.log(`\nQ: ${q.name}`)
    console.log(`Content: ${q.content?.substring(0, 60)}`)

    const { data: cols } = await supabase
      .from('list_table_columns')
      .select('name, response_type')
      .eq('parent_table_id', q.list_table_id)

    console.log(`Columns: ${cols?.length || 0}`)
    cols?.forEach(c => console.log(`  - ${c.name}`))
  }
}

find()
