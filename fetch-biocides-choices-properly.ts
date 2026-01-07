import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

console.log('=== FETCHING BIOCIDES CHOICES PROPERLY ===\n')

// Get Biocides questions from Supabase that don't have choices
const { data: questions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, order_number')
  .eq('parent_section_id', 'f990287b-6a17-43e2-b78e-bed24b977cc7')
  .order('order_number')

const { data: existingChoices } = await supabase
  .from('choices')
  .select('parent_question_id')

const questionsWithChoices = new Set(existingChoices?.map(c => c.parent_question_id))

const questionsNeedingChoices = questions?.filter(q => !questionsWithChoices.has(q.id)) || []

console.log(`Questions needing choices: ${questionsNeedingChoices.length}\n`)

const choicesToInsert: any[] = []

for (const q of questionsNeedingChoices) {
  console.log(`Fetching choices for Order ${q.order_number}: ${q.name?.substring(0, 60)}`)

  // Get question details from Bubble
  const qResponse = await fetch(
    `${BUBBLE_API_URL}/obj/question/${q.bubble_id}`,
    {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    }
  )

  const qData = await qResponse.json()

  if (qData.response) {
    // Get choices by searching for this question ID
    // Try a different approach - get ALL choices and filter client-side
    const choicesResponse = await fetch(
      `${BUBBLE_API_URL}/obj/choice`,
      {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      }
    )

    const choicesData = await choicesResponse.json()
    const allBubbleChoices = choicesData.response?.results || []

    // Filter for this question
    const questionChoices = allBubbleChoices.filter((c: any) => c['Parent Question'] === q.bubble_id)

    console.log(`  Found ${questionChoices.length} choices`)

    if (questionChoices.length > 0) {
      questionChoices.forEach((choice: any, idx: number) => {
        console.log(`    ${idx + 1}. ${choice.Name || choice.Content}`)

        choicesToInsert.push({
          bubble_id: choice._id,
          content: choice.Name || choice.Content,
          parent_question_id: q.id,
          order_number: choice['Order Number'] || (idx + 1),
          created_at: choice['Created Date'],
          modified_at: choice['Modified Date']
        })
      })
    }
  }

  console.log()
  await new Promise(resolve => setTimeout(resolve, 200)) // Rate limit
}

console.log(`\n=== SUMMARY ===`)
console.log(`Total choices to insert: ${choicesToInsert.length}`)

if (choicesToInsert.length > 0) {
  console.log('\nInserting choices...')

  const { error } = await supabase
    .from('choices')
    .insert(choicesToInsert)

  if (error) {
    console.error(`Error: ${error.message}`)
  } else {
    console.log(`✓ Successfully inserted ${choicesToInsert.length} choices`)
  }
}
