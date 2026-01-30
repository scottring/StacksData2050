import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkHydrocarbVersions() {
  console.log('=== Checking HYDROCARB 90-ME 78% Versions ===\n')

  // 1. Check how many sheets exist in Supabase
  const { data: supabaseSheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id, created_at, modified_at')
    .ilike('name', '%HYDROCARB%90-ME%78%')
    .order('created_at')

  console.log(`Found ${supabaseSheets?.length || 0} sheets in Supabase:\n`)
  if (supabaseSheets) {
    for (const sheet of supabaseSheets) {
      console.log(`Name: ${sheet.name}`)
      console.log(`  ID: ${sheet.id}`)
      console.log(`  Bubble ID: ${sheet.bubble_id}`)
      console.log(`  Created: ${sheet.created_at}`)
      console.log(`  Modified: ${sheet.modified_at}`)
      console.log()
    }
  }

  // 2. Check Bubble for all sheets with this name
  console.log('\n=== Checking Bubble API ===\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet?constraints=[{"key":"Name","constraint_type":"text contains","value":"HYDROCARB 90-ME 78"}]`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  })

  const data = await response.json() as any
  const bubbleSheets = data.response?.results || []

  console.log(`Found ${bubbleSheets.length} sheets in Bubble:\n`)

  for (const sheet of bubbleSheets) {
    console.log(`Name: ${sheet.Name}`)
    console.log(`  Bubble ID: ${sheet._id}`)
    console.log(`  Created: ${sheet['Created Date']}`)
    console.log(`  Modified: ${sheet['Modified Date']}`)
    console.log(`  Company: ${sheet.Company}`)
    console.log()
  }

  // 3. Check if there's a "parent" or "version" relationship
  if (supabaseSheets && supabaseSheets.length > 1) {
    console.log('\n=== Checking for Version Relationships ===\n')

    for (const sheet of supabaseSheets) {
      const { data: fullSheet } = await supabase
        .from('sheets')
        .select('*')
        .eq('id', sheet.id)
        .single()

      console.log(`Sheet: ${sheet.name}`)
      console.log('  Fields that might indicate versioning:')
      console.log(`    parent_sheet_id: ${fullSheet?.parent_sheet_id || 'null'}`)
      console.log(`    version: ${fullSheet?.version || 'null'}`)
      console.log(`    status: ${fullSheet?.status || 'null'}`)
      console.log()
    }
  }
}

checkHydrocarbVersions()
