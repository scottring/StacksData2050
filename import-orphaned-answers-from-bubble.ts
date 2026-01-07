import { supabase } from './src/migration/supabase-client.js'

const BUBBLE_BASE_URL = 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = '25c9fbc54eb17e72b4d0e344e1a4a2fe'

console.log('=== IMPORTING ORPHANED ANSWERS FROM BUBBLE ===\n')

// The orphaned choice IDs
const orphanedChoices = {
  'dc4231ff-387d-4c27-8aeb-1c81738b7d43': 'Yes',
  '3f6353a7-cc0a-4d36-a8a7-a97c623b0d72': 'No',
  '513d4977-f90c-4472-9f99-5e28fef3c82d': 'not assessed'
}

console.log('Step 1: Get all answers using orphaned choices...\n')

// Get all answers using orphaned choices
const { data: brokenAnswers } = await supabase
  .from('answers')
  .select('id, parent_question_id, sheet_id, bubble_id')
  .in('choice_id', Object.keys(orphanedChoices))

console.log(`Found ${brokenAnswers?.length} broken answers`)

// Group by question
const byQuestion = new Map<string, any[]>()
brokenAnswers?.forEach(a => {
  if (a.parent_question_id) {
    if (!byQuestion.has(a.parent_question_id)) {
      byQuestion.set(a.parent_question_id, [])
    }
    byQuestion.get(a.parent_question_id)!.push(a)
  }
})

console.log(`Spread across ${byQuestion.size} questions\n`)

console.log('Step 2: For each question, check if it has Yes/No/Not assessed choices...\n')

const questionsNeedingChoices = []

for (const [questionId, answers] of byQuestion) {
  // Get question details
  const { data: question } = await supabase
    .from('questions')
    .select('id, name, bubble_id, order_number, parent_section_id, sections(name)')
    .eq('id', questionId)
    .single()

  if (!question) continue

  // Check existing choices
  const { data: choices } = await supabase
    .from('choices')
    .select('id, content')
    .eq('parent_question_id', questionId)

  const hasYes = choices?.some(c => c.content?.toLowerCase() === 'yes')
  const hasNo = choices?.some(c => c.content?.toLowerCase() === 'no')
  const hasNotAssessed = choices?.some(c => c.content?.toLowerCase() === 'not assessed')

  if (!hasYes || !hasNo || !hasNotAssessed) {
    questionsNeedingChoices.push({
      id: questionId,
      name: question.name,
      bubble_id: question.bubble_id,
      section: (question as any).sections?.name,
      order: question.order_number,
      answerCount: answers.length,
      missing: {
        yes: !hasYes,
        no: !hasNo,
        notAssessed: !hasNotAssessed
      }
    })
  }
}

console.log(`${questionsNeedingChoices.length} questions need choices created\n`)

// Sample first 10
console.log('Sample questions needing choices:')
questionsNeedingChoices.slice(0, 10).forEach(q => {
  console.log(`  ${q.section} Q${q.order}: ${q.name?.substring(0, 50)}`)
  console.log(`    Missing: ${q.missing.yes ? 'Yes ' : ''}${q.missing.no ? 'No ' : ''}${q.missing.notAssessed ? 'Not assessed' : ''}`)
  console.log(`    Bubble ID: ${q.bubble_id}`)
  console.log(`    Affected answers: ${q.answerCount}`)
})

console.log('\n\nStep 3: Import choices from Bubble for these questions...\n')

// For each question, fetch its choices from Bubble
let choicesCreated = 0
let choicesFailed = 0

for (const q of questionsNeedingChoices.slice(0, 20)) {  // Start with first 20 as test
  if (!q.bubble_id) {
    console.log(`  ⚠️  Skipping "${q.name?.substring(0, 40)}" - no bubble_id`)
    continue
  }

  try {
    // Fetch choices from Bubble for this question
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/choice?constraints=[{"key":"Parent Question","constraint_type":"equals","value":"${q.bubble_id}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    if (!response.ok) {
      console.log(`  ❌ HTTP ${response.status} for question ${q.bubble_id}`)
      choicesFailed++
      continue
    }

    const data = await response.json()
    const bubbleChoices = data.response?.results || []

    if (bubbleChoices.length === 0) {
      console.log(`  ⚠️  No choices in Bubble for "${q.name?.substring(0, 40)}"`)
      continue
    }

    // Create each choice in Supabase
    for (const bubbleChoice of bubbleChoices) {
      const content = bubbleChoice.Content || bubbleChoice.content

      if (!content) continue

      // Check if choice already exists with this content
      const { data: existing } = await supabase
        .from('choices')
        .select('id')
        .eq('parent_question_id', q.id)
        .eq('content', content)
        .maybeSingle()

      if (existing) {
        continue // Already exists
      }

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
          console.log(`  ❌ Error creating choice "${content}" for Q${q.order}: ${error.message}`)
          choicesFailed++
        }
      } else {
        choicesCreated++
      }
    }

    if (choicesCreated % 10 === 0 && choicesCreated > 0) {
      console.log(`  ✓ Created ${choicesCreated} choices so far...`)
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100))

  } catch (err) {
    console.log(`  ❌ Error for question ${q.bubble_id}: ${err}`)
    choicesFailed++
  }
}

console.log(`\n=== IMPORT COMPLETE (TEST RUN) ===`)
console.log(`Choices created: ${choicesCreated}`)
console.log(`Failed: ${choicesFailed}`)
console.log(`\nNOTE: This was a test run with first 20 questions only.`)
console.log(`Total questions needing choices: ${questionsNeedingChoices.length}`)
