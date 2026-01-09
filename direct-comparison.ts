import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function directComparison() {
  // Use the HYDROCARB v2 sheet bubble ID from earlier context
  const sheetBubbleId = '1661440851034x545387418125598700'

  console.log('=== Direct Bubble vs Supabase Comparison ===\n')
  console.log(`Sheet Bubble ID: ${sheetBubbleId}\n`)

  // Get ALL questions from Bubble for this sheet
  console.log('Fetching ALL questions from Bubble...')
  const bubbleUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/question?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheetBubbleId}"}]&sort_field=SECTION%20SORT%20NUMBER&sort_field=SUBSECTION%20SORT%20NUMBER&sort_field=Order&limit=200`

  const bubbleResponse = await fetch(bubbleUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleData = await bubbleResponse.json() as any

  if (!bubbleData.response || !bubbleData.response.results) {
    console.log('No questions found in Bubble')
    return
  }

  const bubbleQuestions = bubbleData.response.results
  console.log(`Found ${bubbleQuestions.length} questions in Bubble\n`)

  // Get the sheet in Supabase
  const { data: sheet } = await supabase
    .from('sheets')
    .select('id, name')
    .eq('bubble_id', sheetBubbleId)
    .maybeSingle()

  if (!sheet) {
    console.log('Sheet not found in Supabase')
    return
  }

  console.log(`Supabase sheet: ${sheet.name}\n`)

  // Get ALL questions from Supabase
  const { data: supabaseQuestions } = await supabase
    .from('questions')
    .select('id, name, bubble_id, section_sort_number, subsection_sort_number, order_number')
    .eq('parent_sheet_id', sheet.id)

  console.log(`Found ${supabaseQuestions?.length || 0} questions in Supabase\n`)

  console.log('=== SIDE BY SIDE COMPARISON ===\n')

  let mismatches = 0
  let missing = 0

  for (let i = 0; i < bubbleQuestions.length; i++) {
    const bQ = bubbleQuestions[i]
    const sQ = supabaseQuestions?.find(q => q.bubble_id === bQ._id)

    const bubbleNum = `${bQ['SECTION SORT NUMBER']}.${bQ['SUBSECTION SORT NUMBER']}.${bQ.Order}`

    console.log(`[${i + 1}] ${bQ.Name?.substring(0, 60)}`)
    console.log(`    Bubble:    ${bubbleNum}`)

    if (sQ) {
      const supabaseNum = `${sQ.section_sort_number}.${sQ.subsection_sort_number}.${sQ.order_number}`
      console.log(`    Supabase:  ${supabaseNum}`)

      if (bubbleNum !== supabaseNum) {
        console.log(`    ❌ MISMATCH`)
        mismatches++
      }
    } else {
      console.log(`    Supabase:  MISSING`)
      console.log(`    ❌ NOT IN SUPABASE`)
      missing++
    }
    console.log()
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total questions: ${bubbleQuestions.length}`)
  console.log(`Mismatches: ${mismatches}`)
  console.log(`Missing: ${missing}`)
}

directComparison()
