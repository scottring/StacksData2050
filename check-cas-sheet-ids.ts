import { supabase } from './src/migration/supabase-client.js'

const BIOCIDES_QUESTION_ID = '55eeea30-92d0-492e-aa44-37819705fbb0'
const CAS_COLUMN_ID = '5e22b0e9-0a67-49ab-9734-b1ec6cf5e14b'

const { data } = await supabase
  .from('answers')
  .select('id, sheet_id, text_value')
  .eq('parent_question_id', BIOCIDES_QUESTION_ID)
  .eq('list_table_column_id', CAS_COLUMN_ID)
  .limit(20)

const nullCount = data?.filter(d => !d.sheet_id).length || 0
console.log(`NULL sheet_ids: ${nullCount} out of ${data?.length || 0}`)

if (nullCount > 0) {
  console.log('\nSample NULL entries:')
  data?.filter(d => !d.sheet_id).slice(0, 5).forEach(d => {
    console.log(`  ${d.id}: ${d.text_value}`)
  })
}
