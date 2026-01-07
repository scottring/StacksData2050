import { supabase } from './src/migration/supabase-client.js';

async function checkSheetCompany() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  // Get the sheet data
  const { data: sheet } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', sheetId)
    .single()

  console.log('=== SHEET DATA ===')
  console.log(`Sheet ID: ${sheet?.id}`)
  console.log(`Company ID: ${sheet?.company_id}`)
  console.log(`Sheet Name: ${sheet?.name}`)

  if (sheet?.company_id) {
    console.log('\n=== COMPANY DATA ===')
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', sheet.company_id)
      .single()

    if (company) {
      console.log(`Company ID: ${company.id}`)
      console.log(`Name: ${company.name}`)
      console.log(`Address: ${company.address}`)
      console.log(`Email: ${company.email}`)
      console.log(`Phone: ${company.phone}`)
    } else {
      console.log('❌ No company found with that ID')
    }
  } else {
    console.log('\n❌ Sheet has no company_id - Contact Profile will not display')
  }
}

checkSheetCompany().catch(console.error)
