import { supabase } from './src/migration/supabase-client.js'

const sheetId = '9ea6b264-1db2-41fc-9418-2f9e5cfd3541'

const { data: sheet, error } = await supabase
  .from('sheets')
  .select('id, name, company_id, new_status')
  .eq('id', sheetId)
  .single()

if (error) {
  console.log('Sheet NOT found:', error.message)
} else {
  console.log('Sheet found:', sheet?.name)
  console.log('Company ID:', sheet?.company_id)
  console.log('Status:', sheet?.new_status)

  // Check company name
  if (sheet?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', sheet.company_id)
      .single()

    console.log('Company:', company?.name)
  }
}
