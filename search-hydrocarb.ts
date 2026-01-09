import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function searchHydrocarb() {
  console.log('=== Searching for Hydrocarb sheets in Bubble ===\n')

  // Try different search approaches
  const searchTerms = [
    'Hydrocarb',
    'HYDROCARB',
    '90-ME',
    '90-me'
  ]

  for (const term of searchTerms) {
    console.log(`\nSearching for: "${term}"`)
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet?constraints=[{"key":"Product Name","constraint_type":"text contains","value":"${term}"}]`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    const data = await response.json() as any

    if (data.response?.results && data.response.results.length > 0) {
      console.log(`  Found ${data.response.results.length} results`)
      data.response.results.forEach((sheet: any) => {
        console.log(`    - ${sheet['Product Name']} (${sheet._id})`)
        console.log(`      Created: ${sheet.Created_Date}`)
      })
    } else {
      console.log(`  No results`)
    }
  }

  // Also try getting all sheets and filtering locally
  console.log('\n=== Getting all sheets to search locally ===\n')
  let cursor = 0
  let found = []

  while (cursor < 200) { // Limit to first 200
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet?cursor=${cursor}&limit=100`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
      }
    })

    const data = await response.json() as any

    if (!data.response?.results || data.response.results.length === 0) {
      break
    }

    // Filter for Hydrocarb
    const hydrocarbs = data.response.results.filter((s: any) =>
      s['Product Name']?.toLowerCase().includes('hydrocarb') ||
      s['Product Name']?.toLowerCase().includes('90-me')
    )

    found.push(...hydrocarbs)
    cursor += data.response.results.length

    console.log(`Checked ${cursor} sheets, found ${found.length} Hydrocarb sheets so far...`)

    if (data.response.remaining === 0) {
      break
    }
  }

  console.log(`\n=== Found ${found.length} Hydrocarb sheets ===\n`)
  found.forEach((sheet: any) => {
    console.log(`${sheet['Product Name']}`)
    console.log(`  ID: ${sheet._id}`)
    console.log(`  Created: ${sheet.Created_Date}`)
    console.log(`  Modified: ${sheet.Modified_Date}`)
    console.log()
  })
}

searchHydrocarb()
