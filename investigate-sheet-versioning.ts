import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function investigateSheetVersioning() {
  console.log('=== Searching for Hydrocarb 90-ME 78% in Bubble ===\n')

  // Search for sheets with this name
  const sheetUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet?constraints=[{"key":"Product Name","constraint_type":"text contains","value":"Hydrocarb 90-ME 78%"}]`

  const response = await fetch(sheetUrl, {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  })

  const data = await response.json() as any

  if (!data.response?.results) {
    console.log('No sheets found')
    return
  }

  console.log(`Found ${data.response.results.length} sheet(s) with "Hydrocarb 90-ME 78%" in name\n`)

  // Examine each sheet
  for (const sheet of data.response.results) {
    console.log('='.repeat(80))
    console.log(`Sheet ID: ${sheet._id}`)
    console.log(`Product Name: ${sheet['Product Name']}`)
    console.log(`Created: ${sheet.Created_Date}`)
    console.log(`Modified: ${sheet.Modified_Date}`)

    // Check for version-related fields
    console.log('\n--- Version/Status Fields ---')
    if (sheet.Version) console.log(`Version: ${sheet.Version}`)
    if (sheet['Version Number']) console.log(`Version Number: ${sheet['Version Number']}`)
    if (sheet['Version Name']) console.log(`Version Name: ${sheet['Version Name']}`)
    if (sheet.Status) console.log(`Status: ${sheet.Status}`)
    if (sheet.State) console.log(`State: ${sheet.State}`)
    if (sheet['Review Status']) console.log(`Review Status: ${sheet['Review Status']}`)
    if (sheet.Approved) console.log(`Approved: ${sheet.Approved}`)
    if (sheet['Approval Status']) console.log(`Approval Status: ${sheet['Approval Status']}`)
    if (sheet['Is Current Version']) console.log(`Is Current Version: ${sheet['Is Current Version']}`)
    if (sheet['Previous Version']) console.log(`Previous Version: ${sheet['Previous Version']}`)
    if (sheet['Parent Sheet']) console.log(`Parent Sheet: ${sheet['Parent Sheet']}`)

    // Check company/supplier
    console.log('\n--- Ownership ---')
    if (sheet.Company) console.log(`Company: ${sheet.Company}`)
    if (sheet.Supplier) console.log(`Supplier: ${sheet.Supplier}`)
    if (sheet['Created By']) console.log(`Created By: ${sheet['Created By']}`)

    // List all fields to see what else might be version-related
    console.log('\n--- All Fields ---')
    const allFields = Object.keys(sheet).filter(k => !k.startsWith('_'))
    console.log(allFields.join(', '))
    console.log()
  }

  // Now check the Bubble Sheet schema to understand versioning
  console.log('\n=== Checking Bubble Sheet Schema ===\n')

  // Get a sample sheet to see all possible fields
  const sampleUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/sheet?limit=1`
  const sampleResponse = await fetch(sampleUrl, {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
    }
  })

  const sampleData = await sampleResponse.json() as any
  if (sampleData.response?.results?.[0]) {
    const sampleSheet = sampleData.response.results[0]
    console.log('Sample Sheet Fields:')
    Object.keys(sampleSheet)
      .filter(k => !k.startsWith('_'))
      .sort()
      .forEach(field => {
        const value = sampleSheet[field]
        const type = typeof value
        console.log(`  ${field}: ${type}`)
      })
  }
}

investigateSheetVersioning()
