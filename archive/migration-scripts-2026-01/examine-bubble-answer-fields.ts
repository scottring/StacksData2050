import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function examineAnswer() {
  // Use the answer we found earlier: "Calcium carbonate slurry"
  const answerId = '1744099250178x831699713583544800'
  
  console.log('Examining Bubble answer structure for "Calcium carbonate slurry"\n')
  
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/answer/' + answerId
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
  })
  
  const data = await response.json()
  const answer = data.response
  
  if (answer) {
    console.log('All fields:\n')
    for (const [key, value] of Object.entries(answer).sort()) {
      console.log(key + ': ' + value)
    }
  }
}

examineAnswer()
