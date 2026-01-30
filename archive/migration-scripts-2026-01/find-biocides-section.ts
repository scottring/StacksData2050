import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findBiocidesSection() {
  console.log('=== Finding Biocides Section ===\n')

  // Find section with "Biocides" in name
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .ilike('name', '%biocid%')

  console.log('Sections with "biocid" in name:')
  sections?.forEach(s => {
    console.log(`  ${s.section_sort_number}. ${s.name} (ID: ${s.id})`)
  })

  if (sections && sections.length > 0) {
    const biocidesSection = sections[0]

    // Find subsections
    const { data: subsections } = await supabase
      .from('subsections')
      .select('*')
      .eq('parent_section_id', biocidesSection.id)
      .order('order_number')

    console.log(`\nSubsections in ${biocidesSection.name}:`)
    subsections?.forEach(s => {
      console.log(`  ${biocidesSection.section_sort_number}.${s.order_number}. ${s.name}`)
    })

    // Find first subsection's questions
    if (subsections && subsections.length > 0) {
      const firstSubsection = subsections[0]

      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('parent_subsection_id', firstSubsection.id)
        .order('order_number')

      console.log(`\nQuestions in ${firstSubsection.name}:`)
      questions?.forEach(q => {
        console.log(`  ${biocidesSection.section_sort_number}.${firstSubsection.order_number}.${q.order_number}. ${q.name || 'NO NAME'}`)
        console.log(`    Type: ${q.question_type}, ID: ${q.id}`)
      })

      // Check first question for sub-questions
      if (questions && questions.length > 0) {
        const firstQ = questions[0]

        const { data: subQuestions } = await supabase
          .from('questions')
          .select('*')
          .eq('parent_question_id', firstQ.id)
          .order('order_number')

        if (subQuestions && subQuestions.length > 0) {
          console.log(`\n  Sub-questions of ${firstQ.name}:`)
          subQuestions.forEach(sq => {
            console.log(`    ${biocidesSection.section_sort_number}.${firstSubsection.order_number}.${firstQ.order_number}.${sq.order_number}. ${sq.name || 'NO NAME'}`)
            console.log(`      Type: ${sq.question_type}, ID: ${sq.id}`)
          })

          // Check for list table columns
          const firstSubQ = subQuestions[0]
          const { data: columns } = await supabase
            .from('list_table_columns')
            .select('*')
            .eq('parent_question_id', firstSubQ.id)
            .order('order_number')

          console.log(`\n    List table columns for ${firstSubQ.id}:`)
          columns?.forEach(col => {
            console.log(`      - ${col.name} (order: ${col.order_number})`)
          })
        }
      }
    }
  }
}

findBiocidesSection().catch(console.error)
