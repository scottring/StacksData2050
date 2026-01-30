import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fetchBubble(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Bubble API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function main() {
  console.log('Checking Bubble for attachment-related data...\n')
  console.log('Base URL:', BUBBLE_BASE_URL)

  // Check what data types exist that might have attachments
  // Common patterns in Bubble: file uploads are stored as URLs in fields

  // 1. Check answers for file-type fields
  console.log('\n=== Checking Answer structure ===')
  try {
    const answers = await fetchBubble('answer', { limit: '1' })
    if (answers.response?.results?.[0]) {
      const sample = answers.response.results[0]
      console.log('Sample answer fields:', Object.keys(sample))

      // Look for file-related fields
      const fileFields = Object.entries(sample).filter(([key, value]) => {
        const keyLower = key.toLowerCase()
        return keyLower.includes('file') ||
               keyLower.includes('attachment') ||
               keyLower.includes('document') ||
               keyLower.includes('upload') ||
               (typeof value === 'string' && (value.includes('s3.amazonaws') || value.includes('bubble.io/f')))
      })
      console.log('Potential file fields:', fileFields)
    }
  } catch (e: any) {
    console.log('Error checking answers:', e.message)
  }

  // 2. Check if there's an attachments or documents table
  console.log('\n=== Checking for Attachment/Document tables ===')
  for (const tableName of ['attachment', 'document', 'file', 'upload', 'supporting_document']) {
    try {
      const data = await fetchBubble(tableName, { limit: '1' })
      console.log(`✓ Found table: ${tableName}`)
      if (data.response?.results?.[0]) {
        console.log(`  Sample fields:`, Object.keys(data.response.results[0]))
        console.log(`  Total count: ${data.response.remaining + data.response.results.length}`)
      }
    } catch (e: any) {
      // Table doesn't exist
    }
  }

  // 3. Check questions for file fields
  console.log('\n=== Checking Question structure ===')
  try {
    const questions = await fetchBubble('question', { limit: '1' })
    if (questions.response?.results?.[0]) {
      const sample = questions.response.results[0]
      console.log('Sample question fields:', Object.keys(sample))

      // Look for file-related fields
      const fileFields = Object.entries(sample).filter(([key, value]) => {
        const keyLower = key.toLowerCase()
        return keyLower.includes('file') ||
               keyLower.includes('attachment') ||
               keyLower.includes('document') ||
               (typeof value === 'string' && (value.includes('s3.amazonaws') || value.includes('bubble.io/f')))
      })
      if (fileFields.length > 0) {
        console.log('Potential file fields:', fileFields)
      }
    }
  } catch (e: any) {
    console.log('Error checking questions:', e.message)
  }

  // 4. Check sheets for file fields
  console.log('\n=== Checking Sheet structure ===')
  try {
    const sheets = await fetchBubble('sheet', { limit: '1' })
    if (sheets.response?.results?.[0]) {
      const sample = sheets.response.results[0]
      console.log('Sample sheet fields:', Object.keys(sample))

      // Look for file-related fields
      const fileFields = Object.entries(sample).filter(([key, value]) => {
        const keyLower = key.toLowerCase()
        return keyLower.includes('file') ||
               keyLower.includes('attachment') ||
               keyLower.includes('document') ||
               (typeof value === 'string' && (value.includes('s3.amazonaws') || value.includes('bubble.io/f')))
      })
      if (fileFields.length > 0) {
        console.log('Potential file fields:', fileFields)
      }
    }
  } catch (e: any) {
    console.log('Error checking sheets:', e.message)
  }

  // 5. Look for answers with file_upload response type
  console.log('\n=== Checking for File Upload type answers ===')
  try {
    const questions = await fetchBubble('question', {
      limit: '100',
      constraints: JSON.stringify([
        { key: 'Response Type', constraint_type: 'equals', value: 'File upload' }
      ])
    })
    console.log(`Questions with File upload response type: ${questions.response?.results?.length || 0}`)
    if (questions.response?.results?.length > 0) {
      console.log('Sample file upload question:', questions.response.results[0]?.Name)
    }
  } catch (e: any) {
    console.log('Could not query file upload questions:', e.message)
  }
}

main().catch(console.error)
