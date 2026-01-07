import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

console.log('=== UNDERSTANDING BIOCIDES MIGRATION ===\n')

// Get Biocides section from Supabase
const { data: section } = await supabase
  .from('sections')
  .select('*')
  .ilike('name', '%biocide%')
  .single()

console.log(`Supabase Section: ${section?.name}`)
console.log(`Bubble ID: ${section?.bubble_id}\n`)

// Get all Biocides questions from Supabase
const { data: supQuestions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number, question_type')
  .eq('parent_section_id', section?.id)
  .order('order_number')

console.log(`Supabase has ${supQuestions?.length} Biocides questions\n`)

// Now query Bubble using the section's bubble_id
console.log('Fetching from Bubble using section bubble_id...\n')

const bubbleResponse = await fetch(
  `${BUBBLE_API_URL}/obj/question?constraints=[{"key":"Parent Section","constraint_type":"equals","value":"${section?.bubble_id}"}]&sort_field=Order Number`,
  {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  }
)

const bubbleData = await bubbleResponse.json()
const bubbleQuestions = bubbleData.response?.results || []

console.log(`Bubble has ${bubbleQuestions.length} Biocides questions\n`)

console.log('=== COMPARISON ===\n')
console.log('Supabase questions:')
supQuestions?.forEach((q, idx) => {
  console.log(`  ${idx + 1}. Order ${q.order_number}: ${q.name?.substring(0, 60)}`)
  console.log(`     Bubble ID: ${q.bubble_id}`)
})

console.log('\n\nBubble questions:')
bubbleQuestions.forEach((q: any, idx: number) => {
  console.log(`  ${idx + 1}. Order ${q['Order Number']}: ${q.Name?.substring(0, 60)}`)
  console.log(`     Bubble ID: ${q._id}`)
})
