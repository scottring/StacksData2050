import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSheetData() {
  console.log('\n=== Checking Sheet Data ===\n')

  // Get Kemira
  const { data: kemira } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Kemira Oyj')
    .single()

  console.log(`Kemira: ${kemira?.name} (${kemira?.id})`)

  // Get 10 sheets assigned to Kemira
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id, created_by_user_id')
    .eq('assigned_to_company_id', kemira!.id)
    .limit(10)

  console.log(`\nSample sheets assigned to Kemira:\n`)

  for (const sheet of sheets || []) {
    console.log(`Sheet: ${sheet.name}`)
    console.log(`  company_id: ${sheet.company_id}`)
    console.log(`  assigned_to: ${sheet.assigned_to_company_id}`)
    console.log(`  created_by: ${sheet.created_by_user_id}`)

    // Get creator's company
    if (sheet.created_by_user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', sheet.created_by_user_id)
        .single()

      if (user) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', user.company_id)
          .single()

        console.log(`  creator's company: ${company?.name} (${user.company_id})`)
      }
    }
    console.log()
  }

  // Check if company_id should actually be the REQUESTING company
  console.log('\n=== Checking Company Relationship Logic ===\n')

  const { data: correctSheet } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id')
    .eq('assigned_to_company_id', kemira!.id)
    .neq('company_id', kemira!.id)
    .limit(1)
    .single()

  if (correctSheet) {
    console.log('Found a "correct" sheet:')
    console.log(`  Name: ${correctSheet.name}`)
    console.log(`  company_id: ${correctSheet.company_id}`)
    console.log(`  assigned_to: ${correctSheet.assigned_to_company_id}`)

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', correctSheet.company_id)
      .single()

    console.log(`  company_id is: ${company?.name}`)
    console.log('\nSo company_id should be the CUSTOMER (requestor)')
    console.log('And assigned_to_company_id should be the SUPPLIER')
  }
}

checkSheetData().catch(console.error)
