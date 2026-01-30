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
    const text = await response.text()
    throw new Error(`Bubble API error: ${response.status} - ${text}`)
  }

  return response.json()
}

async function main() {
  console.log('Looking for File Upload questions and their answers...\n')

  // First, find all questions with "File upload" or similar response types
  console.log('=== Fetching all questions to find file-related types ===')
  try {
    const questions = await fetchBubble('question', { limit: '500' })
    const responseTypes = new Set<string>()

    questions.response?.results?.forEach((q: any) => {
      if (q['Response Type']) {
        responseTypes.add(q['Response Type'])
      }
      if (q.Type) {
        responseTypes.add(q.Type)
      }
    })

    console.log('All response types found:', Array.from(responseTypes).sort())

    // Find file-related questions
    const fileQuestions = questions.response?.results?.filter((q: any) => {
      const type = (q['Response Type'] || q.Type || '').toLowerCase()
      return type.includes('file') || type.includes('upload') || type.includes('document') || type.includes('attachment')
    })

    if (fileQuestions?.length > 0) {
      console.log(`\nFound ${fileQuestions.length} file-related questions:`)
      fileQuestions.forEach((q: any) => {
        console.log(`  - ${q.Name || q._id}: ${q['Response Type'] || q.Type}`)
      })

      // Get answers for these questions
      console.log('\n=== Checking answers for file questions ===')
      for (const q of fileQuestions.slice(0, 5)) {
        try {
          const answers = await fetchBubble('answer', {
            limit: '10',
            constraints: JSON.stringify([
              { key: 'Parent Question', constraint_type: 'equals', value: q._id }
            ])
          })

          if (answers.response?.results?.length > 0) {
            console.log(`\nAnswers for "${q.Name}":`)
            answers.response.results.forEach((a: any) => {
              console.log(`  Full answer object:`, JSON.stringify(a, null, 2))
            })
          }
        } catch (e: any) {
          console.log(`  Error fetching answers for ${q.Name}: ${e.message}`)
        }
      }
    } else {
      console.log('\nNo file upload type questions found')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Check the answer schema more thoroughly
  console.log('\n=== Checking full answer schema ===')
  try {
    const answers = await fetchBubble('answer', { limit: '5' })
    if (answers.response?.results?.[0]) {
      console.log('Full answer object sample:')
      console.log(JSON.stringify(answers.response.results[0], null, 2))
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Check if there's a text field that might contain URLs
  console.log('\n=== Checking answer "text" field for URLs ===')
  try {
    const answers = await fetchBubble('answer', { limit: '500' })
    const urlAnswers = answers.response?.results?.filter((a: any) => {
      const text = a.text || ''
      return text.includes('http') || text.includes('s3') || text.includes('.pdf') || text.includes('.doc')
    })

    if (urlAnswers?.length > 0) {
      console.log(`Found ${urlAnswers.length} answers with URLs in text field:`)
      urlAnswers.slice(0, 10).forEach((a: any) => {
        console.log(`  ${a._id}: ${a.text?.substring(0, 100)}...`)
      })
    } else {
      console.log('No URL-like content found in answer text fields')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }
}

main().catch(console.error)
