import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function checkBiocides() {
  // Get all tags
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const tagLookup = new Map<string, string>()
  tagsData.response.results.forEach((t: any) => tagLookup.set(t._id, t.Name))

  const hq21TagId = '1681774190520x129918874175406080'

  // Get all subsections to find Biocides
  const subsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/subsection?limit=100'
  const subsRes = await fetch(subsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const subsData = await subsRes.json()

  const biocideSubs = subsData.response.results.filter((s: any) =>
    (s.Name || '').toLowerCase().includes('biocide')
  )

  console.log('=== BUBBLE: Biocides Subsections ===')
  biocideSubs.forEach((s: any) => console.log(`  ${s.Order}. ${s.Name} (${s._id})`))

  // Get all questions
  const questionsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const questionsRes = await fetch(questionsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const questionsData = await questionsRes.json()
  const allQuestions = questionsData.response.results

  // Find questions in Biocides subsections
  for (const sub of biocideSubs) {
    const questions = allQuestions.filter((q: any) => q['Parent subsection'] === sub._id)
    questions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

    console.log(`\n=== ${sub.Name} ===`)
    console.log(`Total: ${questions.length}`)
    questions.forEach((q: any) => {
      const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
      const hasHQ21 = (q.Tags || []).includes(hq21TagId) ? ' [HQ2.1]' : ''
      console.log(`  ${q.Order}. [${q['Response type']}]${hasHQ21} ${(q.Name || '').substring(0, 70)}`)
      if (!hasHQ21) console.log(`      Tags: ${tags}`)
    })
  }

  // Also search by name for biocide questions (in case they're not in a biocide subsection)
  console.log('\n=== ALL Biocide-related questions (by name search) ===')
  const biocideByName = allQuestions.filter((q: any) => {
    const name = (q.Name || '').toLowerCase()
    return name.includes('biocid') || name.includes('528/2012') || name.includes('article 95') || name.includes('slimicide')
  })
  biocideByName.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

  console.log(`Found: ${biocideByName.length}`)
  biocideByName.forEach((q: any) => {
    const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
    const hasHQ21 = (q.Tags || []).includes(hq21TagId) ? ' [HQ2.1]' : ''
    console.log(`  ${q.Order}. [${q['Response type']}]${hasHQ21} ${(q.Name || '').substring(0, 70)}`)
    console.log(`      Tags: ${tags}`)
  })
}

checkBiocides().catch(console.error)
