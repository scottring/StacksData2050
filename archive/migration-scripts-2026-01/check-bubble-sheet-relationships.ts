import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN

async function checkRelationships() {
  const sheets = [
    { version: 1, id: '1659961669315x991901828578803700', date: 'Aug 8, 2022' },
    { version: 2, id: '1661440851034x545387418125598700', date: 'Aug 25, 2022' },
    { version: 3, id: '1744099239597x968220647214809100', date: 'Apr 8, 2025' }
  ]
  
  console.log('Checking Bubble sheet relationships...\n')
  
  for (const sheet of sheets) {
    const url = BUBBLE_BASE_URL + '/api/1.1/obj/sheet/' + sheet.id
    
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + BUBBLE_API_TOKEN }
    })
    
    const data = await response.json()
    const sheetData = data.response
    
    console.log('Version ' + sheet.version + ' (' + sheet.date + '):')
    console.log('  Name: ' + sheetData.Name)
    
    // Look for any fields that might indicate parent/child relationships
    const relationshipFields = [
      'Parent Sheet',
      'Original Sheet', 
      'Base Sheet',
      'Version',
      'Version of',
      'Previous Version',
      'Related Sheet'
    ]
    
    console.log('  Relationship fields:')
    for (const field of relationshipFields) {
      if (sheetData[field] !== undefined) {
        console.log('    ' + field + ': ' + sheetData[field])
      }
    }
    
    // Show all fields to see what else might be relevant
    console.log('\n  All fields that might be relevant:')
    for (const key of Object.keys(sheetData).sort()) {
      if (key.toLowerCase().includes('sheet') || 
          key.toLowerCase().includes('version') ||
          key.toLowerCase().includes('parent') ||
          key.toLowerCase().includes('origin')) {
        console.log('    ' + key + ': ' + sheetData[key])
      }
    }
    console.log()
  }
}

checkRelationships()
