import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkHydrocarbDiscrepancy() {
  console.log('=== Checking HYDROCARB 90-ME 78% Questions 4.3.4 and 4.3.5 ===\n')

  // Get HYDROCARB sheets
  const { data: sheets } = await supabase
    .from('sheets')
    .select('id, name, version, bubble_id')
    .ilike('name', '%HYDROCARB 90-ME 78%')
    .order('version')

  if (!sheets) {
    console.log('No sheets found')
    return
  }

  console.log(`Found ${sheets.length} versions\n`)

  for (const sheet of sheets) {
    console.log(`\n=== Version ${sheet.version} ===`)
    console.log(`Sheet ID: ${sheet.id}`)
    console.log(`Bubble ID: ${sheet.bubble_id}\n`)

    // Get questions 4.3.4 and 4.3.5
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_number, question_text')
      .in('question_number', ['4.3.4', '4.3.5'])
      .order('question_number')

    if (!questions || questions.length === 0) {
      console.log('Questions 4.3.4 and 4.3.5 not found in database')
      continue
    }

    for (const question of questions) {
      console.log(`\nQuestion ${question.question_number}: ${question.question_text.substring(0, 60)}...`)
      console.log(`Question ID: ${question.id}`)

      // Check Supabase
      const { data: supabaseAnswer } = await supabase
        .from('answers')
        .select('*')
        .eq('sheet_id', sheet.id)
        .eq('parent_question_id', question.id)
        .maybeSingle()

      console.log('\nSupabase:')
      if (supabaseAnswer) {
        console.log(`  Answer exists: YES`)
        console.log(`  Answer ID: ${supabaseAnswer.id}`)
        console.log(`  Bubble ID: ${supabaseAnswer.bubble_id}`)
        console.log(`  Answer text: ${supabaseAnswer.answer_text || '(empty)'}`)
        console.log(`  Is NA: ${supabaseAnswer.is_not_applicable || false}`)
      } else {
        console.log(`  Answer exists: NO`)
      }

      // Check Bubble
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${sheet.bubble_id}"},{"key":"Question","constraint_type":"equals","value":"${question.question_number}"}]`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const data = await response.json() as any

      console.log('\nBubble:')
      if (data.response?.results && data.response.results.length > 0) {
        const bubbleAnswer = data.response.results[0]
        console.log(`  Answer exists: YES`)
        console.log(`  Answer ID: ${bubbleAnswer._id}`)
        console.log(`  Answer text: ${bubbleAnswer.Answer || '(empty)'}`)
        console.log(`  Is NA: ${bubbleAnswer['Not applicable'] || false}`)

        // Check if this answer exists in Supabase by bubble_id
        const { data: answerByBubbleId } = await supabase
          .from('answers')
          .select('id, sheet_id, parent_question_id, answer_text, is_not_applicable')
          .eq('bubble_id', bubbleAnswer._id)
          .maybeSingle()

        if (answerByBubbleId) {
          console.log(`\n  ⚠️  This Bubble answer EXISTS in Supabase but:`)
          console.log(`     Sheet ID: ${answerByBubbleId.sheet_id} (expected: ${sheet.id})`)
          console.log(`     Question ID: ${answerByBubbleId.parent_question_id} (expected: ${question.id})`)
          console.log(`     Answer text: ${answerByBubbleId.answer_text || '(empty)'}`)
          console.log(`     Is NA: ${answerByBubbleId.is_not_applicable || false}`)

          if (answerByBubbleId.sheet_id !== sheet.id) {
            console.log(`     ❌ WRONG SHEET!`)
          }
          if (answerByBubbleId.parent_question_id !== question.id) {
            console.log(`     ❌ WRONG QUESTION!`)
          }
        } else {
          console.log(`\n  ❌ This Bubble answer does NOT exist in Supabase at all`)
        }
      } else {
        console.log(`  Answer exists: NO`)
      }
    }
  }
}

checkHydrocarbDiscrepancy()
