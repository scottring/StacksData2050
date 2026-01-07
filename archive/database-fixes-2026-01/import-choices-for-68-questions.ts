import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_BASE_URL = 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

console.log('=== IMPORTING CHOICES FOR 68 QUESTIONS ===\n')

// Get all answers with orphaned choices
const orphanedChoices = [
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72',
  '513d4977-f90c-4472-9f99-5e28fef3c82d'
]

let allOrphanedAnswers: any[] = []
for (const orphanedChoiceId of orphanedChoices) {
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: answers } = await supabase
      .from('answers')
      .select('parent_question_id')
      .eq('choice_id', orphanedChoiceId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!answers || answers.length === 0) break
    allOrphanedAnswers = allOrphanedAnswers.concat(answers)
    page++
    if (answers.length < pageSize) break
  }
}

const questionIds = [...new Set(allOrphanedAnswers.map(a => a.parent_question_id).filter(Boolean))]
console.log(`Found ${questionIds.length} questions to process\n`)

// Get question details with bubble_ids
const { data: questions } = await supabase
  .from('questions')
  .select('id, name, bubble_id, order_number, parent_section_id, sections(name)')
  .in('id', questionIds)

console.log(`Questions with bubble_ids: ${questions?.filter(q => q.bubble_id).length}\n`)

let choicesCreated = 0
let choicesFailed = 0
let questionsProcessed = 0

for (const question of questions || []) {
  if (!question.bubble_id) {
    console.log(`  ⚠️  Skipping question ${question.id} - no bubble_id`)
    choicesFailed++
    continue
  }

  try {
    // Fetch choices from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/choice?constraints=[{"key":"Parent Question","constraint_type":"equals","value":"${question.bubble_id}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    if (!response.ok) {
      if (choicesFailed < 5) {
        console.log(`  ❌ HTTP ${response.status} for question ${question.bubble_id}`)
      }
      choicesFailed++
      continue
    }

    const data = await response.json()
    const bubbleChoices = data.response?.results || []

    if (bubbleChoices.length === 0) {
      if (choicesFailed < 5) {
        const sectionName = (question as any).sections?.name || 'Unknown'
        console.log(`  ⚠️  No choices in Bubble for ${sectionName} Q${question.order_number}`)
      }
      choicesFailed++
      continue
    }

    // Create each choice
    let createdForThisQuestion = 0
    for (const bubbleChoice of bubbleChoices) {
      const content = bubbleChoice.Content || bubbleChoice.content

      if (!content) continue

      // Check if already exists (case-insensitive)
      const { data: existing } = await supabase
        .from('choices')
        .select('id')
        .eq('parent_question_id', question.id)
        .ilike('content', content)
        .maybeSingle()

      if (existing) continue

      // Create the choice
      const { error } = await supabase
        .from('choices')
        .insert({
          parent_question_id: question.id,
          content: content,
          bubble_id: bubbleChoice._id,
          created_at: bubbleChoice['Created Date'] || new Date().toISOString(),
          modified_at: bubbleChoice['Modified Date'] || new Date().toISOString()
        })

      if (error) {
        if (!error.message.includes('duplicate')) {
          if (choicesFailed < 5) {
            console.log(`  ❌ Error creating "${content}": ${error.message}`)
          }
          choicesFailed++
        }
      } else {
        choicesCreated++
        createdForThisQuestion++
      }
    }

    if (createdForThisQuestion > 0) {
      questionsProcessed++
      const sectionName = (question as any).sections?.name || 'Unknown'
      if (questionsProcessed % 10 === 0 || questionsProcessed <= 10) {
        console.log(`  ✓ [${questionsProcessed}] Created ${createdForThisQuestion} choices for ${sectionName} Q${question.order_number}`)
      }
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100))

  } catch (err) {
    if (choicesFailed < 5) {
      console.log(`  ❌ Error: ${err}`)
    }
    choicesFailed++
  }
}

console.log(`\n=== IMPORT COMPLETE ===`)
console.log(`Questions processed: ${questionsProcessed}`)
console.log(`Choices created: ${choicesCreated}`)
console.log(`Failed: ${choicesFailed}`)
console.log(`\nNext: Run remap script again to fix remaining orphaned answers`)
