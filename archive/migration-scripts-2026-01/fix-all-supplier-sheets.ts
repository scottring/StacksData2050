import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAllSupplierSheets() {
  console.log('\n=== Fixing ALL Sheets Where company_id Equals assigned_to_company_id ===\n')

  // First, get ALL sheets
  let allSheets: any[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('sheets')
      .select('id, name, company_id, assigned_to_company_id, created_by')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Error fetching sheets:', error)
      break
    }

    if (!data || data.length === 0) break

    allSheets = allSheets.concat(data)
    console.log(`Loaded ${allSheets.length} sheets...`)

    if (data.length < pageSize) break
    page++
  }

  console.log(`\nTotal sheets loaded: ${allSheets.length}`)

  // Find sheets where company_id = assigned_to_company_id (self-referencing, WRONG)
  const problematicSheets = allSheets.filter(s =>
    s.company_id === s.assigned_to_company_id &&
    s.company_id !== null &&
    s.assigned_to_company_id !== null
  )

  console.log(`Sheets with company_id = assigned_to_company_id: ${problematicSheets.length}`)

  if (problematicSheets.length === 0) {
    console.log('\nNo problematic sheets found. Checking for NULL company_id...')

    const nullCompanySheets = allSheets.filter(s =>
      s.company_id === null && s.assigned_to_company_id !== null
    )

    console.log(`Sheets with NULL company_id: ${nullCompanySheets.length}`)

    if (nullCompanySheets.length === 0) {
      console.log('No sheets need fixing!')
      return
    }
  }

  // Load all users to get their companies
  console.log('\nLoading users...')
  const { data: users } = await supabase
    .from('users')
    .select('id, company_id, email')

  const userToCompanyMap = new Map(users?.map(u => [u.id, u.company_id]) || [])
  const userEmailMap = new Map(users?.map(u => [u.id, u.email]) || [])
  console.log(`Loaded ${userToCompanyMap.size} users`)

  // Load all companies for better logging
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')

  const companyNameMap = new Map(companies?.map(c => [c.id, c.name]) || [])

  let fixedCount = 0
  let skippedNoCreator = 0
  let skippedSameCompany = 0
  let errorCount = 0

  console.log('\n=== Processing Sheets ===\n')

  for (const sheet of problematicSheets) {
    const createdByUserId = sheet.created_by

    if (!createdByUserId) {
      skippedNoCreator++
      continue
    }

    const creatorCompanyId = userToCompanyMap.get(createdByUserId)

    if (!creatorCompanyId) {
      console.log(`⚠️  No company for creator of "${sheet.name}"`)
      skippedNoCreator++
      continue
    }

    // The creator's company should be the CUSTOMER (requesting company)
    // The assigned_to_company_id should be the SUPPLIER
    // So we set company_id = creator's company

    const supplierName = companyNameMap.get(sheet.assigned_to_company_id) || 'Unknown'
    const customerName = companyNameMap.get(creatorCompanyId) || 'Unknown'

    console.log(`Fixing: "${sheet.name}"`)
    console.log(`  Supplier: ${supplierName}`)
    console.log(`  Customer: ${customerName}`)
    console.log(`  Setting company_id from ${sheet.company_id} to ${creatorCompanyId}`)

    const { error } = await supabase
      .from('sheets')
      .update({ company_id: creatorCompanyId })
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
  console.log(`Skipped (no creator): ${skippedNoCreator}`)
  console.log(`Skipped (same company): ${skippedSameCompany}`)
  console.log(`Errors: ${errorCount}`)

  console.log(`\n=== Verifying Fix ===`)

  // Re-check Kemira's sheets
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

fixAllSupplierSheets().catch(console.error)
