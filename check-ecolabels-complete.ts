import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function main() {
  // Get all tags
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const tagLookup = new Map<string, string>()
  tagsData.response.results.forEach((t: any) => tagLookup.set(t._id, t.Name))

  const hq21TagId = '1681774190520x129918874175406080'
  const ecolabelsTagId = tagsData.response.results.find((t: any) => t.Name === 'Ecolabels')?._id

  console.log('Ecolabels tag ID:', ecolabelsTagId)

  // Get all questions
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const data = await res.json()
  const allQuestions = data.response.results

  // Find questions with Ecolabels tag AND HQ2.1 tag
  const ecoHQ21Questions = allQuestions.filter((q: any) => {
    const tags = q.Tags || []
    return tags.includes(ecolabelsTagId) && tags.includes(hq21TagId)
  })

  ecoHQ21Questions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

  console.log('\n=== HQ2.1 Ecolabels Questions (should match template) ===')
  console.log('Total: ' + ecoHQ21Questions.length + '\n')
  ecoHQ21Questions.forEach((q: any) => {
    console.log(q.Order + '. [' + (q['Response type'] || 'undefined') + '] ' + (q.Name || ''))
  })

  // Also show questions with Ecolabels tag but NOT HQ2.1 (old ones to remove)
  const oldEcoQuestions = allQuestions.filter((q: any) => {
    const tags = q.Tags || []
    return tags.includes(ecolabelsTagId) && !tags.includes(hq21TagId)
  })

  if (oldEcoQuestions.length > 0) {
    console.log('\n=== OLD Ecolabels Questions (NOT in HQ2.1 - should be removed) ===')
    console.log('Total: ' + oldEcoQuestions.length + '\n')
    oldEcoQuestions.forEach((q: any) => {
      const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
      console.log(q.Order + '. ' + (q.Name || ''))
      console.log('    Tags: ' + tags)
    })
  }
}
main()
