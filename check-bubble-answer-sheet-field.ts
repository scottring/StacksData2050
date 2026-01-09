import fetch from 'node-fetch'
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

    console.log('Sample answers:')
    data.response.results.slice(0, 3).forEach((answer: any, i: number) => {
      console.log(`\nAnswer ${i + 1}:`)
      console.log(`  _id: ${answer._id}`)
      console.log(`  Sheet field: ${answer.Sheet}`)
      console.log(`  Created: ${answer['Created Date']}`)
      console.log(`  Text: ${answer.text?.substring(0, 50)}`)
    })

    const sheetValue = data.response.results[0].Sheet
    console.log(`\n✓ Bubble answers DO have Sheet field = "${sheetValue}"`)
    console.log(`✓ This matches the V2 bubble_id we queried`)

    // Now check if these answer bubble_ids exist in Supabase
    console.log('\n=== Checking Supabase ===\n')

    const answerBubbleIds = data.response.results.map((a: any) => a._id).slice(0, 3)

    for (const bubbleId of answerBubbleIds) {
      const { data: supabaseAnswer } = await import('./src/migration/supabase-client.js').then(m => m.supabase)
        .from('answers')
        .select('id, bubble_id, sheet_id')
        .eq('bubble_id', bubbleId)
        .maybeSingle()

      console.log(`Answer ${bubbleId}:`)
      if (supabaseAnswer) {
        console.log(`  ✓ EXISTS in Supabase`)
        console.log(`  sheet_id: ${supabaseAnswer.sheet_id}`)

        // Check which sheet this is
        const { data: sheet } = await import('./src/migration/supabase-client.js').then(m => m.supabase)
          .from('sheets')
          .select('name, version, bubble_id')
          .eq('id', supabaseAnswer.sheet_id)
          .single()

        if (sheet) {
          console.log(`  Attached to: ${sheet.name} (v${sheet.version})`)
          console.log(`  Sheet bubble_id: ${sheet.bubble_id}`)
        }
      } else {
        console.log(`  ✗ NOT in Supabase`)
      }
      console.log()
    }
  }
}

checkBubbleAnswerSheetField()
