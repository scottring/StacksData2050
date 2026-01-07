import { supabase } from './src/migration/supabase-client.js'

console.log('=== ROLLING BACK IN BATCHES ===\n')

const today = new Date().toISOString().split('T')[0]
const { data: toDelete } = await supabase
  .from('choices')
  .select('id')
  .is('bubble_id', null)
  .gte('created_at', `${today}T00:00:00Z`)

console.log(`Found ${toDelete?.length} choices to delete\n`)

if (toDelete && toDelete.length > 0) {
  // Delete in batches of 50
  const batchSize = 50
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize)
    const ids = batch.map(c => c.id)

    console.log(`Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toDelete.length / batchSize)} (${ids.length} records)...`)

    const { error } = await supabase
      .from('choices')
      .delete()
      .in('id', ids)

    if (error) {
      console.error(`  Error: ${error.message}`)
    } else {
      console.log(`  ✓ Deleted ${ids.length}`)
    }
  }
}

const { count } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log(`\nFinal count: ${count}`)
