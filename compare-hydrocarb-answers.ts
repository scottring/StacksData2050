import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function compareAnswers() {
  // Focus on version 3 (most recent, April 2025)
  const bubbleSheetId = '1744099239597x968220647214809100'
  const supabaseSheetId = 'fc48461e-7a18-4cb1-887e-1a3686244ef0'
  
  console.log('Comparing HYDROCARB 90-ME 78% Version 3 (April 2025)\n')
  
  // Get answers from Bubble
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Parent Sheet","constraint_type":"equals","value":"' + bubbleSheetId + '"}]&limit=100'
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const bubbleAnswers = data.response?.results || []
  
  console.log('Bubble: ' + bubbleAnswers.length + ' answers')
  
  // Get answers from Supabase
  const { data: supabaseAnswers, count } = await supabase
    .from('answers')
    .select('*', { count: 'exact' })
    .eq('sheet_id', supabaseSheetId)
  
  console.log('Supabase: ' + (count || 0) + ' answers\n')
  
  if (bubbleAnswers.length > 0) {
    console.log('First 5 Bubble answers:')
    for (let i = 0; i < Math.min(5, bubbleAnswers.length); i++) {
      const a = bubbleAnswers[i]
      console.log((i+1) + '. Question ID: ' + a['Parent Question'])
      console.log('   Answer: ' + (a.Answer || a['Boolean value'] || a['Number value'] || '(empty)'))
      console.log('   Bubble Answer ID: ' + a._id)
    }
  }
  
  console.log('\n')
  
  if (supabaseAnswers && supabaseAnswers.length > 0) {
    console.log('First 5 Supabase answers:')
    for (let i = 0; i < Math.min(5, supabaseAnswers.length); i++) {
      const a = supabaseAnswers[i]
      console.log((i+1) + '. Question ID: ' + a.parent_question_id)
      console.log('   Answer: ' + (a.text_value || a.boolean_value || a.number_value || '(empty)'))
      console.log('   Bubble ID: ' + a.bubble_id)
    }
  }
}

compareAnswers()
