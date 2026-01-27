import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function investigateAndFixSheetCompanyIds() {
  console.log('\n=== Investigating Sheet company_id Issue ===\n')

  // Get Kemira's ID
  const { data: kemira } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', 'Kemira Oyj')
    .single()

  if (!kemira) {
    console.error('Could not find Kemira Oyj')
    return
  }

  console.log(`Kemira ID: ${kemira.id}`)

  // Get all sheets where assigned_to_company_id = Kemira
  const { data: kemiraSheets } = await supabase
    .from('sheets')
    .select('id, name, company_id, assigned_to_company_id, bubble_id')
    .eq('assigned_to_company_id', kemira.id)

  console.log(`\nTotal sheets assigned to Kemira: ${kemiraSheets?.length || 0}`)

  // Count how many have company_id = Kemira (WRONG)
  const wrongCompanyId = kemiraSheets?.filter(s => s.company_id === kemira.id) || []
  console.log(`Sheets with company_id = Kemira (WRONG): ${wrongCompanyId.length}`)

  // Count how many have company_id != Kemira (CORRECT)
  const correctCompanyId = kemiraSheets?.filter(s => s.company_id !== kemira.id) || []
  console.log(`Sheets with company_id != Kemira (CORRECT): ${correctCompanyId.length}`)

  if (correctCompanyId.length > 0) {
    console.log('\nSample correct sheets:')
    correctCompanyId.slice(0, 3).forEach(s => {
      console.log(`  ${s.name} -> company_id: ${s.company_id}`)
    })
  }

  // Try to find the correct company_id from Bubble data
  console.log('\n=== Attempting to Fix Using Bubble Data ===\n')

  // Get all companies
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, name, bubble_id')

  const companyMap = new Map(allCompanies?.map(c => [c.bubble_id, c]) || [])

  console.log(`Loaded ${companyMap.size} companies from database`)

  // Try to fetch from Bubble API to find the correct company_id
  const BUBBLE_API_URL = process.env.BUBBLE_API_URL
  const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

  if (!BUBBLE_API_URL || !BUBBLE_API_TOKEN) {
    console.log('\nBubble credentials not found. Attempting database-only fix...')
    await attemptDatabaseOnlyFix(wrongCompanyId, kemira.id)
    return
  }

  let fixCount = 0
  let errorCount = 0

  for (const sheet of wrongCompanyId.slice(0, 10)) { // Test with first 10
    if (!sheet.bubble_id) {
      console.log(`Sheet ${sheet.name} has no bubble_id, skipping`)
      continue
    }

    try {
      // Fetch the sheet from Bubble
      const response = await fetch(
        `${BUBBLE_API_URL}/api/1.1/obj/sheet/${sheet.bubble_id}`,
        {
          headers: {
            'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
          }
        }
      )

      if (!response.ok) {
        console.log(`Failed to fetch Bubble data for ${sheet.name}`)
        errorCount++
        continue
      }

      const bubbleSheet = await response.json()
      const bubbleCompanyId = bubbleSheet.response?.Company?._id

      if (!bubbleCompanyId) {
        console.log(`No company in Bubble for ${sheet.name}`)
        continue
      }

      const correctCompany = companyMap.get(bubbleCompanyId)
      if (!correctCompany) {
        console.log(`Could not map Bubble company ${bubbleCompanyId} to Supabase`)
        continue
      }

      console.log(`\nFixing: ${sheet.name}`)
      console.log(`  Current company_id: ${sheet.company_id} (Kemira)`)
      console.log(`  Correct company_id: ${correctCompany.id} (${correctCompany.name})`)

      // Update the sheet
      const { error: updateError } = await supabase
        .from('sheets')
        .update({ company_id: correctCompany.id })
        .eq('id', sheet.id)

      if (updateError) {
        console.log(`  ERROR: ${updateError.message}`)
        errorCount++
      } else {
        console.log(`  ✓ Fixed`)
        fixCount++
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (error) {
      console.log(`Error processing ${sheet.name}:`, error)
      errorCount++
    }
  }

  console.log(`\n=== Test Run Complete ===`)
  console.log(`Fixed: ${fixCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`\nIf this looks good, uncomment the full fix below`)
}

async function attemptDatabaseOnlyFix(wrongSheets: any[], kemiraId: string) {
  console.log('\n=== Database-Only Fix Strategy ===\n')

  // Strategy: Look for patterns in sheet names or use the _migration_id_map
  const { data: idMaps } = await supabase
    .from('_migration_id_map')
    .select('*')
    .eq('table_name', 'sheets')

  console.log(`Found ${idMaps?.length || 0} migration ID mappings for sheets`)

  // For demo purposes, let's just update all wrong sheets to use the first correct customer we found
  const { data: sampleCorrectSheet } = await supabase
    .from('sheets')
    .select('company_id')
    .eq('assigned_to_company_id', kemiraId)
    .neq('company_id', kemiraId)
    .limit(1)
    .single()

  if (sampleCorrectSheet) {
    console.log(`\nFound a correct sheet with company_id: ${sampleCorrectSheet.company_id}`)
    console.log('This appears to be a valid customer ID')

    // Get the company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', sampleCorrectSheet.company_id)
      .single()

    console.log(`Company name: ${company?.name}`)
  }

  console.log('\nCannot proceed with database-only fix without more context.')
  console.log('Please check Bubble data or provide migration context.')
}

investigateAndFixSheetCompanyIds().catch(console.error)
