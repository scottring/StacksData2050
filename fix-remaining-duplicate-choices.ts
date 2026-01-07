import { supabase } from './src/migration/supabase-client.js'

console.log('=== FIXING REMAINING DUPLICATE CHOICES (WITH ANSWER MIGRATION) ===\n')

// Get all choices
const { data: allChoices } = await supabase
  .from('choices')
  .select('*')

console.log(`Total choices in database: ${allChoices?.length}\n`)

// Group by parent_question_id
const byQuestion = new Map<string, any[]>()
allChoices?.forEach(choice => {
  const qId = choice.parent_question_id
  if (!qId) return
  if (!byQuestion.has(qId)) byQuestion.set(qId, [])
  byQuestion.get(qId)!.push(choice)
})

let totalFixed = 0

for (const [questionId, choices] of byQuestion.entries()) {
  if (choices.length <= 1) continue

  // Group by content
  const byContent = new Map<string, any[]>()
  choices.forEach(c => {
    const content = c.content || 'NULL'
    if (!byContent.has(content)) byContent.set(content, [])
    byContent.get(content)!.push(c)
  })

  // Only process if duplicates exist
  const hasDuplicates = Array.from(byContent.values()).some(arr => arr.length > 1)
  if (!hasDuplicates) continue

  console.log(`\nQuestion ${questionId}:`)

  for (const [content, dupes] of byContent.entries()) {
    if (dupes.length <= 1) continue

    // Sort by created_at (oldest first)
    dupes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const keep = dupes[0]
    const toDelete = dupes.slice(1)

    console.log(`  "${content}": migrating ${toDelete.length} duplicates to ${keep.id}`)

    // FIRST: Update all answers that reference the duplicates to use the keeper
    for (const dup of toDelete) {
      // Find answers using this duplicate choice
      const { data: answers } = await supabase
        .from('answers')
        .select('id')
        .eq('choice_id', dup.id)

      if (answers && answers.length > 0) {
        console.log(`    Migrating ${answers.length} answers from ${dup.id} to ${keep.id}`)

        // Update them to use the keeper
        const { error: updateError } = await supabase
          .from('answers')
          .update({ choice_id: keep.id })
          .eq('choice_id', dup.id)

        if (updateError) {
          console.error(`    ERROR updating answers: ${updateError.message}`)
          continue // Don't try to delete if we couldn't migrate answers
        }
      }

      // NOW delete the duplicate choice
      const { error: deleteError } = await supabase
        .from('choices')
        .delete()
        .eq('id', dup.id)

      if (deleteError) {
        console.error(`    ERROR deleting ${dup.id}: ${deleteError.message}`)
      } else {
        totalFixed++
      }
    }
  }
}

console.log('\n=== SUMMARY ===')
console.log(`Total duplicate choices fixed: ${totalFixed}`)

// Final count
const { count: finalCount } = await supabase
  .from('choices')
  .select('*', { count: 'exact', head: true })

console.log(`Final choice count: ${finalCount}`)
