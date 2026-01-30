import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fetchBubble(endpoint: string, constraints?: any[]) {
  const url = new URL(`${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}`)
  url.searchParams.set('limit', '100')
  if (constraints) {
    url.searchParams.set('constraints', JSON.stringify(constraints))
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json()
  if (!data.response) {
    console.error('API Error:', data)
  }
  return data
}

async function checkEcolabels() {
  // First find HQ2.1 tag
  const tagsRes = await fetchBubble('tag')
  const hq21Tag = tagsRes.response.results.find((t: any) => t.Name === 'HQ2.1')

  if (!hq21Tag) {
    console.log('HQ2.1 tag not found')
    return
  }

  console.log('=== HQ2.1 TAG ===')
  console.log(`ID: ${hq21Tag._id}`)

  const sectionId = '1617069659217x956109532887253000' // Ecolabels section

  // Get ALL subsections and filter manually
  const subsectionsRes = await fetchBubble('subsection')
  const allSubs = subsectionsRes.response?.results || []

  const subs = allSubs.filter((s: any) => s['Parent section'] === sectionId)
  subs.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

  console.log('\n=== BUBBLE: Ecolabels Subsections ===')
  subs.forEach((s: any) => console.log(`${s.Order}. ${s.Name}`))

  // Get ALL questions and filter
  const questionsRes = await fetchBubble('question')
  const allQuestions = questionsRes.response?.results || []

  for (const sub of subs) {
    // Filter to questions in this subsection with HQ2.1 tag
    const questions = allQuestions.filter((q: any) => {
      if (q['Parent subsection'] !== sub._id) return false
      const tags = q.Tags || []
      return tags.includes(hq21Tag._id)
    })
    questions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

    if (questions.length === 0) continue

    console.log(`\n=== ${sub.Name} (Order: ${sub.Order}) ===`)
    console.log(`Total HQ2.1 questions: ${questions.length}`)
    questions.forEach((q: any) => {
      console.log(`  ${q.Order}. [${q['Response type']}] ${q.Name?.substring(0, 90)}`)
    })
  }
}

checkEcolabels().catch(console.error)
