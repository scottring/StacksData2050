import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_BASE_URL = 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

console.log('=== IMPORTING MISSING CHOICES FROM BUBBLE ===\n')

// Get questions that have answers with orphaned choices
const orphanedChoices = {
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43': 'Yes',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72': 'No',
  '513d4977-f90c-4472-9f99-5e28fef3c82d': 'not assessed'
}

console.log('Step 1: Finding all questions with orphaned answers...\n')

// Get all answers with orphaned choices
let allOrphanedAnswers: any[] = []
for (const orphanedChoiceId of Object.keys(orphanedChoices)) {
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

const questionIdsWithOrphanedAnswers = [...new Set(allOrphanedAnswers.map(a => a.parent_question_id).filter(Boolean))]
console.log(`Found ${questionIdsWithOrphanedAnswers.length} questions with orphaned answers\n`)

console.log('Step 2: Check which questions are missing Yes/No/Not assessed choices...\n')

const questionsMissingChoices = []

for (const questionId of questionIdsWithOrphanedAnswers) {
  // Get question details
  const { data: question } = await supabase
    .from('questions')
    .select('id, name, bubble_id, order_number, parent_section_id, sections(name)')
    .eq('id', questionId)
    .single()

  if (!question || !question.bubble_id) continue

  // Check existing choices
  const { data: choices } = await supabase
    .from('choices')
    .select('content')
    .eq('parent_question_id', questionId)

  const hasYes = choices?.some(c => c.content?.toLowerCase() === 'yes')
  const hasNo = choices?.some(c => c.content?.toLowerCase() === 'no')
  const hasNotAssessed = choices?.some(c => c.content?.toLowerCase() === 'not assessed')

  if (!hasYes || !hasNo || !hasNotAssessed) {
    questionsMissingChoices.push({
      id: questionId,
      bubble_id: question.bubble_id,
      name: question.name,
      section: (question as any).sections?.name,
      order: question.order_number,
      missing: { yes: !hasYes, no: !hasNo, notAssessed: !hasNotAssessed }
    })
  }
}

console.log(`${questionsMissingChoices.length} questions need choices imported from Bubble\n`)

console.log('Step 3: Import choices from Bubble...\n')

let choicesCreated = 0
let choicesFailed = 0
let questionsProcessed = 0

for (const q of questionsMissingChoices) {
  try {
    // Fetch choices from Bubble for this question
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/choice?constraints=[{"key":"Parent Question","constraint_type":"equals","value":"${q.bubble_id}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    if (!response.ok) {
      if (choicesFailed < 5) {
        console.log(`  ❌ HTTP ${response.status} for ${q.section} Q${q.order}`)
      }
      choicesFailed++
      continue
    }

    const data = await response.json()
    const bubbleChoices = data.response?.results || []

    if (bubbleChoices.length === 0) {
      if (choicesFailed < 5) {
        console.log(`  ⚠️  No choices in Bubble for ${q.section} Q${q.order}: ${q.name?.substring(0, 40)}`)
      }
      choicesFailed++
      continue
    }

    // Create each choice
    let createdForThisQuestion = 0
    for (const bubbleChoice of bubbleChoices) {
      const content = bubbleChoice.Content || bubbleChoice.content

      if (!content) continue

      // Check if already exists
      const { data: existing } = await supabase
        .from('choices')
        .select('id')
        .eq('parent_question_id', q.id)
        .ilike('content', content)
        .maybeSingle()

      if (existing) continue

      // Create the choice
      const { error } = await supabase
        .from('choices')
        .insert({
          parent_question_id: q.id,
          content: content,
          bubble_id: bubbleChoice._id,
          created_at: bubbleChoice['Created Date'] || new Date().toISOString(),
          modified_at: bubbleChoice['Modified Date'] || new Date().toISOString()
        })

      if (error) {
        if (!error.message.includes('duplicate')) {
          if (choicesFailed < 5) {
            console.log(`  ❌ Error creating "${content}" for Q${q.order}: ${error.message}`)
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
      if (questionsProcessed % 10 === 0 || questionsProcessed <= 10) {
        console.log(`  ✓ [${questionsProcessed}/${questionsMissingChoices.length}] Created ${createdForThisQuestion} choices for ${q.section} Q${q.order}`)
      }
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100))

  } catch (err) {
    if (choicesFailed < 5) {
      console.log(`  ❌ Error for question ${q.bubble_id}: ${err}`)
    }
    choicesFailed++
  }
}

console.log(`\n=== IMPORT COMPLETE ===`)
console.log(`Questions processed: ${questionsProcessed}`)
console.log(`Choices created: ${choicesCreated}`)
console.log(`Failed: ${choicesFailed}`)
console.log(`\nNext step: Run remap script again to fix the 30k remaining answers`)
