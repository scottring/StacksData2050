import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixBiocidesChoices() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Fixing Biocides Choice IDs ===\n')

  // Find "Yes" and "No" choices
  const { data: yesChoice } = await supabase
    .from('choices')
    .select('*')
    .eq('content', 'Yes')
    .limit(1)
    .single()

  const { data: noChoice } = await supabase
    .from('choices')
    .select('*')
    .eq('content', 'No')
    .limit(1)
    .single()

  console.log(`Yes choice ID: ${yesChoice?.id}`)
  console.log(`No choice ID: ${noChoice?.id}\n`)

  // According to user:
  // 3.1.2-3.1.5 should be "Yes"
  // 3.1.6-3.1.7 should be "No"
  // 3.1.8 already has "Yes"

  const questionIds = {
    '3.1.2': 'c34a58ea-66a6-42c7-b568-d521c3e37a3e', // should be Yes
    '3.1.3': 'fdb4202c-4903-42c3-90c1-10f15fd34cf5', // should be Yes (but this is answer ID, need question ID)
    '3.1.4': '5b1c126c-ccd8-4826-8b3a-ad73519f46b4', // should be Yes
    '3.1.5': 'de444072-ffd7-47f7-b6e1-585980fa1b8e', // should be Yes
    '3.1.6': '5a921ce7-6c34-4d35-ad04-b348879c098e', // should be No
    '3.1.7': 'd810c46d-91d0-491f-ad96-4a61270a1219', // should be No
  }

  // Get the questions to find their IDs correctly
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', '4f777663-616a-4fda-9e10-718c92d8470e') // Biocides subsection
    .order('order_number')

  console.log('Questions in subsection 3.1:')
  questions?.forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q.name?.substring(0, 60)}... (order ${q.order_number})`)
  })

  // Map by order_number to display number
  // order 3 = 3.1.3 (displays as 3.1.2 after removing dependent)
  // order 5 = 3.1.5 (displays as 3.1.3)
  // order 6 = 3.1.6 (displays as 3.1.4)
  // order 7 = 3.1.7 (displays as 3.1.5)
  // order 8 = 3.1.8 (displays as 3.1.6)
  // order 9 = 3.1.9 (displays as 3.1.7)

  const updates = [
    { order: 3, choice: yesChoice?.id, displayAs: '3.1.2' },  // Are biocidal active substances used for in-can...
    { order: 5, choice: yesChoice?.id, displayAs: '3.1.3' },  // Only applicable for EU suppliers...
    { order: 6, choice: yesChoice?.id, displayAs: '3.1.4' },  // Are biocidal active substances used as slimicides...
    { order: 7, choice: yesChoice?.id, displayAs: '3.1.5' },  // Only applicable for EU suppliers...
    { order: 8, choice: noChoice?.id, displayAs: '3.1.6' },   // Are biocidal active substances used as Preservatives...
    { order: 9, choice: noChoice?.id, displayAs: '3.1.7' },   // Are biocidal active substances listed in Article 95...
  ]

  console.log('\n=== Updating Answers ===\n')

  for (const update of updates) {
    const question = questions?.find(q => q.order_number === update.order)
    if (!question) {
      console.log(`Question with order ${update.order} not found`)
      continue
    }

    // Find answer for this question
    const { data: answer } = await supabase
      .from('answers')
      .select('*')
      .eq('parent_question_id', question.id)
      .eq('sheet_id', sheetId)
      .single()

    if (!answer) {
      console.log(`No answer found for question order ${update.order}`)
      continue
    }

    console.log(`Updating ${update.displayAs} (order ${update.order}): ${question.name?.substring(0, 40)}...`)
    console.log(`  Current choice_id: ${answer.choice_id}`)
    console.log(`  New choice_id: ${update.choice}`)

    const { error } = await supabase
      .from('answers')
      .update({ choice_id: update.choice })
      .eq('id', answer.id)

    if (error) {
      console.log(`  ✗ Error: ${error.message}`)
    } else {
      console.log(`  ✓ Updated successfully`)
    }
    console.log('')
  }

  console.log('Done!')
}

fixBiocidesChoices().catch(console.error)
