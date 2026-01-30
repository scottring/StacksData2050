import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

/**
 * Check if Bubble has workflow data (status, reviews, comments)
 */

async function checkBubbleWorkflowData() {
  console.log('🔍 Checking Bubble for Workflow Data\n')
  console.log('=' .repeat(80))

  // Check what tables/data types exist in Bubble
  const potentialWorkflowTables = [
    'sheet',
    'status',
    'sheet_status',
    'review',
    'comment',
    'rejection',
    'answer_rejection',
    'sheet_status_history'
  ]

  for (const table of potentialWorkflowTables) {
    console.log(`\nChecking: ${table}`)
    console.log('-'.repeat(80))

    try {
      const response = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/${table}?limit=3`, {
        headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
      })

      const data = await response.json() as any

      if (data.response?.results) {
        const count = data.response.count
        const sample = data.response.results[0]

        console.log(`✅ EXISTS - Total: ${count}`)
        if (sample) {
          console.log(`   Sample fields: ${Object.keys(sample).join(', ')}`)

          // Look for status-related fields
          const statusFields = Object.keys(sample).filter(k =>
            k.toLowerCase().includes('status') ||
            k.toLowerCase().includes('review') ||
            k.toLowerCase().includes('comment')
          )
          if (statusFields.length > 0) {
            console.log(`   📋 Status/Review fields: ${statusFields.join(', ')}`)
            statusFields.forEach(field => {
              console.log(`      ${field}: ${sample[field]}`)
            })
          }
        }
      } else if (data.statusCode === 404) {
        console.log(`❌ Does not exist`)
      } else {
        console.log(`⚠️  Error: ${JSON.stringify(data).substring(0, 100)}`)
      }
    } catch (error: any) {
      console.log(`⚠️  Error: ${error.message}`)
    }
  }

  // Check sheet fields more carefully for status
  console.log('\n\n' + '=' .repeat(80))
  console.log('DETAILED SHEET FIELDS ANALYSIS')
  console.log('=' .repeat(80))

  const sheetResp = await fetch(`${BUBBLE_BASE_URL}/api/1.1/obj/sheet?limit=10`, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const sheetData = await sheetResp.json() as any

  if (sheetData.response?.results?.[0]) {
    const sampleSheet = sheetData.response.results[0]
    const allFields = Object.keys(sampleSheet)

    console.log('\nAll sheet fields:')
    allFields.forEach(field => {
      const value = sampleSheet[field]
      const preview = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value
      console.log(`  ${field}: ${preview}`)
    })

    // Check for status distribution
    console.log('\n\nChecking status distribution across sheets...')
    const sheets = sheetData.response.results
    const statusCounts: Record<string, number> = {}

    sheets.forEach((sheet: any) => {
      // Check multiple possible status fields
      const possibleStatusFields = ['status', 'Status', 'NEW_STATUS', 'new_status', 'sheet_status']
      for (const field of possibleStatusFields) {
        if (sheet[field] !== undefined && sheet[field] !== null) {
          const statusValue = sheet[field]
          statusCounts[`${field}:${statusValue}`] = (statusCounts[`${field}:${statusValue}`] || 0) + 1
        }
      }
    })

    console.log('Status values found in sample:')
    if (Object.keys(statusCounts).length === 0) {
      console.log('  ❌ No status values found in sample of 10 sheets')
    } else {
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} sheets`)
      })
    }
  }
}

checkBubbleWorkflowData().catch(console.error)
