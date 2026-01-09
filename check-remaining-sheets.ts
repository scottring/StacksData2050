import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkRemainingSheets() {
  console.log('=== Checking sheets 1001-1649 ===\n')

  // Get sheets after first 1000
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, version, bubble_id')
    .not('bubble_id', 'is', null)
    .order('name, version')
    .range(1000, 1648) // Skip first 1000, get remaining 649

  if (!sheets || sheets.length === 0) {
    console.log('No sheets found')
    return
  }

  console.log(`Found ${sheets.length} sheets to check\n`)

  let needsFix = 0
  let correct = 0
  let errors = 0

  // Check first 10 as a sample
  for (const sheet of sheets.slice(0, 10)) {
    console.log(`${sheet.name} (v${sheet.version})`)

    try {
      // Get answers from Bubble
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{\"key\":\"Sheet\",\"constraint_type\":\"equals\",\"value\":\"${sheet.bubble_id}\"}]`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const data = await response.json() as any
      const bubbleCount = data.response?.count || 0

      if (bubbleCount === 0) {
        console.log(`  No answers\n`)
        continue
      }

      console.log(`  ${bubbleCount} answers in Bubble`)

      // Check Supabase
      const answerBubbleIds = data.response.results.map((a: any) => a._id)
      const { data: supabaseAnswers } = await supabase
        .from('answers')
        .select('id, bubble_id, sheet_id')
        .in('bubble_id', answerBubbleIds)

      if (!supabaseAnswers || supabaseAnswers.length === 0) {
        console.log(`  ⚠️  No answers in Supabase\n`)
        continue
      }

      const wrongMappings = supabaseAnswers.filter(a => a.sheet_id !== sheet.id)

      if (wrongMappings.length > 0) {
        console.log(`  ❌ ${wrongMappings.length} answers have WRONG sheet_id!`)
        needsFix++
      } else {
        console.log(`  ✓ All correct`)
        correct++
      }

    } catch (error) {
      console.log(`  ERROR: ${error}`)
      errors++
    }

    console.log()
  }

  console.log(`\nSample results (first 10 sheets):`)
  console.log(`  Correct: ${correct}`)
  console.log(`  Need fixing: ${needsFix}`)
  console.log(`  Errors: ${errors}`)
}

checkRemainingSheets()
