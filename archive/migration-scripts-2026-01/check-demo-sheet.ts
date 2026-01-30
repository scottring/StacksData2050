import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sheetId = '12c41505-ecd4-4c2a-933a-1aaf8efd0f3a' // Hydrocarb 60 BE 70%

async function checkSheet() {
  const { data, error } = await supabase
    .from('sheets')
    .select('id, name, new_status, modified_at, company_id, assigned_to_company_id')
    .eq('id', sheetId)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Hydrocarb 60 BE 70% sheet:')
  console.log('  Status:', data?.new_status)
  console.log('  Modified:', data?.modified_at?.substring(0, 10))
  console.log('  Company ID:', data?.company_id)
  console.log('  Assigned to:', data?.assigned_to_company_id)

  // Check answer count
  const { data: answers } = await supabase
    .from('answers')
    .select('id')
    .eq('sheet_id', sheetId)

  console.log('  Answers:', answers?.length || 0)

  // Check if any rejections exist
  const { data: rejections } = await supabase
    .from('answer_rejections')
    .select('id')
    .in('answer_id', answers?.map(a => a.id) || [])

  console.log('  Rejections:', rejections?.length || 0)
}

checkSheet().catch(console.error)
