import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareVersions() {
  console.log('=== Comparing All 3 HYDROCARB Sheet Versions ===\n')

  const bubbleIds = [
    '1659961669315x991901828578803700', // Version 1 - Aug 8, 2022 (hidden in dropdown)
    '1661440851034x545387418125598700', // Version 2 - Aug 25, 2022 (shown in dropdown)
    '1744099239597x968220647214809100'  // Version 3 - Apr 8, 2025 (shown in dropdown)
  ]

  for (let i = 0; i < bubbleIds.length; i++) {
    const bubbleId = bubbleIds[i]
    console.log(`\n${'='.repeat(60)}`)
    console.log(`VERSION ${i + 1} - Bubble ID: ${bubbleId}`)
    console.log('='.repeat(60))

    // Get from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet/${bubbleId}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any
    const bubbleSheet = data.response

    // Get from Supabase
    const { data: supabaseSheet } = await supabase
      .from('sheets')
      .select('*')
      .eq('bubble_id', bubbleId)
      .single()

    console.log('\nBubble Sheet:')
    console.log(`  Created: ${bubbleSheet['Created Date']}`)
    console.log(`  Modified: ${bubbleSheet['Modified Date']}`)
    console.log(`  Status: ${bubbleSheet.Status || 'null'}`)
    console.log(`  Archived: ${bubbleSheet.Archived || 'null'}`)
    console.log(`  Hidden: ${bubbleSheet.Hidden || 'null'}`)
    console.log(`  Active: ${bubbleSheet.Active || 'null'}`)
    console.log(`  Version: ${bubbleSheet.Version || 'null'}`)

    console.log('\nSupabase Sheet:')
    console.log(`  Created: ${supabaseSheet?.created_at}`)
    console.log(`  Modified: ${supabaseSheet?.modified_at}`)
    console.log(`  Status: ${supabaseSheet?.status || 'null'}`)
    console.log(`  Version: ${supabaseSheet?.version || 'null'}`)

    // Count answers for this sheet
    const { count: answerCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('parent_sheet_id', supabaseSheet?.id)

    console.log(`\n  Answer count: ${answerCount || 0}`)

    // Get tags for this sheet
    const { data: sheetTags } = await supabase
      .from('sheet_tags')
      .select('tag_id')
      .eq('sheet_id', supabaseSheet?.id)

    if (sheetTags && sheetTags.length > 0) {
      const { data: tags } = await supabase
        .from('tags')
        .select('name')
        .in('id', sheetTags.map(st => st.tag_id))

      console.log(`  Tags: ${tags?.map(t => t.name).join(', ')}`)
    } else {
      console.log('  Tags: none')
    }

    // Check for any special fields that might indicate "hidden" status
    console.log('\nAll Bubble fields:')
    for (const [key, value] of Object.entries(bubbleSheet)) {
      if (key.toLowerCase().includes('hide') ||
          key.toLowerCase().includes('visible') ||
          key.toLowerCase().includes('archive') ||
          key.toLowerCase().includes('delete') ||
          key.toLowerCase().includes('active')) {
        console.log(`  ${key}: ${value}`)
      }
    }
  }
}

compareVersions()
