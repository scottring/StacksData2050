import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function checkFrance() {
  // The France subsection we know about
  const franceBubbleId = '1626200040380x408841375660113900'
  
  console.log('Checking Bubble France subsection...\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?constraints=[{"key":"Parent Subsection","constraint_type":"equals","value":"' + franceBubbleId + '"}]'
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  const data = await response.json()
  const questions = (data.response?.results || []).sort((a, b) => (a.Order || 999) - (b.Order || 999))
  
  console.log('Bubble subsection ' + franceBubbleId + ':')
  console.log('Questions: ' + questions.length + '\n')
  
  questions.forEach((q, i) => {
    console.log((i+1) + '. Order: ' + q.Order)
    console.log('   ID: ' + q._id)
    console.log('   Text: ' + (q['Question text'] || '').substring(0, 60))
    console.log()
  })
}

checkFrance()
