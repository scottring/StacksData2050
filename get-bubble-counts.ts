import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

/**
 * Get actual counts from Bubble (not just first page)
 */

async function getBubbleCounts() {
  console.log('📊 Getting accurate counts from Bubble API\n')

  const entities = ['question', 'section', 'subsection', 'answer', 'sheet', 'company', 'comment', 'answer_rejection']

  for (const entity of entities) {
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/${entity}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })

    const data = await response.json() as any

    if (data.response) {
      console.log(`${entity.padEnd(15)} Total: ${data.response.count?.toLocaleString() || 'unknown'}`)
      console.log(`${' '.repeat(15)} Returned: ${data.response.results?.length || 0}`)
      console.log(`${' '.repeat(15)} Remaining: ${data.response.remaining || 0}`)
      console.log()
    } else {
      console.log(`${entity.padEnd(15)} ERROR: ${JSON.stringify(data).substring(0, 100)}`)
      console.log()
    }
  }
}

getBubbleCounts().catch(console.error)
