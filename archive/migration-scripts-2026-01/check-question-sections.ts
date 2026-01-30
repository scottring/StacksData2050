import { supabase } from './src/migration/supabase-client.js'

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  console.log('=== Checking Question Section Distribution ===\n')

  // Get tags for this sheet
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id')
    .eq('sheet_id', sheetId)

  const tagIds = sheetTags?.map(st => st.tag_id) || []
  console.log(`Sheet has ${tagIds.length} tags\n`)

  // Get question IDs for these tags
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .in('tag_id', tagIds)

  const questionIds = [...new Set(questionTags?.map(qt => qt.question_id))]
  console.log(`${questionIds.length} questions match the tags\n`)

  // Get the questions with their sections
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, parent_section_id, sections!questions_parent_section_id_fkey(id, name)')
    .in('id', questionIds)

  // Count by section
  const sectionCounts = new Map<string, number>()
  questions?.forEach(q => {
    const section = q.sections as any
    const sectionName = section?.name || 'NO SECTION'
    sectionCounts.set(sectionName, (sectionCounts.get(sectionName) || 0) + 1)
  })

  console.log('Questions by section:')
  Array.from(sectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`  ${name}: ${count} questions`)
    })

  // Check if there are questions with null parent_section_id
  const questionsWithoutSection = questions?.filter(q => !q.parent_section_id) || []
  console.log(`\nQuestions without section: ${questionsWithoutSection.length}`)

  if (questionsWithoutSection.length > 0) {
    console.log('Sample questions without section:')
    questionsWithoutSection.slice(0, 5).forEach(q => {
      console.log(`  - ${q.name?.substring(0, 60)}...`)
    })
  }
}

main().catch(console.error)
