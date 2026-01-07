import { supabase } from './src/migration/supabase-client.js'
import { config } from 'dotenv'
config()

const BUBBLE_API_URL = 'https://app.stacksdata.com/version-live/api/1.1'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

// Get questions that should have choices but don't
const { data: questions } = await supabase
  .from('questions')
  .select('id, bubble_id, name, question_type')

const { data: allChoices } = await supabase
  .from('choices')
  .select('parent_question_id')

const questionsWithChoices = new Set(allChoices?.map(c => c.parent_question_id))

const shouldHaveChoices = ['Select one Radio', 'Select one', 'dropdown', 'Dropdown']
const missingChoices = questions?.filter(q =>
  shouldHaveChoices.includes(q.question_type || '') &&
  !questionsWithChoices.has(q.id) &&
  q.bubble_id // Must have a bubble_id to fetch from
) || []

console.log(`=== FETCHING CHOICES FROM BUBBLE FOR ${missingChoices.length} QUESTIONS ===\n`)

let successCount = 0
let failCount = 0
const choicesToInsert: any[] = []

for (const q of missingChoices) {
  console.log(`\nFetching choices for: ${q.name?.substring(0, 60)}`)
  console.log(`  Bubble ID: ${q.bubble_id}`)
  console.log(`  Supabase ID: ${q.id}`)

  try {
    // Fetch choices from Bubble for this question
    const response = await fetch(
      `${BUBBLE_API_URL}/obj/choice?constraints=[{"key":"Parent Question","constraint_type":"equals","value":"${q.bubble_id}"}]`,
      {
        headers: {
          'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
        }
      }
    )

    const data = await response.json()

    if (data.response?.results) {
      const choices = data.response.results
      console.log(`  ✓ Found ${choices.length} choices`)

      choices.forEach((choice: any, idx: number) => {
        console.log(`    ${idx + 1}. ${choice.Name || choice.Content}`)

        choicesToInsert.push({
          bubble_id: choice._id,
          content: choice.Name || choice.Content,
          parent_question_id: q.id,
          order_number: choice['Order Number'] || idx + 1,
          created_at: choice['Created Date'],
          modified_at: choice['Modified Date']
        })
      })

      successCount++
    } else {
      console.log(`  ✗ No choices found or error: ${JSON.stringify(data)}`)
      failCount++
    }
  } catch (error: any) {
    console.error(`  ✗ Error: ${error.message}`)
    failCount++
  }

  // Rate limit: wait 100ms between requests
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log(`\n\n=== SUMMARY ===`)
console.log(`Success: ${successCount}`)
console.log(`Failed: ${failCount}`)
console.log(`Choices to insert: ${choicesToInsert.length}`)

if (choicesToInsert.length > 0) {
  console.log(`\nInserting ${choicesToInsert.length} choices into Supabase...`)

  const { data, error } = await supabase
    .from('choices')
    .insert(choicesToInsert)

  if (error) {
    console.error(`Error inserting choices: ${error.message}`)
  } else {
    console.log(`✓ Successfully inserted ${choicesToInsert.length} choices!`)
  }
}
