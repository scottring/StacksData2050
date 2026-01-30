import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareSheetQuestions() {
  console.log('=== Comparing Sheet Questions: Bubble vs Supabase ===\n')

  // Get a real sheet from Supabase - pick one with answers
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, bubble_id')
    .not('bubble_id', 'is', null)
    .limit(10)

  if (!sheets || sheets.length === 0) {
    console.log('No sheets found')
    return
  }

  // Use the first sheet
  const sheet = sheets[0]
  console.log(`Analyzing sheet: ${sheet.name}`)
  console.log(`Supabase ID: ${sheet.id}`)
  console.log(`Bubble ID: ${sheet.bubble_id}\n`)

  // Get questions from Bubble for this sheet
  console.log('Fetching questions from Bubble...')
  const bubbleUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/question?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheet.bubble_id}"}]&sort_field=Order&limit=100`

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

  // Get questions from Supabase for this sheet
  const { data: supabaseQuestions } = await supabase
    .from('questions')
    .select('id, name, bubble_id, section_sort_number, subsection_sort_number, order_number')
    .eq('parent_sheet_id', sheet.id)
    .order('section_sort_number', { ascending: true, nullsFirst: false })
    .order('subsection_sort_number', { ascending: true, nullsFirst: false })
    .order('order_number', { ascending: true })

  console.log(`Found ${supabaseQuestions?.length || 0} questions in Supabase\n`)

  // Compare them
  console.log('=== Question by Question Comparison ===\n')

  for (let i = 0; i < Math.min(30, bubbleQuestions.length); i++) {
    const bubbleQ = bubbleQuestions[i]
    const supabaseQ = supabaseQuestions?.find(q => q.bubble_id === bubbleQ._id)

    const bubbleNum = `${bubbleQ['SECTION SORT NUMBER']}.${bubbleQ['SUBSECTION SORT NUMBER']}.${bubbleQ.Order}`

    console.log(`#${i + 1}: ${bubbleQ.Name?.substring(0, 50)}`)
    console.log(`  Bubble:    ${bubbleNum}`)

    if (supabaseQ) {
      const supabaseNum = `${supabaseQ.section_sort_number}.${supabaseQ.subsection_sort_number}.${supabaseQ.order_number}`
      console.log(`  Supabase:  ${supabaseNum}`)

      if (bubbleNum !== supabaseNum) {
        console.log(`  ❌ MISMATCH!`)
      } else {
        console.log(`  ✓ Match`)
      }
    } else {
      console.log(`  Supabase:  NOT FOUND`)
      console.log(`  ❌ MISSING IN SUPABASE`)
    }
    console.log()
  }
}

compareSheetQuestions()
