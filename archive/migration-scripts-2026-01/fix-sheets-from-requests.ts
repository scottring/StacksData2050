import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSheetsFromRequests() {
  console.log('\n=== Fixing Sheets Using Requests Table ===\n')

  // Get all requests
  const { data: requests } = await supabase
    .from('requests')
    .select('sheet_id, requestor_id, requesting_from_id')

  console.log(`Loaded ${requests?.length || 0} requests`)

  // Create a map of sheet_id -> customer company_id
  const sheetToCustomerMap = new Map<string, string>()

  for (const request of requests || []) {
    if (request.sheet_id && request.requestor_id) {
      // requestor_id is the CUSTOMER who requested the sheet
      // requesting_from_id is the SUPPLIER
      sheetToCustomerMap.set(request.sheet_id, request.requestor_id)
    }
  }

  console.log(`Mapped ${sheetToCustomerMap.size} sheets to customers from requests`)

  // Get sheets where company_id = assigned_to_company_id (wrong)
  const { data: allSheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id')

  const problematicSheets = allSheets?.filter(s =>
    s.company_id === s.assigned_to_company_id &&
    s.company_id !== null
  ) || []

  console.log(`Found ${problematicSheets.length} sheets with company_id = assigned_to_company_id`)

  // Get company names for logging
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  const companyNameMap = new Map(companies?.map(c => [c.id, c.name]) || [])

  let fixedCount = 0
  let noRequestFound = 0
  let errorCount = 0

  console.log('\n=== Processing Sheets ===\n')

  for (const sheet of problematicSheets) {
    const correctCustomerId = sheetToCustomerMap.get(sheet.id)

    if (!correctCustomerId) {
      noRequestFound++
      continue
    }

    if (correctCustomerId === sheet.company_id) {
      // Already correct
      continue
    }

    const supplierName = companyNameMap.get(sheet.assigned_to_company_id) || 'Unknown'
    const customerName = companyNameMap.get(correctCustomerId) || 'Unknown'

    console.log(`Fixing: "${sheet.name}"`)
    console.log(`  Supplier: ${supplierName}`)
    console.log(`  Customer: ${customerName}`)
    console.log(`  Setting company_id from ${sheet.company_id} to ${correctCustomerId}`)

    const { error } = await supabase
      .from('sheets')
      .update({ company_id: correctCustomerId })
      .eq('id', sheet.id)

    if (error) {
      console.log(`  ❌ ERROR: ${error.message}`)
      errorCount++
    } else {
      console.log(`  ✅ Fixed`)
      fixedCount++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Fixed: ${fixedCount}`)
  console.log(`No request found: ${noRequestFound}`)
  console.log(`Errors: ${errorCount}`)

  console.log(`\n=== Verifying Fix ===`)

  const { data: kemira } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Kemira Oyj')
    .single()

  if (kemira) {
    const { data: kemiraSheets } = await supabase
      .from('sheets')
      .select('company_id, assigned_to_company_id')
      .eq('assigned_to_company_id', kemira.id)

    const stillWrong = kemiraSheets?.filter(s => s.company_id === kemira.id).length || 0
    const nowCorrect = kemiraSheets?.filter(s => s.company_id !== kemira.id).length || 0

    console.log(`\nKemira's sheets after fix:`)
    console.log(`  Still wrong (company_id = Kemira): ${stillWrong}`)
    console.log(`  Now correct (company_id != Kemira): ${nowCorrect}`)
  }
}

fixSheetsFromRequests().catch(console.error)
