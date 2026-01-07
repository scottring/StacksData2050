import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING DUPLICATE BIOCIDES CHOICES ===\n')

// Question IDs that have duplicates (from our analysis)
const questionIds = [
  '4363a3a6-c74f-46fd-ba64-f06196d0bae9', // Q1
]

// Get all choices
const { data: allChoices } = await supabase
  .from('choices')
  .select('*')

for (const qId of questionIds) {
  const choices = allChoices?.filter(c => c.parent_question_id === qId) || []

  console.log(`Question ID: ${qId}`)
  console.log(`Total choices: ${choices.length}`)

  // Group by content
  const grouped = new Map<string, any[]>()
  choices.forEach(c => {
    const key = c.content || 'null'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(c)
  })

  console.log(`Unique contents: ${grouped.size}`)

  // For each content, keep only the oldest one (by created_at)
  for (const [content, dupes] of grouped.entries()) {
    if (dupes.length > 1) {
      console.log(`\n  "${content}" has ${dupes.length} duplicates`)

      // Sort by created_at, keep first (oldest)
      dupes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const keep = dupes[0]
      const toDelete = dupes.slice(1)

      console.log(`  Keeping: ${keep.id} (created ${keep.created_at})`)
      console.log(`  Deleting ${toDelete.length} duplicates:`)

      for (const dup of toDelete) {
        console.log(`    - ${dup.id}`)
        const { error } = await supabase
          .from('choices')
          .delete()
          .eq('id', dup.id)

        if (error) {
          console.error(`      ERROR: ${error.message}`)
        }
      }
    }
  }
  console.log()
}

console.log('\n=== VERIFICATION ===')
for (const qId of questionIds) {
  const { data: remaining } = await supabase
    .from('choices')
    .select('content')
    .eq('parent_question_id', qId)

  console.log(`\nQuestion ${qId}:`)
  remaining?.forEach(c => console.log(`  - ${c.content}`))
}
