import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkBubbleQuestions() {
  console.log('=== Checking Bubble Questions Structure ===\n')

  // Get a sample of questions from Bubble
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question?limit=10`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (!data.response || !data.response.results) {
    console.log('No questions found in Bubble')
    return
  }

  console.log(`Found ${data.response.count} total questions in Bubble\n`)
  console.log('Sample question fields:')
  
  const firstQuestion = data.response.results[0]
  console.log(Object.keys(firstQuestion).join(', '))

  console.log('\n\nFirst question sample:')
  console.log(JSON.stringify(firstQuestion, null, 2))

  // Check if there's a Question field with numbering
  console.log('\n\n=== Checking for Question Number Field ===\n')

  for (const q of data.response.results.slice(0, 5)) {
    const questionField = q.Question || q['Question Number'] || q.ID
    console.log(`ID: ${q.ID} | Question: ${q.Question || '(none)'} | Name: ${q.Name ? q.Name.substring(0, 50) : '(none)'}`)
  }
}

checkBubbleQuestions()
