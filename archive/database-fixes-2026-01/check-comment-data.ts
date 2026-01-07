import { supabase } from './src/migration/supabase-client.js'

const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

const { data } = await supabase
  .from('answers')
  .select('id, parent_question_id, clarification, custom_comment_text, support_text')
  .eq('sheet_id', sheetId)
  .or('clarification.not.is.null,custom_comment_text.not.is.null,support_text.not.is.null')

console.log(`Found ${data?.length || 0} answers with comment fields:\n`)
data?.slice(0, 10).forEach(ans => {
  console.log(`Question ID: ${ans.parent_question_id}`)
  if (ans.clarification) console.log(`  clarification: ${ans.clarification}`)
  if (ans.custom_comment_text) console.log(`  custom_comment_text: ${ans.custom_comment_text}`)
  if (ans.support_text) console.log(`  support_text: ${ans.support_text}`)
  console.log()
})
