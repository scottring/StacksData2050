import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function getCompanyAnswers() {
  const companyId = '1632528653620x894781459715850200' // Omya Hustadmarmor AS
  
  console.log('Getting all answers for Omya Hustadmarmor AS (HYDROCARB company)...\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Company","constraint_type":"equals","value":"' + companyId + '"}]'
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const data = await response.json()
  const answers = data.response?.results || []
  const total = data.response?.count || 0
  
  console.log('Total answers for this company: ' + total)
  console.log('First 10 answers:\n')
  
  for (let i = 0; i < Math.min(10, answers.length); i++) {
    const a = answers[i]
    console.log((i+1) + '. Parent Sheet: ' + (a['Parent Sheet'] || 'undefined'))
    console.log('   Parent Question: ' + a['Parent Question'])
    console.log('   Answer: ' + (a.Answer || a.text || a['Boolean value'] || '(empty)'))
    console.log()
  }
}

getCompanyAnswers()
