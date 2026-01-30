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

function findS3Urls(obj: any, path: string = ''): { path: string; url: string }[] {
  const results: { path: string; url: string }[] = []

  if (typeof obj === 'string') {
    if (obj.includes('s3.amazonaws') || obj.includes('amazonaws.com') || obj.includes('//s3.') || obj.includes('bubble.io/f')) {
      results.push({ path, url: obj })
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      results.push(...findS3Urls(item, `${path}[${idx}]`))
    })
  } else if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      results.push(...findS3Urls(value, path ? `${path}.${key}` : key))
    })
  }

  return results
}

async function main() {
  console.log('Searching Bubble data for S3/file URLs...\n')

  // Check multiple answers for file URLs
  console.log('=== Checking Answers (sample of 100) ===')
  try {
    const answers = await fetchBubble('answer', { limit: '100' })
    const allS3Urls: { path: string; url: string }[] = []

    answers.response?.results?.forEach((answer: any, idx: number) => {
      const urls = findS3Urls(answer, `answer[${idx}]`)
      allS3Urls.push(...urls)
    })

    if (allS3Urls.length > 0) {
      console.log(`Found ${allS3Urls.length} file URLs in answers:`)
      allS3Urls.slice(0, 10).forEach(({ path, url }) => {
        console.log(`  ${path}: ${url.substring(0, 100)}...`)
      })
    } else {
      console.log('No S3/file URLs found in sampled answers')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Check sheets
  console.log('\n=== Checking Sheets (sample of 50) ===')
  try {
    const sheets = await fetchBubble('sheet', { limit: '50' })
    const allS3Urls: { path: string; url: string }[] = []

    sheets.response?.results?.forEach((sheet: any, idx: number) => {
      const urls = findS3Urls(sheet, `sheet[${idx}]`)
      allS3Urls.push(...urls)
    })

    if (allS3Urls.length > 0) {
      console.log(`Found ${allS3Urls.length} file URLs in sheets:`)
      allS3Urls.slice(0, 10).forEach(({ path, url }) => {
        console.log(`  ${path}: ${url.substring(0, 100)}...`)
      })
    } else {
      console.log('No S3/file URLs found in sampled sheets')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Check questions
  console.log('\n=== Checking Questions (sample of 50) ===')
  try {
    const questions = await fetchBubble('question', { limit: '50' })
    const allS3Urls: { path: string; url: string }[] = []

    questions.response?.results?.forEach((q: any, idx: number) => {
      const urls = findS3Urls(q, `question[${idx}]`)
      allS3Urls.push(...urls)
    })

    if (allS3Urls.length > 0) {
      console.log(`Found ${allS3Urls.length} file URLs in questions:`)
      allS3Urls.slice(0, 10).forEach(({ path, url }) => {
        console.log(`  ${path}: ${url.substring(0, 100)}...`)
      })
    } else {
      console.log('No S3/file URLs found in sampled questions')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Check users (might have profile pictures)
  console.log('\n=== Checking Users (sample of 20) ===')
  try {
    const users = await fetchBubble('user', { limit: '20' })
    const allS3Urls: { path: string; url: string }[] = []

    users.response?.results?.forEach((user: any, idx: number) => {
      const urls = findS3Urls(user, `user[${idx}]`)
      allS3Urls.push(...urls)
    })

    if (allS3Urls.length > 0) {
      console.log(`Found ${allS3Urls.length} file URLs in users:`)
      allS3Urls.slice(0, 5).forEach(({ path, url }) => {
        console.log(`  ${path}: ${url.substring(0, 100)}...`)
      })
    } else {
      console.log('No S3/file URLs found in sampled users')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Check companies
  console.log('\n=== Checking Companies (sample of 20) ===')
  try {
    const companies = await fetchBubble('company', { limit: '20' })
    const allS3Urls: { path: string; url: string }[] = []

    companies.response?.results?.forEach((company: any, idx: number) => {
      const urls = findS3Urls(company, `company[${idx}]`)
      allS3Urls.push(...urls)
    })

    if (allS3Urls.length > 0) {
      console.log(`Found ${allS3Urls.length} file URLs in companies:`)
      allS3Urls.slice(0, 5).forEach(({ path, url }) => {
        console.log(`  ${path}: ${url.substring(0, 100)}...`)
      })
    } else {
      console.log('No S3/file URLs found in sampled companies')
    }
  } catch (e: any) {
    console.log('Error:', e.message)
  }

  // Try to find any file/attachment/document type tables
  console.log('\n=== Trying common file-related table names ===')
  const possibleTables = [
    'file', 'files', 'attachment', 'attachments', 'document', 'documents',
    'upload', 'uploads', 'media', 'asset', 'assets', 'supporting_document',
    'supporting_documents', 'evidence', 'certificate', 'certificates'
  ]

  for (const tableName of possibleTables) {
    try {
      const data = await fetchBubble(tableName, { limit: '5' })
      if (data.response?.results?.length > 0) {
        console.log(`\n✓ Found table: ${tableName}`)
        console.log(`  Count: ${(data.response.remaining || 0) + data.response.results.length}`)
        console.log(`  Sample fields:`, Object.keys(data.response.results[0]))

        const urls = findS3Urls(data.response.results[0], tableName)
        if (urls.length > 0) {
          console.log(`  File URLs found:`)
          urls.forEach(({ path, url }) => {
            console.log(`    ${path}: ${url.substring(0, 80)}...`)
          })
        }
      }
    } catch (e: any) {
      // Table doesn't exist, skip silently
    }
  }
}

main().catch(console.error)
