import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixQuestionsForSubsection48() {
  const subsectionBubbleId = '1626200588208x767490048310378500'

  console.log('=== Finding Questions for Subsection 4.8 ===\n')

  // Get the subsection we just created
  const { data: subsection } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('bubble_id', subsectionBubbleId)
    .single()

  if (!subsection) {
    console.log('Subsection not found')
    return
  }

  console.log(`Subsection: ${subsection.name}`)
  console.log(`  ID: ${subsection.id}`)
  console.log(`  Order: ${subsection.order_number}\n`)

  // Fetch questions from Bubble that belong to this subsection
  console.log('Fetching questions from Bubble...')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"${subsectionBubbleId}"}]`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (!data.response || !data.response.results || data.response.results.length === 0) {
    console.log('No questions found in Bubble for this subsection')
    return
  }

  console.log(`Found ${data.response.results.length} questions in Bubble\n`)

  // Update each question in Supabase
  let fixed = 0
  let notFound = 0

  for (const bubbleQ of data.response.results) {
    const { data: supabaseQ } = await supabase
      .from('questions')
      .select('id, name, section_sort_number, subsection_sort_number, order_number')
      .eq('bubble_id', bubbleQ._id)
      .maybeSingle()

    if (supabaseQ) {
      const { error } = await supabase
        .from('questions')
        .update({
          parent_subsection_id: subsection.id,
          subsection_sort_number: subsection.order_number,
          section_sort_number: 4 // Food Contact
        })
        .eq('id', supabaseQ.id)

      if (!error) {
        const oldNum = `${supabaseQ.section_sort_number}.${supabaseQ.subsection_sort_number}.${supabaseQ.order_number}`
        const newNum = `4.8.${supabaseQ.order_number}`
        console.log(`✓ ${oldNum} → ${newNum}: ${supabaseQ.name?.substring(0, 50)}`)
        fixed++
      } else {
        console.log(`❌ Error updating: ${error.message}`)
      }
    } else {
      console.log(`❌ Question not found in Supabase: ${bubbleQ.Name?.substring(0, 50)}`)
      notFound++
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Not found: ${notFound}`)
}

fixQuestionsForSubsection48()
