import { supabase } from './src/migration/supabase-client.js'

async function checkTags() {
  console.log('Checking PIDSL question tags vs sheet tags\n')
  
  // Get HYDROCARB sheet
  const sheetId = 'fc48461e-7a18-4cb1-887e-1a3686244ef0'
  
  // Get sheet tags
  const { data: sheetTags } = await supabase
    .from('sheet_tags')
    .select('tag_id, tags(name)')
    .eq('sheet_id', sheetId)
  
  console.log('Sheet tags:')
  sheetTags?.forEach(st => {
    console.log('  - ' + st.tags?.name)
  })
  
  const tagIds = sheetTags?.map(st => st.tag_id) || []
  
  // Get PIDSL section
  const { data: pidslSection } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'PIDSL')
    .single()
  
  if (!pidslSection) return
  
  // Get all PIDSL subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', pidslSection.id)
    .neq('order_number', 999)
  
  console.log('\n\nPIDSL Subsections:\n')
  
  for (const sub of subsections || []) {
    // Get questions for this subsection
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('parent_subsection_id', sub.id)
    
    if (!questions || questions.length === 0) continue
    
    // Get question tags for these questions
    const questionIds = questions.map(q => q.id)
    
    const { data: questionTags } = await supabase
      .from('question_tags')
      .select('question_id, tag_id')
      .in('question_id', questionIds)
    
    // Count how many questions have matching tags
    const questionsWithMatchingTags = new Set()
    questionTags?.forEach(qt => {
      if (tagIds.includes(qt.tag_id)) {
        questionsWithMatchingTags.add(qt.question_id)
      }
    })
    
    const totalQuestions = questions.length
    const withTags = questionTags?.length || 0
    const withMatchingTags = questionsWithMatchingTags.size
    
    console.log(sub.order_number + '. ' + sub.name)
    console.log('   Total questions: ' + totalQuestions)
    console.log('   Questions with any tags: ' + withTags)
    console.log('   Questions with matching sheet tags: ' + withMatchingTags)
    console.log()
  }
}

checkTags()
