import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRequestorName() {
  const { data: kemira } = await supabase
    .from('companies')
    .select('id')
    .eq('name', 'Kemira Oyj')
    .single()

  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id, requestor_name, requestor_email, original_requestor_assoc_id')
    .eq('assigned_to_company_id', kemira!.id)
    .eq('company_id', kemira!.id)
    .limit(10)

  console.log('Sample problematic sheets:\n')
  for (const sheet of sheets || []) {
    console.log(`Sheet: ${sheet.name}`)
    console.log(`  requestor_name: ${sheet.requestor_name}`)
    console.log(`  requestor_email: ${sheet.requestor_email}`)
    console.log(`  original_requestor_assoc_id: ${sheet.original_requestor_assoc_id}`)
    console.log()
  }
}

checkRequestorName().catch(console.error)
