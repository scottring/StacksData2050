import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

const HYDROCARB_VERSIONS = [
  { version: 1, bubble_id: '1659961669315x991901828578803700', name: 'Version 1' },
  { version: 2, bubble_id: '1661440851034x545387418125598700', name: 'Version 2' },
  { version: 3, bubble_id: '1744099239597x968220647214809100', name: 'Version 3' }
]

async function checkBubbleHydrocarbAnswers() {
  console.log('=== Checking HYDROCARB 90-ME 78% Answers in Bubble ===\n')

  for (const v of HYDROCARB_VERSIONS) {
    console.log('='.repeat(80))
    console.log(`${v.name} (Bubble ID: ${v.bubble_id})`)
    console.log()

    // Query answers for this sheet from Bubble
    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/answer?constraints=[{"key":"Sheet","constraint_type":"equals","value":"${v.bubble_id}"}]&limit=100`

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${BUBBLE_API_TOKEN}`
        }
      })

      const data = await response.json() as any

      if (data.response?.results) {
        const answers = data.response.results
        console.log(`Found ${answers.length} answers in Bubble${data.response.remaining > 0 ? ` (showing first 100, ${data.response.remaining} more available)` : ''}`)

        if (answers.length > 0) {
          // Get unique questions answered
          const uniqueQuestions = new Set(answers.map((a: any) => a['Parent Question']))
          console.log(`Unique questions answered: ${uniqueQuestions.size}`)

          // Show some sample answers
          console.log('\nSample answers (first 5):')
          answers.slice(0, 5).forEach((answer: any, i: number) => {
            console.log(`  ${i + 1}. Created: ${answer.Created_Date}`)
            console.log(`     Modified: ${answer.Modified_Date}`)
            console.log(`     Parent Question: ${answer['Parent Question']}`)
            console.log(`     Choice: ${answer.Choice}`)
            if (answer['Text Value']) console.log(`     Text: ${answer['Text Value']?.substring(0, 50)}...`)
          })

          // Check answer timestamps
          const created = answers.map((a: any) => new Date(a.Created_Date).getTime())
          const modified = answers.map((a: any) => new Date(a.Modified_Date).getTime())

          console.log('\nTimestamp range:')
          console.log(`  Earliest created: ${new Date(Math.min(...created)).toISOString()}`)
          console.log(`  Latest created: ${new Date(Math.max(...created)).toISOString()}`)
          console.log(`  Latest modified: ${new Date(Math.max(...modified)).toISOString()}`)

          // Check if any have version-related fields
          const sampleAnswer = answers[0]
          const versionFields = Object.keys(sampleAnswer).filter(k =>
            k.toLowerCase().includes('version') ||
            k.toLowerCase().includes('copied')
          )
          if (versionFields.length > 0) {
            console.log('\nVersion-related fields found:')
            versionFields.forEach(field => {
              console.log(`  ${field}: ${sampleAnswer[field]}`)
            })
          }
        }
      } else {
        console.log('No answers found in Bubble')
        if (data.statusCode) {
          console.log(`Error: ${data.statusCode} - ${data.body?.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.log(`Error fetching from Bubble: ${error}`)
    }

    console.log()
  }

  // Summary
  console.log('=== Summary ===\n')
  console.log('This will show whether:')
  console.log('  1. All answers are in Version 1 (same as Supabase)')
  console.log('  2. Versions 2 and 3 also have answers (migration issue)')
  console.log('  3. Bubble uses a different answer storage mechanism')
}

checkBubbleHydrocarbAnswers()
