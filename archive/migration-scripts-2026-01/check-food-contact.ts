import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const sheetId = '0e21cabb-84f4-43a6-8e77-614e9941a734'

  // Get Food Contact section ID
  const { data: section } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Food Contact')
    .single()

  // Get answers in Food Contact section
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name')
    .eq('parent_section_id', section?.id)

  const qIds = questions?.map(q => q.id) || []

  const { data: answers } = await supabase
    .from('answers')
    .select('parent_question_id, choice_id, text_value')
    .eq('sheet_id', sheetId)
    .in('parent_question_id', qIds)

  console.log('Food Contact answers:')
  for (const a of answers || []) {
    const q = questions?.find(q => q.id === a.parent_question_id)
    if (a.choice_id) {
      const { data: c } = await supabase.from('choices').select('content').eq('id', a.choice_id).single()
      console.log(`  DROPDOWN: "${q?.name?.substring(0,50)}..." → "${c?.content}"`)
    } else if (a.text_value) {
      console.log(`  TEXT: "${q?.name?.substring(0,50)}..." → "${a.text_value.substring(0,50)}..."`)
    }
  }
}

check().catch(console.error)
