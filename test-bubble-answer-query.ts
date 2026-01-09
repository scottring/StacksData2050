import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function testBubbleAnswerQuery() {
  console.log('=== Testing Bubble Answer API ===\n')

  // First, get any answers to see the structure
  console.log('1. Getting sample answers from Bubble...')
  const sampleUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?limit=5`

  const sampleResponse = await fetch(sampleUrl, {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  })

  const sampleData = await sampleResponse.json() as any

  if (sampleData.response?.results && sampleData.response.results.length > 0) {
    console.log(`\nFound ${sampleData.response.count} total answers in Bubble`)
    console.log('\nSample answer structure:')
    const sample = sampleData.response.results[0]

    // Show all fields
    console.log('\nAll fields in Answer object:')
    Object.keys(sample).filter(k => !k.startsWith('_')).forEach(key => {
      const value = sample[key]
      const valueStr = typeof value === 'string' ? value.substring(0, 50) : String(value)
      console.log(`  ${key}: ${valueStr}`)
    })

    // Check what the Sheet field looks like
    console.log(`\n\nSheet field value: ${sample.Sheet}`)
    console.log(`Sheet field type: ${typeof sample.Sheet}`)

    // Now try to find answers for HYDROCARB Version 1
    console.log('\n2. Searching for HYDROCARB answers by different methods...\n')

    const v1BubbleId = '1659961669315x991901828578803700'

    // Try exact match
    console.log(`Method 1: Exact match for Sheet = "${v1BubbleId}"`)
    const url1 = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${v1BubbleId}"}]&limit=10`
    const resp1 = await fetch(url1, { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } })
    const data1 = await resp1.json() as any
    console.log(`  Results: ${data1.response?.results?.length || 0} answers`)

    // Try searching in the sheet answers list by getting the sheet first
    console.log(`\nMethod 2: Get sheet first, then check for answers relationship`)
    const sheetUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet/${v1BubbleId}`
    const sheetResp = await fetch(sheetUrl, { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } })
    const sheetData = await sheetResp.json() as any

    if (sheetData.response) {
      console.log('  Sheet found!')
      console.log(`  Product Name: ${sheetData.response['Product Name']}`)

      // Check if there's an answers field
      const answerFields = Object.keys(sheetData.response).filter(k =>
        k.toLowerCase().includes('answer')
      )

      if (answerFields.length > 0) {
        console.log(`  Answer-related fields: ${answerFields.join(', ')}`)
        answerFields.forEach(field => {
          const value = sheetData.response[field]
          if (Array.isArray(value)) {
            console.log(`    ${field}: [${value.length} items]`)
          } else {
            console.log(`    ${field}: ${value}`)
          }
        })
      }
    }

    // Try getting answers and filtering locally
    console.log(`\nMethod 3: Get all answers and search locally`)
    const allUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?limit=1000`
    const allResp = await fetch(allUrl, { headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` } })
    const allData = await allResp.json() as any

    if (allData.response?.results) {
      const hydrocarbs = allData.response.results.filter((a: any) =>
        a.Sheet === v1BubbleId ||
        a.Sheet?.includes('1659961669315') ||
        String(a.Sheet).includes(v1BubbleId)
      )
      console.log(`  Found ${hydrocarbs.length} HYDROCARB answers in first 1000`)

      // Check what sheet IDs are actually in the data
      const uniqueSheets = new Set(allData.response.results.map((a: any) => a.Sheet))
      console.log(`  Unique sheet IDs in sample: ${uniqueSheets.size}`)
      console.log(`  Sample sheet IDs:`)
      Array.from(uniqueSheets).slice(0, 10).forEach((id: any) => {
        console.log(`    - ${id}`)
      })
    }

  } else {
    console.log('No answers found in Bubble at all!')
    console.log('Response:', JSON.stringify(sampleData, null, 2))
  }
}

testBubbleAnswerQuery()
