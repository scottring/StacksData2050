import { supabase } from './src/migration/supabase-client.js'

// The question at order 4 that appears as 3.1.3.1
const questionId = '1621986483500x603202081932705800'

console.log('=== INVESTIGATING ORDER 4 QUESTION ===\n')

// Get the question details
const { data: question } = await supabase
  .from('questions')
  .select('*')
  .eq('bubble_id', questionId)
  .single()

console.log('Question:', question?.name)
console.log('Order:', question?.order_number)
console.log('Bubble ID:', question?.bubble_id)
console.log('Section ID:', question?.parent_section_id)
console.log('Subsection ID:', question?.parent_subsection_id)
console.log('Dependent:', question?.dependent_no_show)

// Get section name
const { data: section } = await supabase
  .from('sections')
  .select('name')
  .eq('id', question?.parent_section_id)
  .single()

console.log('Section Name:', section?.name)

// Search for similar questions across database
console.log('\n=== SEARCHING FOR SIMILAR QUESTIONS ===\n')

const { data: similarQuestions } = await supabase
  .from('questions')
  .select('id, name, parent_section_id, order_number, sections(name)')
  .ilike('name', '%Article 95%PT%')

console.log(`Found ${similarQuestions?.length} questions mentioning "Article 95" and "PT":\n`)

similarQuestions?.forEach(q => {
  console.log(`- ${q.name}`)
  console.log(`  Section: ${q.sections?.name}`)
  console.log(`  Order: ${q.order_number}`)
  console.log()
})
