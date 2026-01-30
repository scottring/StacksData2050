import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { supabase } from './src/migration/supabase-client.js'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function deepDive() {
  const v3SheetId = '1744099239597x968220647214809100'
  const v3SupabaseId = 'fc48461e-7a18-4cb1-887e-1a3686244ef0'
  
  console.log('Deep dive: Comparing specific answer values...\n')
  
  // Get Supabase answers
  const { data: supabaseAnswers } = await supabase
    .from('answers')
    .select('*, questions!parent_question_id(content)')
    .eq('sheet_id', v3SupabaseId)
    .limit(20)
  
  console.log('Supabase answers (first 10):')
  if (supabaseAnswers) {
    for (let i = 0; i < Math.min(10, supabaseAnswers.length); i++) {
      const a = supabaseAnswers[i]
      const answer = a.text_value || a.text_area_value || a.number_value || a.boolean_value || '(empty)'
      console.log((i+1) + '. ' + answer)
      console.log('   Bubble ID: ' + a.bubble_id)
    }
  }
  
  console.log('\n\nNow checking if those Bubble IDs exist in Bubble API...\n')
  
  // Check if one of those answer IDs exists in Bubble
  if (supabaseAnswers && supabaseAnswers.length > 0) {
    const testAnswer = supabaseAnswers.find(a => a.text_value)
    if (testAnswer) {
      console.log('Testing answer with text: "' + testAnswer.text_value + '"')
      console.log('Bubble ID: ' + testAnswer.bubble_id + '\n')
      
      const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer/' + testAnswer.bubble_id
      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
      })
      const data = await response.json()
      
      if (data.response) {
        console.log('FOUND IN BUBBLE:')
        console.log('  Answer text: ' + (data.response.Answer || data.response.text))
        console.log('  Parent Sheet: ' + data.response['Parent Sheet'])
        console.log('  Parent Question: ' + data.response['Parent Question'])
        console.log('  Company: ' + data.response.Company)
      } else {
        console.log('NOT FOUND in Bubble API')
      }
    }
  }
}

deepDive()
