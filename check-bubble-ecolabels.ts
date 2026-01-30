import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fetchBubble(endpoint: string, cursor?: number) {
  const url = new URL(`${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}`)
  url.searchParams.set('limit', '100')
  if (cursor) url.searchParams.set('cursor', String(cursor))

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${BUBBLE_API_TOKEN}` }
  })
  return response.json()
}

async function checkEcolabels() {
  // First get Section 2 (Ecolabels) from Bubble
  const sectionsRes = await fetchBubble('section')
  const ecolabelsSection = sectionsRes.response.results.find(
    (s: any) => s.Order === 2 || s.Name?.toLowerCase().includes('ecolabel')
  )

  console.log('=== BUBBLE: Ecolabels Section ===')
  console.log(ecolabelsSection)

  if (!ecolabelsSection) {
    console.log('Section not found')
    return
  }

  // Get subsections for this section
  const subsectionsRes = await fetchBubble('subsection')
  const ecolabelsSubs = subsectionsRes.response.results.filter(
    (sub: any) => sub['Parent section'] === ecolabelsSection._id
  )

  console.log('\n=== BUBBLE: Ecolabels Subsections ===')
  ecolabelsSubs.forEach((s: any) => console.log(`${s.Order}. ${s.Name}`))

  // Get questions
  const questionsRes = await fetchBubble('question')
  const allQuestions = questionsRes.response.results

  for (const sub of ecolabelsSubs) {
    const questions = allQuestions.filter((q: any) => q['Parent subsection'] === sub._id)
    questions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

    console.log(`\n=== BUBBLE: ${sub.Name} ===`)
    console.log(`Total: ${questions.length}`)
    questions.forEach((q: any) => {
      console.log(`  ${q.Order}. [${q['Response type']}] ${q.Name?.substring(0, 80)}`)
    })
  }
}

checkEcolabels().catch(console.error)
