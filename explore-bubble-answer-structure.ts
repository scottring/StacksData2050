import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function exploreAnswers() {
  console.log('Searching for ANY answer in the system to see structure...\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?limit=1'
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const data = await response.json()
  const answer = data.response?.results?.[0]
  
  if (answer) {
    console.log('Sample answer fields:')
    console.log(Object.keys(answer).sort().join(', '))
    
    console.log('\n\nLooking for version-related fields:')
    for (const key of Object.keys(answer).sort()) {
      if (key.toLowerCase().includes('version') || 
          key.toLowerCase().includes('sheet')) {
        console.log(key + ': ' + answer[key])
      }
    }
  }
  
  // Now search for answers that have HYDROCARB in any related field
  console.log('\n\nSearching for answers related to HYDROCARB product...')
  
  const searchUrl = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Answer name","constraint_type":"text contains","value":"HYDROCARB"}]&limit=5'
  
  const searchResponse = await fetch(searchUrl, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const searchData = await searchResponse.json()
  const foundAnswers = searchData.response?.results || []
  
  console.log('Found ' + foundAnswers.length + ' answers with HYDROCARB in Answer name')
  
  if (foundAnswers.length > 0) {
    console.log('\nFirst answer details:')
    const first = foundAnswers[0]
    console.log('Parent Sheet: ' + first['Parent Sheet'])
    console.log('Answer: ' + (first.Answer || first['Boolean value']))
  }
}

exploreAnswers()
