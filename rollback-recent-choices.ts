import { supabase } from './src/migration/supabase-client.js'

console.log('=== ROLLING BACK RECENTLY CREATED CHOICES ===\n')

// The choices I created have no bubble_id (they were generated, not migrated)
// Check for today's date
const today = new Date().toISOString().split('T')[0]
const { data: recentChoices } = await supabase
  .from('choices')
  .select('id, content, parent_question_id, created_at, bubble_id')
  .is('bubble_id', null)
  .gte('created_at', `${today}T00:00:00Z`)

console.log(`Found ${recentChoices?.length} choices with null bubble_id created in last 5 minutes`)

if (recentChoices && recentChoices.length > 0) {
  console.log('\nSample:')
  recentChoices.slice(0, 5).forEach(c => {
    console.log(`  - "${c.content}" (created: ${c.created_at})`)
  })

  console.log(`\nDeleting ${recentChoices.length} choices...`)

  const ids = recentChoices.map(c => c.id)
  const { error } = await supabase
    .from('choices')
    .delete()
    .in('id', ids)

  if (error) {
    console.error(`Error: ${error.message}`)
  } else {
    console.log(`✓ Successfully deleted ${ids.length} choices`)
  }
}

// Verify final count
const { count } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log(`\nFinal choice count: ${count}`)
