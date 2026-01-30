import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function findSheetWithAnswers() {
  console.log('Looking for HYDROCARB sheets in Bubble with answers...\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/sheet?constraints=[{"key":"Name","constraint_type":"text contains","value":"HYDROCARB 90-ME 78"}]'
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const data = await response.json()
  const sheets = data.response?.results || []
  
  console.log('Found ' + sheets.length + ' sheets in Bubble\n')
  
  for (const sheet of sheets) {
    const answerUrl = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Parent Sheet","constraint_type":"equals","value":"' + sheet._id + '"}]&limit=1'
    
    const answerResponse = await fetch(answerUrl, {
      headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
    })
    
    const answerData = await answerResponse.json()
    const answerCount = answerData.response?.count || 0
    
    console.log('Sheet: ' + sheet.Name)
    console.log('  Bubble ID: ' + sheet._id)
    console.log('  Created: ' + sheet['Created Date'])
    console.log('  Answers in Bubble: ' + answerCount)
    
    if (answerCount > 0) {
      console.log('  *** THIS SHEET HAS ANSWERS IN BUBBLE ***')
    }
    console.log()
  }
}

findSheetWithAnswers()
