import { supabase } from './src/migration/supabase-client.js'

async function fixRemainingReferences() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  if (!section) return

  console.log('=== STEP 1: Find old subsections and their references ===\n')

  // Get old subsections (order_number is null)
  const { data: oldSubsections } = await supabase
    .from('subsections')
    .select('id, name')
    .eq('section_id', section.id)
    .is('order_number', null)

  for (const oldSub of oldSubsections || []) {
    console.log(`Old subsection: ${oldSub.name}`)

    // Get questions referencing this subsection
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_id_number, subsection_name_sort')
      .eq('parent_subsection_id', oldSub.id)

    if (questions && questions.length > 0) {
      console.log(`  Questions (${questions.length}):`)
      questions.forEach(q => console.log(`    Q${q.question_id_number}: "${q.subsection_name_sort}"`))

      // Find the correct new subsection for these questions
      const subsectionName = questions[0].subsection_name_sort

      if (subsectionName) {
        const { data: correctSubsection } = await supabase
          .from('subsections')
          .select('id, name, order_number')
          .eq('section_id', section.id)
          .eq('name', subsectionName)
          .not('order_number', 'is', null)
          .single()

        if (correctSubsection) {
          console.log(`  ✓ Found correct subsection: 4.${correctSubsection.order_number} - ${correctSubsection.name?.substring(0, 40)}...`)

          // Reassign questions
          const questionIds = questions.map(q => q.id)
          const { error } = await supabase
            .from('questions')
            .update({ parent_subsection_id: correctSubsection.id })
            .in('id', questionIds)

          if (error) {
            console.log(`  ❌ Error reassigning questions: ${error.message}`)
          } else {
            console.log(`  ✓ Reassigned ${questions.length} questions`)
          }
        } else {
          console.log(`  ⚠️  No matching subsection found for "${subsectionName}"`)
        }
      }
    }

    // Get answer count
    const { count: answerCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', oldSub.id)

    if (answerCount && answerCount > 0) {
      console.log(`  Answers: ${answerCount}`)
      console.log(`  Clearing answer references...`)

      // Clear answers in batches
      const batchSize = 1000
      let cleared = 0

      while (cleared < answerCount) {
        const { data: answerBatch } = await supabase
          .from('answers')
          .select('id')
          .eq('parent_subsection_id', oldSub.id)
          .limit(batchSize)

        if (!answerBatch || answerBatch.length === 0) break

        const { error } = await supabase
          .from('answers')
          .update({ parent_subsection_id: null })
          .in('id', answerBatch.map(a => a.id))

        if (error) {
          console.log(`  ❌ Error clearing answers: ${error.message}`)
          break
        }

        cleared += answerBatch.length
        console.log(`  Cleared ${cleared}/${answerCount} answers`)
      }
    }

    console.log()
  }

  console.log('=== STEP 2: Delete old subsections ===\n')

  for (const oldSub of oldSubsections || []) {
    const { error } = await supabase
      .from('subsections')
      .delete()
      .eq('id', oldSub.id)

    if (error) {
      console.log(`❌ Error deleting "${oldSub.name}": ${error.message}`)
    } else {
      console.log(`✓ Deleted "${oldSub.name}"`)
    }
  }

  console.log('\n=== STEP 3: Final verification ===\n')

  const { data: finalSubsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', section.id)
    .order('order_number')

  for (const sub of finalSubsections || []) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('parent_subsection_id', sub.id)

    console.log(`  4.${sub.order_number} - ${sub.name?.substring(0, 50)}... (${count} questions)`)
  }

  console.log(`\nTotal subsections: ${finalSubsections?.length || 0}`)
}

fixRemainingReferences()
