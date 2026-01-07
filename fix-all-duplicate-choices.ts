import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING ALL DUPLICATE CHOICES ===\n')

// Get all choices
const { data: allChoices } = await supabase
  .from('choices')
  .select('*')

console.log(`Total choices in database: ${allChoices?.length}\n`)

// Group choices by parent_question_id
const byQuestion = new Map<string, any[]>()
allChoices?.forEach(choice => {
  const qId = choice.parent_question_id
  if (!qId) return

  if (!byQuestion.has(qId)) {
    byQuestion.set(qId, [])
  }
  byQuestion.get(qId)!.push(choice)
})

console.log(`Questions with choices: ${byQuestion.size}\n`)

let totalDeleted = 0
let questionsFixed = 0

// For each question, deduplicate choices
for (const [questionId, choices] of byQuestion.entries()) {
  if (choices.length <= 1) continue

  // Group by content to find duplicates
  const byContent = new Map<string, any[]>()
  choices.forEach(c => {
    const content = c.content || 'NULL'
    if (!byContent.has(content)) {
      byContent.set(content, [])
    }
    byContent.get(content)!.push(c)
  })

  // Check if there are any duplicates
  const hasDuplicates = Array.from(byContent.values()).some(arr => arr.length > 1)

  if (hasDuplicates) {
    questionsFixed++
    console.log(`\nQuestion ${questionId}:`)
    console.log(`  Total choices: ${choices.length}`)
    console.log(`  Unique contents: ${byContent.size}`)

    // For each content, keep the oldest (by created_at), delete the rest
    for (const [content, dupes] of byContent.entries()) {
      if (dupes.length > 1) {
        // Sort by created_at (oldest first)
        dupes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        const keep = dupes[0]
        const toDelete = dupes.slice(1)

        console.log(`  "${content}": keeping ${keep.id}, deleting ${toDelete.length} duplicates`)

        for (const dup of toDelete) {
          const { error } = await supabase
            .from('choices')
            .delete()
            .eq('id', dup.id)

          if (error) {
            console.error(`    ERROR deleting ${dup.id}: ${error.message}`)
          } else {
            totalDeleted++
          }
        }
      }
    }
  }
}

console.log('\n=== SUMMARY ===')
console.log(`Questions with duplicates fixed: ${questionsFixed}`)
console.log(`Total duplicate choices deleted: ${totalDeleted}`)

// Verify final count
const { count: finalCount } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log(`\nFinal choice count: ${finalCount}`)
console.log(`Removed: ${(allChoices?.length || 0) - (finalCount || 0)} records`)
