import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function compare() {
  const bubbleSheetId = '1744099239597x968220647214809100'
  const supabaseSheetId = 'fc48461e-7a18-4cb1-887e-1a3686244ef0'
  
  console.log('Comparing HYDROCARB 90-ME 78% (April 2025 version)')
  console.log('='.repeat(60) + '\n')
  
  // Get Bubble answers
  const bubbleUrl = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"' + bubbleSheetId + '"}]'
  const bubbleResponse = await fetch(bubbleUrl, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const bubbleData = await bubbleResponse.json()
  const bubbleAnswers = bubbleData.response?.results || []
  
  // Get Supabase answers
  const { data: supabaseAnswers } = await supabase
    .from('answers')
    .select('*')
    .eq('sheet_id', supabaseSheetId)
  
  console.log('Bubble: ' + bubbleAnswers.length + ' answers')
  console.log('Supabase: ' + (supabaseAnswers?.length || 0) + ' answers\n')
  
  // Create maps by Bubble ID
  const bubbleMap = new Map()
  bubbleAnswers.forEach(a => {
    bubbleMap.set(a._id, {
      question: a['Parent Question'],
      value: a.text || a.Answer || a['Boolean value'] || a['Number value'] || null
    })
  })
  
  const supabaseMap = new Map()
  supabaseAnswers?.forEach(a => {
    if (a.bubble_id) {
      supabaseMap.set(a.bubble_id, {
        question: a.parent_question_id,
        value: a.text_value || a.text_area_value || a.boolean_value || a.number_value || null
      })
    }
  })
  
  // Find matches and mismatches
  let matched = 0
  let valueMismatch = 0
  let missingInSupabase = 0
  const mismatches = []
  
  for (const [bubbleId, bubbleAnswer] of bubbleMap) {
    const supabaseAnswer = supabaseMap.get(bubbleId)
    
    if (!supabaseAnswer) {
      missingInSupabase++
    } else {
      matched++
      if (bubbleAnswer.value != supabaseAnswer.value) {
        valueMismatch++
        if (mismatches.length < 10) {
          mismatches.push({
            bubbleId,
            bubble: bubbleAnswer.value,
            supabase: supabaseAnswer.value
          })
        }
      }
    }
  }
  
  // Find answers in Supabase not in Bubble
  let extraInSupabase = 0
  for (const bubbleId of supabaseMap.keys()) {
    if (!bubbleMap.has(bubbleId)) {
      extraInSupabase++
    }
  }
  
  console.log('RESULTS:')
  console.log('-'.repeat(60))
  console.log('Matched: ' + matched + '/' + bubbleAnswers.length)
  console.log('Missing in Supabase: ' + missingInSupabase)
  console.log('Extra in Supabase: ' + extraInSupabase)
  console.log('Value mismatches: ' + valueMismatch + '\n')
  
  if (mismatches.length > 0) {
    console.log('First ' + mismatches.length + ' value mismatches:\n')
    for (let i = 0; i < mismatches.length; i++) {
      const m = mismatches[i]
      console.log((i+1) + '. Bubble ID: ' + m.bubbleId)
      console.log('   Bubble: "' + m.bubble + '"')
      console.log('   Supabase: "' + m.supabase + '"')
      console.log()
    }
  }
  
  if (matched === bubbleAnswers.length && valueMismatch === 0) {
    console.log('✓ All answers match perfectly!')
  }
}

compare()
