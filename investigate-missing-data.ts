import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function investigate() {
  console.log('=== Investigating Missing Questions ===\n')

  // First, let's check Bubble for these specific answers
  const v2BubbleId = '1661440851034x545387418125598700' // HYDROCARB v2

  console.log('Checking Bubble for HYDROCARB v2 answers to questions 4.3.4 and 4.3.5...\n')

  for (const qNum of ['4.3.4', '4.3.5']) {
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${v2BubbleId}"},{"key":"Question","constraint_type":"equals","value":"${qNum}"}]`

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    console.log(`Question ${qNum}:`)
    if (data.response && data.response.results && data.response.results.length > 0) {
      const answer = data.response.results[0]
      console.log(`  Found in Bubble: YES`)
      console.log(`  Bubble Answer ID: ${answer._id}`)
      console.log(`  Answer text: ${answer.Answer || '(empty)'}`)
      console.log(`  Not applicable: ${answer['Not applicable'] || false}`)

      // Check if this answer exists in Supabase
      const { data: supabaseAnswer } = await supabase
        .from('answers')
        .select('*')
        .eq('bubble_id', answer._id)
        .maybeSingle()

      if (supabaseAnswer) {
        console.log(`  Exists in Supabase: YES`)
        console.log(`  Supabase ID: ${supabaseAnswer.id}`)
        console.log(`  Sheet ID: ${supabaseAnswer.sheet_id}`)
        console.log(`  Question ID: ${supabaseAnswer.parent_question_id}`)

        // Check what question this points to
        const { data: question } = await supabase
          .from('questions')
          .select('question_number, question_text')
          .eq('id', supabaseAnswer.parent_question_id)
          .maybeSingle()

        if (question) {
          console.log(`  Points to question: ${question.question_number}`)
        } else {
          console.log(`  ❌ Points to non-existent question ID: ${supabaseAnswer.parent_question_id}`)
        }
      } else {
        console.log(`  Exists in Supabase: NO`)
        console.log(`  ❌ This answer was never migrated!`)
      }
    } else {
      console.log(`  Found in Bubble: NO`)
    }
    console.log()
  }

  // Check total answer counts
  console.log('\n=== Total Answer Counts ===\n')

  const v2SheetId = '8222b70c-14dd-48ab-8ceb-e972c9d797c3'

  const { count: supabaseCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', v2SheetId)

  console.log(`HYDROCARB v2 in Supabase: ${supabaseCount} answers`)

  const bubbleUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${v2BubbleId}"}]`
  const bubbleResponse = await fetch(bubbleUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const bubbleData = await bubbleResponse.json() as any
  const bubbleCount = bubbleData.response ? bubbleData.response.count || 0 : 0
  console.log(`HYDROCARB v2 in Bubble: ${bubbleCount} answers`)
}

investigate()
