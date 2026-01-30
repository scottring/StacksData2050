import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function main() {
  // Get all tags for lookup
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const tagLookup = new Map<string, string>()
  tagsData.response.results.forEach((t: any) => tagLookup.set(t._id, t.Name))
  const hq21TagId = '1681774190520x129918874175406080'

  // Get all questions
  const url = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const data = await res.json()
  const allQuestions = data.response.results

  // Find questions whose name contains ecolabel-related terms
  const ecoQuestions = allQuestions.filter((q: any) => {
    const name = (q.Name || '').toLowerCase()
    return name.includes('ecolabel') ||
           name.includes('commission decision') ||
           name.includes('nordic') ||
           name.includes('blue angel') ||
           name.includes('de-uz') ||
           name.includes('paper products - chemical')
  })

  console.log('=== Ecolabel-related questions (by name search) ===')
  console.log('Found: ' + ecoQuestions.length)
  ecoQuestions.forEach((q: any) => {
    const tags = (q.Tags || []).map((tid: string) => tagLookup.get(tid) || tid).join(', ')
    const hasHQ21 = (q.Tags || []).includes(hq21TagId) ? ' [HQ2.1]' : ''
    console.log(q.Order + '. [' + q['Response type'] + ']' + hasHQ21 + ' ' + (q.Name || '').substring(0, 80))
    console.log('    Parent subsection: ' + q['Parent subsection'])
    console.log('    Tags: ' + (tags || 'NONE'))
    console.log('')
  })
}
main()
