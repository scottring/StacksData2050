import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function checkBranchingQuestions() {
  // Find sections with biocide or food contact in the name
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .or('name.ilike.%biocide%,name.ilike.%food contact%')

  console.log('Sections found:', sections)

  if (sections && sections.length > 0) {
    // Get subsections for these sections
    for (const section of sections) {
      const { data: subsections } = await supabase
        .from('subsections')
        .select('id, name, order_number')
        .eq('section_id', section.id)
        .order('order_number')
        .limit(3)

      console.log(`\nSection: ${section.name} (order: ${section.order_number})`)

      for (const sub of subsections || []) {
        const { data: questions } = await supabase
          .from('questions')
          .select('id, name, content, dependent_no_show, order_number, subsection_id')
          .eq('subsection_id', sub.id)
          .order('order_number')

        console.log(`  Subsection: ${sub.name} (${questions?.length} questions)`)
        questions?.slice(0, 5).forEach(q => {
          const text = (q.name || q.content || '').substring(0, 60)
          console.log(`    [${q.order_number}] ${text}... | dependent_no_show: ${q.dependent_no_show}`)
        })
        if (questions && questions.length > 5) {
          console.log(`    ... and ${questions.length - 5} more questions`)
        }
      }
    }
  } else {
    // Try subsections directly
    const { data: subsections } = await supabase
      .from('subsections')
      .select('id, name, section_id, order_number')
      .or('name.ilike.%biocide%,name.ilike.%food%')

    console.log('Subsections found:', subsections)
  }

  // Also check a specific question by content
  console.log('\n--- Checking specific biocide question ---')
  const { data: biocideQ } = await supabase
    .from('questions')
    .select('id, name, content, dependent_no_show, order_number, subsection_id')
    .ilike('content', '%biocidal active substances%')
    .limit(5)

  console.log('Biocide questions:', biocideQ)

  if (biocideQ && biocideQ.length > 0) {
    // Find questions in the same subsection
    const subId = biocideQ[0].subsection_id
    const { data: siblingQuestions } = await supabase
      .from('questions')
      .select('id, name, content, dependent_no_show, order_number')
      .eq('subsection_id', subId)
      .order('order_number')

    console.log(`\nAll questions in subsection ${subId}:`)
    siblingQuestions?.forEach(q => {
      const text = (q.name || q.content || '').substring(0, 70)
      console.log(`  [${q.order_number}] dependent_no_show=${q.dependent_no_show} | ${text}...`)
    })
  }
}

checkBranchingQuestions()
