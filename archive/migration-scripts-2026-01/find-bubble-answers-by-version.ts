import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function findAnswers() {
  const versionFatherId = '1659961669315x991901828578803700' // Version 1
  
  console.log('Checking answers for Version Father Sheet (Version 1)...\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Parent Sheet","constraint_type":"equals","value":"' + versionFatherId + '"}]&limit=10'
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const data = await response.json()
  const answers = data.response?.results || []
  const total = data.response?.count || 0
  
  console.log('Found ' + total + ' answers for Version Father Sheet (Version 1)')
  console.log('Showing first 10:\n')
  
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i]
    console.log((i+1) + '. Answer ID: ' + a._id)
    console.log('   Question: ' + a['Parent Question'])
    console.log('   Answer: ' + (a.Answer || a['Boolean value'] || a['Number value'] || '(empty)'))
    console.log('   Created: ' + a['Created Date'])
    console.log()
  }
}

findAnswers()
