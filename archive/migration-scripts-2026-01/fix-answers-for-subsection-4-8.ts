import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fixAnswersForSubsection48() {
  const subsectionBubbleId = '1626200588208x767490048310378500'

  console.log('=== Finding Answers for Subsection 4.8 ===\n')

  // Get the subsection
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
  console.log(`  ID: ${subsection.id}\n`)

  // Fetch answers from Bubble for this subsection
  console.log('Fetching answers from Bubble...')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"${subsectionBubbleId}"}]`
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (!data.response || !data.response.results || data.response.results.length === 0) {
    console.log('No answers found in Bubble for this subsection')
    return
  }

  console.log(`Found ${data.response.count} answers in Bubble\n`)

  // Update answers in Supabase
  let fixed = 0
  let notFound = 0

  for (const bubbleA of data.response.results) {
    const { data: supabaseA } = await supabase
      .from('answers')
      .select('id, bubble_id, parent_subsection_id')
      .eq('bubble_id', bubbleA._id)
      .maybeSingle()

    if (supabaseA) {
      const { error } = await supabase
        .from('answers')
        .update({
          parent_subsection_id: subsection.id
        })
        .eq('id', supabaseA.id)

      if (!error) {
        console.log(`✓ Fixed answer: ${bubbleA._id}`)
        fixed++
      } else {
        console.log(`❌ Error: ${error.message}`)
      }
    } else {
      console.log(`❌ Answer not found in Supabase: ${bubbleA._id}`)
      notFound++
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Not found: ${notFound}`)
}

fixAnswersForSubsection48()
