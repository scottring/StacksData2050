import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkSubsectionAnswers() {
  console.log('=== Checking Answers for Subsection 4.8 ===\n')

  const subsectionBubbleId = '1626200588208x767490048310378500' // "Other relevant national legislations in Europe"
  const hydrocarbV2BubbleId = '1661440851034x545387418125598700'

  // Check if there are answers pointing to this subsection
  console.log('Checking Bubble for answers to this subsection...\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${hydrocarbV2BubbleId}"},{"key":"Parent Subsection","constraint_type":"equals","value":"${subsectionBubbleId}"}]`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (data.response && data.response.results && data.response.results.length > 0) {
    console.log(`Found ${data.response.count} answers for this subsection in Bubble:\n`)

    for (const answer of data.response.results.slice(0, 10)) {
      console.log(`Answer ID: ${answer._id}`)
      console.log(`  Answer: ${answer.Answer || '(empty)'}`)
      console.log(`  Question field: ${answer.Question || '(no Question field)'}`)
      console.log(`  Question ID: ${answer['Parent Question'] || '(no Parent Question)'}`)
      console.log(`  Custom row text: ${answer['Custom row text'] || '(none)'}`)
      console.log(`  Text value: ${answer['Text Value'] || '(none)'}`)
      console.log(`  Created: ${answer['Created Date']}`)
      console.log()
    }

    // Check if any of these exist in Supabase
    console.log('\n=== Checking Supabase ===\n')

    const sampleBubbleIds = data.response.results.slice(0, 5).map((a: any) => a._id)

    const { data: supabaseAnswers } = await supabase
      .from('answers')
      .select('id, bubble_id, parent_subsection_id, parent_question_id, custom_row_text, text_value')
      .in('bubble_id', sampleBubbleIds)

    if (supabaseAnswers && supabaseAnswers.length > 0) {
      console.log(`Found ${supabaseAnswers.length} of these answers in Supabase:`)
      for (const a of supabaseAnswers) {
        console.log(`  Bubble ID: ${a.bubble_id}`)
        console.log(`    parent_subsection_id: ${a.parent_subsection_id}`)
        console.log(`    parent_question_id: ${a.parent_question_id}`)
        console.log()
      }
    } else {
      console.log('None of these answers found in Supabase')
    }
  } else {
    console.log('No answers found for this subsection in Bubble')
  }

  // Also check if the subsection itself exists in Supabase
  console.log('\n=== Checking if Subsection Exists in Supabase ===\n')

  const { data: supabaseSubsection } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('bubble_id', subsectionBubbleId)
    .maybeSingle()

  if (supabaseSubsection) {
    console.log(`✓ Subsection exists in Supabase:`)
    console.log(`  ID: ${supabaseSubsection.id}`)
    console.log(`  Name: ${supabaseSubsection.name}`)
    console.log(`  Order: ${supabaseSubsection.order_number}`)
  } else {
    console.log(`❌ Subsection NOT FOUND in Supabase`)
  }
}

checkSubsectionAnswers()
