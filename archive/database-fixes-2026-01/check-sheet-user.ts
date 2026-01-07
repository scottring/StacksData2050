import { supabase } from './src/migration/supabase-client.js';

async function checkSheetUser() {
  const sheetId = '548f08be-3b2a-465f-94b4-a2279bee9819'

  const { data: sheet } = await supabase
    .from('sheets')
    .select('*')
    .eq('id', sheetId)
    .single()

  console.log('=== SHEET INFO ===')
  console.log(`Created by: ${sheet?.created_by}`)
  console.log(`Modified by: ${sheet?.modified_by}`)
  console.log(`Company ID: ${sheet?.company_id}`)

  // Check if there's a user associated
  if (sheet?.created_by) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', sheet.created_by)
      .single()

    console.log('\n=== CREATOR INFO ===')
    console.log(`Name: ${user?.full_name || `${user?.first_name} ${user?.last_name}`}`)
    console.log(`Email: ${user?.email}`)
    console.log(`Phone: ${user?.phone_text || user?.phone_number}`)
    console.log(`Company: ${user?.company_id}`)
  }

  // Check company location
  if (sheet?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('name, location_text')
      .eq('id', sheet.company_id)
      .single()

    console.log('\n=== COMPANY INFO ===')
    console.log(`Name: ${company?.name}`)
    console.log(`Location: ${company?.location_text}`)
  }
}

checkSheetUser().catch(console.error)
