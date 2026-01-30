import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSubmittedSheet() {
  const submittedSheetId = 'a53fd214-1df9-4bc1-829a-d80784acbbc7' // Nalco 74838_

  const { data: sheet } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', submittedSheetId)
    .single()

  console.log('Nalco 74838_ sheet:')
  console.log('  Status:', sheet?.new_status)
  console.log('  Modified:', sheet?.modified_at?.substring(0, 10))

  // Check answer count
  const { data: answers } = await supabase
    .from('answers')
    .select('id')
    .eq('sheet_id', submittedSheetId)

  console.log('  Answers:', answers?.length || 0)

  // Check companies
  const { data: customerCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('id', sheet?.company_id)
    .single()

  const { data: supplierCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('id', sheet?.assigned_to_company_id)
    .single()

  console.log('  Customer:', customerCompany?.name)
  console.log('  Supplier:', supplierCompany?.name)
  console.log('\n📋 This sheet is ready to demonstrate the review workflow!')
  console.log(`   URL: http://localhost:3000/sheets/${submittedSheetId}/review`)
}

checkSubmittedSheet().catch(console.error)
