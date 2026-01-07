import { supabase } from './src/migration/supabase-client.js';

async function debugSheetStructure() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // Get first section
  const { data: sections } = await supabase
    .from('sections')
    .select('*')
    .order('order_number')
    .limit(1)

  if (!sections || sections.length === 0) {
    console.log('No sections found')
    return
  }

  const firstSection = sections[0]
  console.log('\n=== FIRST SECTION ===')
  console.log(`Name: ${firstSection.name}`)
  console.log(`ID: ${firstSection.id}`)
  console.log(`Order: ${firstSection.order_number}`)

  // Get subsections for this section
  const { data: subsections } = await supabase
    .from('subsections')
    .select('*')
    .eq('section_id', firstSection.id)
    .order('order_number')

  console.log('\n=== SUBSECTIONS ===')
  if (subsections && subsections.length > 0) {
    subsections.forEach((sub, idx) => {
      console.log(`${idx + 1}. ${sub.name}`)
      console.log(`   ID: ${sub.id}`)
      console.log(`   Order: ${sub.order_number}`)

      // Count questions in this subsection
      const questionsInSub = questions?.filter(q => q.parent_subsection_id === sub.id).length || 0
      console.log(`   Questions: ${questionsInSub}`)
    })
  } else {
    console.log('No subsections found for this section')
  }

  // Check for subsections that would be filtered out (no visible questions)
  console.log('\n=== SUBSECTION FILTERING ===')
  subsections?.forEach(sub => {
    const questionsInSub = questions?.filter(q => q.parent_subsection_id === sub.id).length || 0
    const status = questionsInSub > 0 ? '✓ VISIBLE' : '✗ HIDDEN (no questions)'
    console.log(`${sub.name}: ${status}`)
  })

  // Get questions for this section
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('parent_section_id', firstSection.id)
    .order('order_number')
    .limit(10)

  console.log('\n=== QUESTIONS IN THIS SECTION ===')
  if (questions && questions.length > 0) {
    questions.forEach((q, idx) => {
      console.log(`\n${idx + 1}. "${q.name || q.content}"`)
      console.log(`   ID: ${q.id}`)
      console.log(`   Order: ${q.order_number}`)
      console.log(`   parent_section_id: ${q.parent_section_id}`)
      console.log(`   parent_subsection_id: ${q.parent_subsection_id || 'NULL'}`)

      if (q.parent_subsection_id) {
        const sub = subsections?.find(s => s.id === q.parent_subsection_id)
        console.log(`   → Belongs to subsection: "${sub?.name}"`)
      } else {
        console.log(`   → Direct question (no subsection)`)
      }
    })
  }
}

debugSheetStructure().catch(console.error)
