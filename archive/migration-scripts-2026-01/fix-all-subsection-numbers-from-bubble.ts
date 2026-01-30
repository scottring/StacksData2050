import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixAllSubsectionNumbers() {
  console.log('=== Fixing ALL Question Subsection Numbers from Bubble ===\n')

  // Get all questions with non-null section
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, bubble_id, section_sort_number, subsection_sort_number, order_number, parent_subsection_id')
    .not('section_sort_number', 'is', null)

  if (!questions) {
    console.log('No questions found')
    return
  }

  console.log(`Processing ${questions.length} questions...\n`)

  let fixed = 0
  let errors = 0

  for (const q of questions) {
    // Get the question from Bubble
    const qUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${q.bubble_id}`
    const qResponse = await fetch(qUrl, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const qData = await qResponse.json() as any

    if (!qData.response) {
      console.log(`❌ Question ${q.bubble_id} not found in Bubble`)
      errors++
      continue
    }

    const bubbleQ = qData.response
    const parentSubsectionId = bubbleQ['Parent Subsection']

    if (!parentSubsectionId) {
      console.log(`⚠️  Question has no Parent Subsection: ${q.name?.substring(0, 50)}`)
      continue
    }

    // Get the subsection from Bubble to get its Order
    const sUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection/${parentSubsectionId}`
    const sResponse = await fetch(sUrl, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const sData = await sResponse.json() as any

    if (!sData.response) {
      console.log(`❌ Subsection ${parentSubsectionId} not found in Bubble`)
      errors++
      continue
    }

    const bubbleSubsection = sData.response
    const subsectionOrder = bubbleSubsection.Order

    // The correct numbering from Bubble
    const correctSection = bubbleQ['SECTION SORT NUMBER']
    const correctSubsection = subsectionOrder
    const correctOrder = bubbleQ.Order

    // Check if it matches current Supabase
    const currentNum = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
    const correctNum = `${correctSection}.${correctSubsection}.${correctOrder}`

    if (currentNum !== correctNum) {
      const { error } = await supabase
        .from('questions')
        .update({
          section_sort_number: correctSection,
          subsection_sort_number: correctSubsection,
          order_number: correctOrder
        })
        .eq('id', q.id)

      if (error) {
        console.log(`❌ Error updating ${q.name?.substring(0, 40)}: ${error.message}`)
        errors++
      } else {
        console.log(`✓ ${currentNum} → ${correctNum}: ${q.name?.substring(0, 40)}`)
        fixed++
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Errors: ${errors}`)
}

fixAllSubsectionNumbers()
