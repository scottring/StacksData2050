import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSync() {
  // Get all questions from Supabase with their bubble_ids
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, bubble_id, content, question_type, parent_section_id')
    .not('bubble_id', 'is', null)

  if (error) {
    console.error('Error fetching questions:', error)
    return
  }

  console.log('=== SUPABASE DATABASE STATUS ===\n')
  console.log('Total questions with bubble_id:', questions?.length || 0)

  // Get count of questions without bubble_id (added after migration?)
  const { data: noBubbleId, error: err2 } = await supabase
    .from('questions')
    .select('id, content')
    .is('bubble_id', null)

  const noBubbleCount = noBubbleId ? noBubbleId.length : 0
  console.log('Questions WITHOUT bubble_id (added in Supabase?):', noBubbleCount)
  if (noBubbleId && noBubbleId.length > 0) {
    console.log('  Examples:')
    noBubbleId.slice(0, 5).forEach(q => {
      const content = q.content || 'N/A'
      console.log('    -', content.substring(0, 60) + '...')
    })
  }

  // Get sections to understand structure
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, bubble_id')
    .order('order_number')

  console.log('\nSections in Supabase:', sections?.length || 0)
  if (sections) {
    sections.forEach(s => {
      console.log('  -', s.name, '(bubble_id:', s.bubble_id ? 'yes' : 'NO', ')')
    })
  }

  // Check choices with import_map
  const { data: choicesWithMap } = await supabase
    .from('choices')
    .select('id, content, import_map')
    .not('import_map', 'is', null)
    .limit(20)

  const mapCount = choicesWithMap ? choicesWithMap.length : 0
  console.log('\nChoices with import_map populated:', mapCount)
  if (choicesWithMap && choicesWithMap.length > 0) {
    console.log('  Examples:')
    choicesWithMap.slice(0, 5).forEach(c => {
      console.log('    - "' + c.content + '" → import_map: "' + c.import_map + '"')
    })
  }

  // Check total choices
  const { count: totalChoices } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })

  const { count: choicesWithoutMap } = await supabase
    .from('choices')
    .select('*', { count: 'exact', head: true })
    .is('import_map', null)

  console.log('\nTotal choices:', totalChoices)
  console.log('Choices WITHOUT import_map:', choicesWithoutMap)

  // Sample some bubble_ids to compare with Excel
  console.log('\n=== SAMPLE BUBBLE IDS FROM SUPABASE ===')
  if (questions) {
    questions.slice(0, 10).forEach(q => {
      const content = q.content || 'N/A'
      console.log('  bubble_id:', q.bubble_id)
      console.log('    content:', content.substring(0, 50) + '...')
      console.log('')
    })
  }
}

checkSync()
