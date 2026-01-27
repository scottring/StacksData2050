import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { randomUUID } from 'crypto'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixChoicesForImport() {
  console.log('=== FIX CHOICES FOR EXCEL IMPORT ===\n')

  // Phase 1: Populate import_map for existing Yes/No choices
  console.log('--- Phase 1: Populate import_map for existing choices ---\n')

  // Get all choices that start with Yes or No but have no import_map
  const { data: yesChoices } = await supabase
    .from('choices')
    .select('id, content')
    .is('import_map', null)
    .ilike('content', 'Yes%')

  console.log(`Found ${yesChoices?.length || 0} "Yes..." choices without import_map`)

  for (const c of yesChoices || []) {
    await supabase
      .from('choices')
      .update({ import_map: 'Yes' })
      .eq('id', c.id)
  }

  const { data: noChoices } = await supabase
    .from('choices')
    .select('id, content')
    .is('import_map', null)
    .ilike('content', 'No%')
    .not('content', 'ilike', 'Not%') // Exclude "Not applicable" etc

  console.log(`Found ${noChoices?.length || 0} "No..." choices without import_map`)

  for (const c of noChoices || []) {
    await supabase
      .from('choices')
      .update({ import_map: 'No' })
      .eq('id', c.id)
  }

  console.log('Updated import_map for existing Yes/No choices\n')

  // Phase 2: Find questions that need Yes/No choices added
  console.log('--- Phase 2: Add missing Yes/No choices to questions ---\n')

  // Get all Select one Radio questions
  const { data: radioQuestions } = await supabase
    .from('questions')
    .select('id, name, question_type')
    .eq('question_type', 'Select one Radio')

  console.log(`Found ${radioQuestions?.length || 0} "Select one Radio" questions`)

  // For each question, check if it has Yes and No choices
  let questionsNeedingYes = 0
  let questionsNeedingNo = 0
  const choicesToAdd: any[] = []

  for (const q of radioQuestions || []) {
    const { data: choices } = await supabase
      .from('choices')
      .select('content')
      .eq('parent_question_id', q.id)

    const contents = choices?.map(c => c.content?.toLowerCase()) || []
    const hasYes = contents.some(c => c?.startsWith('yes'))
    const hasNo = contents.some(c => c?.startsWith('no') && !c?.startsWith('not'))

    // Get max order_number for this question's choices
    const maxOrder = choices?.length || 0

    if (!hasYes) {
      questionsNeedingYes++
      choicesToAdd.push({
        id: randomUUID(),
        parent_question_id: q.id,
        content: 'Yes',
        import_map: 'Yes',
        order_number: maxOrder + 1,
        created_at: new Date().toISOString()
      })
    }

    if (!hasNo) {
      questionsNeedingNo++
      choicesToAdd.push({
        id: randomUUID(),
        parent_question_id: q.id,
        content: 'No',
        import_map: 'No',
        order_number: maxOrder + 2,
        created_at: new Date().toISOString()
      })
    }
  }

  console.log(`Questions needing "Yes" choice: ${questionsNeedingYes}`)
  console.log(`Questions needing "No" choice: ${questionsNeedingNo}`)
  console.log(`Total choices to add: ${choicesToAdd.length}`)

  if (choicesToAdd.length > 0) {
    // Insert in batches
    const batchSize = 50
    for (let i = 0; i < choicesToAdd.length; i += batchSize) {
      const batch = choicesToAdd.slice(i, i + batchSize)
      const { error } = await supabase.from('choices').insert(batch)

      if (error) {
        console.log(`Error inserting batch: ${error.message}`)
      }
    }
    console.log(`Added ${choicesToAdd.length} new choices`)
  }

  // Phase 3: Verify results
  console.log('\n--- Phase 3: Verification ---\n')

  const { count: withImportMap } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .not('import_map', 'is', null)

  const { count: total } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })

  console.log(`Choices with import_map: ${withImportMap}/${total}`)

  // Check if SVHC question now has Yes/No
  const svhcQuestionId = '342805e1-5298-4efc-9c01-b52f72c430b3'
  const { data: svhcChoices } = await supabase
    .from('choices')
    .select('content, import_map')
    .eq('parent_question_id', svhcQuestionId)

  console.log('\nSVHC question choices after fix:')
  svhcChoices?.forEach(c => console.log(`  "${c.content}" | import_map: "${c.import_map}"`))

  console.log('\n=== COMPLETE ===')
}

fixChoicesForImport().catch(console.error)
