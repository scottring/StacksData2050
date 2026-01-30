import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDependentQuestions() {
  const sheetId = 'd594b54f-6170-4280-af1c-098ceb83a094'

  console.log('=== Checking Dependent Questions in Biocides Section ===\n')

  // Get subsection 3.1
  const { data: section3 } = await supabase
    .from('sections')
    .select('*')
    .eq('order_number', 3)
    .single()

  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', section3?.id)
    .order('order_number')

  const subsection31 = subsections?.[0]

  // Get all questions in subsection 3.1
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_subsection_id', subsection31?.id)
    .order('order_number')

  console.log(`Questions in subsection 3.1:\n`)

  questions?.forEach((q, idx) => {
    console.log(`3.1.${idx + 1} ${q.name?.substring(0, 60)}...`)
    console.log(`  dependent_no_show: ${q.dependent_no_show ?? 'NULL'}`)
    console.log(`  originating_question_id: ${q.originating_question_id || 'NULL'}`)
    console.log('')
  })

  // Check 3.1.1 answer value
  const question311 = questions?.[0]
  if (question311) {
    const { data: answer } = await supabase
      .from('answers')
      .select('*')
      .eq('parent_question_id', question311.id)
      .eq('sheet_id', sheetId)
      .single()

    if (answer?.choice_id) {
      const { data: choice } = await supabase
        .from('choices')
        .select('*')
        .eq('id', answer.choice_id)
        .single()

      console.log(`\n=== Question 3.1.1 Answer ===`)
      console.log(`Choice content: "${choice?.content}"`)
      console.log(`Starts with "Yes": ${choice?.content?.toLowerCase().startsWith('yes')}`)
    }
  }
}

checkDependentQuestions().catch(console.error)
