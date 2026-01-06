import { supabase } from './src/migration/supabase-client.js';

async function checkCompanySchema() {
  const companyId = 'e5ddb7ab-99bd-40f1-9a5d-3731be1aa3b7'

  // Get all fields from the company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  console.log('=== FULL COMPANY RECORD ===')
  console.log(JSON.stringify(company, null, 2))
}

checkCompanySchema().catch(console.error)
