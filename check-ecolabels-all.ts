import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function main() {
  // Subsection IDs
  const subsections = [
    { id: '1626100227219x754871618292678700', name: 'EU Ecolabel', order: 1 },
    { id: '1626100504074x511626490221428740', name: 'Nordic Ecolabel', order: 2 },
    { id: '1619633983071x812786779965358100', name: 'Blue Angel', order: 3 }
  ]

  // Get all tags for lookup
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const tagLookup = new Map<string, string>()
  tagsData.response.results.forEach((t: any) => tagLookup.set(t._id, t.Name))

  // Get all questions
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const data = await res.json()
  const allQuestions = data.response.results

  for (const sub of subsections) {
    const questions = allQuestions.filter((q: any) => q['Parent subsection'] === sub.id)
    questions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

    console.log('=== ' + sub.name + ' (Order ' + sub.order + ') ===')
    console.log('Total questions (ALL tags): ' + questions.length)
    questions.forEach((q: any) => {
      const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
      console.log('  ' + q.Order + '. [' + q['Response type'] + '] ' + (q.Name || '').substring(0, 70))
      console.log('      Tags: ' + (tags || 'NONE'))
    })
    console.log('')
  }
}
main()
