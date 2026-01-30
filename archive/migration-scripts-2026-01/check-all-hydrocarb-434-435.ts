import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkAll() {
  console.log('=== Checking all HYDROCARB versions for 4.3.4 and 4.3.5 ===\n')

  const versions = [
    { v: 1, bubbleId: '1659961669315x991901828578803700' },
    { v: 2, bubbleId: '1661440851034x545387418125598700' },
    { v: 3, bubbleId: '1744099239597x968220647214809100' }
  ]

  for (const ver of versions) {
    console.log(`\n=== Version ${ver.v} ===`)

    for (const qNum of ['4.3.4', '4.3.5']) {
      const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${ver.bubbleId}"},{"key":"Question","constraint_type":"equals","value":"${qNum}"}]`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })
      const data = await response.json() as any

      const found = data.response && data.response.results && data.response.results.length > 0
      console.log(`  Question ${qNum}: ${found ? 'EXISTS' : 'NOT FOUND'}`)

      if (found) {
        const answer = data.response.results[0]
        const answerText = answer.Answer || '(empty)'
        const notApplicable = answer['Not applicable'] || false
        console.log(`    Answer: ${answerText}`)
        console.log(`    Not applicable: ${notApplicable}`)
      }
    }
  }

  // Also check what questions ARE answered in these sections
  console.log('\n\n=== Sample Questions Answered in v2 (first 20) ===\n')

  const v2Url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${versions[1].bubbleId}"}]&limit=20`
  const v2Response = await fetch(v2Url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const v2Data = await v2Response.json() as any

  if (v2Data.response && v2Data.response.results) {
    const questions = v2Data.response.results.map((a: any) => a.Question).filter((q: any) => q).sort()
    const unique = Array.from(new Set(questions))
    console.log(unique.slice(0, 30).join(', '))
  }
}

checkAll()
