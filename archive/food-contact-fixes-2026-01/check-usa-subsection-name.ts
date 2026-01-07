import { supabase } from './src/migration/supabase-client.js'

async function checkUSASubsectionName() {
  // Get Food Contact section
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  if (!section) return

  // Get questions with USA subsection name
  const { data: usaQuestions } = await supabase
    .from('questions')
    .select('id, question_id_number, subsection_name_sort')
    .eq('parent_section_id', section.id)
    .ilike('subsection_name_sort', '%USA%')
    .limit(1)

  if (usaQuestions && usaQuestions.length > 0) {
    console.log('USA Subsection Name from Bubble:')
    console.log('---')
    console.log(usaQuestions[0].subsection_name_sort)
    console.log('---')
    console.log('\nCharacter codes:')
    const name = usaQuestions[0].subsection_name_sort
    for (let i = 0; i < name.length; i++) {
      if (name[i] === '"' || name.charCodeAt(i) > 127) {
        console.log(`  Position ${i}: "${name[i]}" = charCode ${name.charCodeAt(i)}`)
      }
    }
  }
}

checkUSASubsectionName()
