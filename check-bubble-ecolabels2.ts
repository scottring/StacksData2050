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
  return response.json()
}

async function checkEcolabels() {
  const sectionId = '1617069659217x956109532887253000' // Ecolabels section from previous output

  // Get subsections for this section
  const subsectionsRes = await fetchBubble('subsection', [
    { key: 'Parent section', constraint_type: 'equals', value: sectionId }
  ])

  console.log('=== BUBBLE: Ecolabels Subsections ===')
  const subs = subsectionsRes.response.results
  subs.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))
  subs.forEach((s: any) => console.log(`${s.Order}. ${s.Name} (${s._id})`))

  // Get questions for each subsection
  for (const sub of subs) {
    const questionsRes = await fetchBubble('question', [
      { key: 'Parent subsection', constraint_type: 'equals', value: sub._id }
    ])

    const questions = questionsRes.response.results
    questions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

    console.log(`\n=== BUBBLE: ${sub.Name} (Order: ${sub.Order}) ===`)
    console.log(`Total: ${questions.length}`)
    questions.forEach((q: any) => {
      console.log(`  ${q.Order}. [${q['Response type']}] ${q.Name?.substring(0, 90)}`)
    })
  }
}

checkEcolabels().catch(console.error)
