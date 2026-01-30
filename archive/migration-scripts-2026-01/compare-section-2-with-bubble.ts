import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function compareSection2WithBubble() {
  console.log('=== Comparing Section 2 with Bubble ===\n')

  // Get Section 2 questions from Supabase
  const { data: supabaseQuestions } = await supabase
    .from('questions')
    .select('id, name, bubble_id, section_sort_number, subsection_sort_number, order_number')
    .eq('section_sort_number', 2)
    .order('subsection_sort_number')
    .order('order_number')

  if (!supabaseQuestions) {
    console.log('No questions in Supabase')
    return
  }

  console.log(`Found ${supabaseQuestions.length} questions in Supabase\n`)
  console.log('=== Question by Question Comparison ===\n')

  for (const sQ of supabaseQuestions) {
    // Fetch from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${sQ.bubble_id}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (!data.response) {
      console.log(`❌ Not found in Bubble: ${sQ.name?.substring(0, 50)}`)
      continue
    }

    const bQ = data.response

    // Get subsection from Bubble to get its Order
    let bubbleSubsectionOrder = 'undefined'
    if (bQ['Parent Subsection']) {
      const subUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${bQ['Parent Subsection']}`
      const subResponse = await fetch(subUrl, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const subData = await subResponse.json() as any

      if (subData.response && subData.response.Order !== undefined && subData.response.Order !== null) {
        bubbleSubsectionOrder = subData.response.Order.toString()
      }
    }

    const supabaseNum = `${sQ.section_sort_number}.${sQ.subsection_sort_number}.${sQ.order_number}`
    const bubbleNum = `${bQ['SECTION SORT NUMBER']}.${bubbleSubsectionOrder}.${bQ.Order}`

    console.log(`${sQ.name?.substring(0, 55)}`)
    console.log(`  Supabase: ${supabaseNum}`)
    console.log(`  Bubble:   ${bubbleNum}`)

    if (supabaseNum !== bubbleNum) {
      console.log(`  ❌ MISMATCH`)
    } else {
      console.log(`  ✓ Match`)
    }
    console.log()
  }
}

compareSection2WithBubble()
