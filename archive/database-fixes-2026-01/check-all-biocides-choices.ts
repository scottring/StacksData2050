import { supabase } from './src/migration/supabase-client.js'

// Get Biocides section
const { data: section } = await supabase
  .from('sections')
  .select('id')
  .ilike('name', '%biocide%')
  .single()

// Get all questions
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, order_number')
  .eq('parent_section_id', section?.id)
  .order('order_number')

// Get all choices
const { data: allChoices } = await supabase
  .from('choices')
  .select('*')

console.log('=== BIOCIDES CHOICE ANALYSIS ===\n')

for (const q of questions || []) {
  const choices = allChoices?.filter(c => c.parent_question_id === q.id) || []

  console.log(`Q${q.order_number}: ${q.name?.substring(0, 50)}`)
  console.log(`  Choices: ${choices.length}`)

  if (choices.length > 0) {
    const uniqueContents = new Set(choices.map(c => c.content))
    console.log(`  Unique: ${uniqueContents.size}`)
    if (uniqueContents.size !== choices.length) {
      console.log(`  ⚠️  HAS DUPLICATES!`)
      Array.from(uniqueContents).forEach(content => {
        const count = choices.filter(c => c.content === content).length
        if (count > 1) {
          console.log(`     "${content}" appears ${count} times`)
        }
      })
    }
  }
  console.log()
}
