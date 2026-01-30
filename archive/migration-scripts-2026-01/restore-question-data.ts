import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function restoreQuestionData() {
  console.log('=== Restoring ALL Question Data from Bubble ===\n')

  // Get ALL questions from Supabase that have a bubble_id
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, name')
    .not('bubble_id', 'is', null)

  if (!questions) {
    console.log('No questions found')
    return
  }

  console.log(`Processing ${questions.length} questions...\n`)

  let fixed = 0
  let errors = 0

  for (const q of questions) {
    // Fetch from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${q.bubble_id}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (!data.response) {
      console.log(`❌ Question not found in Bubble: ${q.bubble_id}`)
      errors++
      continue
    }

    const bubbleQ = data.response

    // Get the correct values from Bubble
    const sectionSort = bubbleQ['SECTION SORT NUMBER']
    const order = bubbleQ.Order

    // subsection_sort_number needs to come from the subsection's order
    let subsectionSort = null

    if (bubbleQ['Parent Subsection']) {
      // Get subsection from Supabase to get its order
      const { data: supabaseSubsection } = await supabase
        .from('subsections')
        .select('id, order_number')
        .eq('bubble_id', bubbleQ['Parent Subsection'])
        .maybeSingle()

      if (supabaseSubsection && supabaseSubsection.order_number !== null) {
        subsectionSort = supabaseSubsection.order_number
      }
    }

    // Update the question
    const { error } = await supabase
      .from('questions')
      .update({
        section_sort_number: sectionSort,
        subsection_sort_number: subsectionSort,
        order_number: order
      })
      .eq('id', q.id)

    if (error) {
      console.log(`❌ Error updating: ${error.message}`)
      errors++
    } else {
      fixed++
      if (fixed % 50 === 0) {
        console.log(`Processed ${fixed} questions...`)
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Errors: ${errors}`)
}

restoreQuestionData()
