import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function getAnswersBySheet() {
  const v3SheetId = '1744099239597x968220647214809100'
  
  console.log('Getting answers using "Sheet" field instead of "Parent Sheet"\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"' + v3SheetId + '"}]'
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const data = await response.json()
  const answers = data.response?.results || []
  const total = data.response?.count || 0
  
  console.log('Found ' + total + ' answers using Sheet field!')
  console.log('\nFirst 10 answers:\n')
  
  for (let i = 0; i < Math.min(10, answers.length); i++) {
    const a = answers[i]
    console.log((i+1) + '. ' + (a.text || a.Answer || a['Boolean value'] || '(empty)'))
    console.log('   Sheet: ' + a.Sheet)
    console.log('   Parent Question: ' + a['Parent Question'])
    console.log()
  }
}

getAnswersBySheet()
