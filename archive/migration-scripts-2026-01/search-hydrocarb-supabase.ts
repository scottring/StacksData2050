import { supabase } from './src/migration/supabase-client.js'

async function searchHydrocarbInSupabase() {
  console.log('=== Searching for Hydrocarb sheets in Supabase ===\n')

  // Search for sheets with Hydrocarb in product_name
  const { data: sheets, error } = await supabase
    .from('sheets')
    .select('*')
    .ilike('product_name', '%Hydrocarb%')
    .order('created_at')

  if (error) {
    console.log(`Error: ${error.message}`)
    return
  }

  console.log(`Found ${sheets?.length || 0} sheets with "Hydrocarb" in product_name\n`)

  if (sheets && sheets.length > 0) {
    sheets.forEach(sheet => {
      console.log('='.repeat(80))
      console.log(`Product Name: ${sheet.product_name}`)
      console.log(`ID: ${sheet.id}`)
      console.log(`Bubble ID: ${sheet.bubble_id}`)
      console.log(`Created: ${sheet.created_at}`)
      console.log(`Modified: ${sheet.modified_at}`)
      console.log(`Company ID: ${sheet.company_id}`)

      // Check for version-related fields
      console.log('\n--- Version/Status Fields ---')
      if (sheet.version) console.log(`Version: ${sheet.version}`)
      if (sheet.version_number) console.log(`Version Number: ${sheet.version_number}`)
      if (sheet.status) console.log(`Status: ${sheet.status}`)
      if (sheet.approval_status) console.log(`Approval Status: ${sheet.approval_status}`)
      if (sheet.is_current_version) console.log(`Is Current Version: ${sheet.is_current_version}`)
      if (sheet.parent_sheet_id) console.log(`Parent Sheet ID: ${sheet.parent_sheet_id}`)

      console.log('\n--- All Fields ---')
      console.log(Object.keys(sheet).sort().join(', '))
      console.log()
    })
  }

  // Also check the sheets table schema
  console.log('\n=== Checking Sheets Table Schema ===\n')

  const { data: sample } = await supabase
    .from('sheets')
    .select('*')
    .limit(1)
    .single()

  if (sample) {
    console.log('Available fields in sheets table:')
    Object.keys(sample).sort().forEach(field => {
      console.log(`  ${field}`)
    })
  }
}

searchHydrocarbInSupabase()
