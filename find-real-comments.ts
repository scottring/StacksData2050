import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

const { data } = await supabase
  .from('answers')
  .select('id, parent_question_id, clarification, text_value, text_area_value')
  .eq('sheet_id', sheetId)
  .not('clarification', 'is', null)
  .not('clarification', 'in', '("-","no comment","")')

console.log(`Found ${data?.length || 0} answers with meaningful clarification:\n`)

for (const ans of data || []) {
  if (ans.clarification && ans.clarification !== '-' && ans.clarification !== 'no comment') {
    // Get the question name
    const { data: q } = await supabase
      .from('questions')
      .select('name')
      .eq('id', ans.parent_question_id)
      .single()

    console.log(`Question: ${q?.name}`)
    console.log(`Answer: ${(ans.text_value || ans.text_area_value || '').substring(0, 50)}`)
    console.log(`Clarification: ${ans.clarification}`)
    console.log()
  }
}
