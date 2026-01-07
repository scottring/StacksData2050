import { supabase } from './src/migration/supabase-client.js'

async function checkDbData() {
  // Count records in each table
  const tables = ['sections', 'subsections', 'questions', 'choices', 'answers', 'sheets']

  console.log('=== Database Table Counts ===\n')

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`  ${table}: ERROR - ${error.message}`)
    } else {
      console.log(`  ${table}: ${count} records`)
    }
  }

  // Get a sample section
  console.log('\n=== Sample Sections ===\n')
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, number')
    .order('number')
    .limit(10)

  if (sections && sections.length > 0) {
    sections.forEach(s => {
      console.log(`  ${s.number} - ${s.name} (${s.id})`)
    })
  } else {
    console.log('  No sections found')
  }
}

checkDbData()
