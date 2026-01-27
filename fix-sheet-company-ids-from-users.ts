import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSheetCompanyIdsFromUsers() {
  console.log('\n=== Fixing Sheet company_id from User/Creator Data ===\n')

  // Get all sheets where company_id = assigned_to_company_id (WRONG - same company is both customer and supplier)
  const { data: allSheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id, created_by_user_id, bubble_id')

  const wrongSheets = allSheets?.filter(s =>
    s.company_id === s.assigned_to_company_id && s.assigned_to_company_id !== null
  ) || []

  console.log(`Total sheets with company_id = assigned_to_company_id: ${wrongSheets.length}`)

  // Get all users to map user -> company
  const { data: users } = await supabase
    .from('users')
    .select('id, company_id')

  const userCompanyMap = new Map(users?.map(u => [u.id, u.company_id]) || [])

  console.log(`Loaded ${userCompanyMap.size} users`)

  let fixCount = 0
  let noUserCount = 0
  let sameCompanyCount = 0

  for (const sheet of wrongSheets) {
    if (!sheet.created_by_user_id) {
      noUserCount++
      continue
    }

    const creatorCompanyId = userCompanyMap.get(sheet.created_by_user_id)

    if (!creatorCompanyId) {
      console.log(`No company found for creator of ${sheet.name}`)
      noUserCount++
      continue
    }

    // If creator's company is same as assigned_to, skip (already correct pattern)
    if (creatorCompanyId === sheet.assigned_to_company_id) {
      sameCompanyCount++
      continue
    }

    // The creator's company should be the customer (company_id)
    console.log(`\nFixing: ${sheet.name}`)
    console.log(`  Current company_id: ${sheet.company_id}`)
    console.log(`  Creator's company_id: ${creatorCompanyId}`)
    console.log(`  assigned_to_company_id: ${sheet.assigned_to_company_id}`)

    const { error } = await supabase
      .from('sheets')
      .update({ company_id: creatorCompanyId })
      .eq('id', sheet.id)

    if (error) {
      console.log(`  ERROR: ${error.message}`)
    } else {
      console.log(`  ✓ Fixed`)
      fixCount++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Fixed: ${fixCount}`)
  console.log(`No creator: ${noUserCount}`)
  console.log(`Same company (skipped): ${sameCompanyCount}`)
}

fixSheetCompanyIdsFromUsers().catch(console.error)
