import fetch from 'node-fetch'
import { supabase } from './src/migration/supabase-client.js'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkBubbleAnswerSheetField() {
  console.log('=== Checking Bubble Answer Sheet Field ===\n')

  // Query answers for V2 sheet
  const v2BubbleId = '1633694151545x385267416349016060' // Testproduct_Omya_A v2

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${v2BubbleId}"}]&limit=5`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })

  const data = await response.json() as any

  if (data.response?.results && data.response.results.length > 0) {
    console.log(`Found ${data.response.count} answers in Bubble for V2 sheet\n`)

    const answerBubbleIds = data.response.results.map((a: any) => a._id)

    console.log('=== Checking Supabase ===\n')

    for (const bubbleId of answerBubbleIds) {
      const { data: supabaseAnswer } = await supabase
        .from('answers')
        .select('id, bubble_id, sheet_id')
        .eq('bubble_id', bubbleId)
        .maybeSingle()

      console.log(`Answer ${bubbleId.substring(0, 20)}...:`)
      if (supabaseAnswer) {
        console.log(`  ✓ EXISTS in Supabase`)
        console.log(`  sheet_id: ${supabaseAnswer.sheet_id}`)

        // Check which sheet this is
        const { data: sheet } = await supabase
          .from('sheets')
          .select('name, version, bubble_id')
          .eq('id', supabaseAnswer.sheet_id)
          .single()

        if (sheet) {
          console.log(`  Attached to: ${sheet.name} (v${sheet.version})`)
          console.log(`  Sheet bubble_id: ${sheet.bubble_id}`)

          if (sheet.bubble_id !== v2BubbleId) {
            console.log(`  ⚠️  MISMATCH: Answer is attached to different sheet version!`)
          }
        }
      } else {
        console.log(`  ✗ NOT in Supabase - needs migration`)
      }
      console.log()
    }

    // Summary
    console.log('\n=== Summary ===\n')
    console.log('The issue: Answers exist in Supabase but are attached to wrong sheet_id')
    console.log('Solution: Need to UPDATE existing answers to point to correct V2+ sheet')
    console.log('NOT insert new answers!')
  }
}

checkBubbleAnswerSheetField()
