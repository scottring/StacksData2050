import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function findAnswers() {
  console.log('Trying multiple methods to find HYDROCARB answers in Bubble...\n')
  
  const sheetIds = {
    v1: '1659961669315x991901828578803700',
    v2: '1661440851034x545387418125598700', 
    v3: '1744099239597x968220647214809100'
  }
  
  // Method 1: Search by Parent Sheet = v3
  console.log('Method 1: Parent Sheet = v3')
  let url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Parent Sheet","constraint_type":"equals","value":"' + sheetIds.v3 + '"}]&limit=5'
  let response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }})
  let data = await response.json()
  console.log('  Found: ' + (data.response?.count || 0) + ' answers\n')
  
  // Method 2: Search by sheet name in Company field
  console.log('Method 2: Search all answers for HYDROCARB company')
  url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?limit=100'
  response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }})
  data = await response.json()
  const allAnswers = data.response?.results || []
  
  // Get the company ID from the sheet first
  const sheetUrl = BUBBLE_BASE_URL + '/api/1.1/obj/sheet/' + sheetIds.v3
  const sheetResponse = await fetch(sheetUrl, { headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }})
  const sheetData = await sheetResponse.json()
  const companyId = sheetData.response?.Company
  
  console.log('  Sheet company ID: ' + companyId)
  
  const matchingAnswers = allAnswers.filter(a => a.Company === companyId)
  console.log('  Found ' + matchingAnswers.length + ' answers for this company in first 100\n')
  
  if (matchingAnswers.length > 0) {
    console.log('  First matching answer:')
    const first = matchingAnswers[0]
    console.log('    Parent Sheet: ' + first['Parent Sheet'])
    console.log('    Answer: ' + (first.Answer || first.text || '(empty)'))
    console.log('    Parent Question: ' + first['Parent Question'])
  }
  
  // Method 3: Check if answers might be using Version Father Sheet
  console.log('\nMethod 3: Parent Sheet = Version Father (v1)')
  url = BUBBLE_BASE_URL + '/api/1.1/obj/answer?constraints=[{"key":"Parent Sheet","constraint_type":"equals","value":"' + sheetIds.v1 + '"}]&limit=5'
  response = await fetch(url, { headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }})
  data = await response.json()
  console.log('  Found: ' + (data.response?.count || 0) + ' answers\n')
}

findAnswers()
