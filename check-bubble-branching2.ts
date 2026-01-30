import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function main() {
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const biocides21TagId = tagsData.response.results.find((t: any) => t.Name === 'Biocides-2.1')?._id
  const hq21TagId = '1681774190520x129918874175406080'

  const questionsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const questionsRes = await fetch(questionsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const questionsData = await questionsRes.json()
  const allQuestions = questionsData.response.results

  // Find Biocides questions with HQ2.1
  const biocideQuestions = allQuestions.filter((q: any) => {
    const tags = q.Tags || []
    return tags.includes(biocides21TagId) && tags.includes(hq21TagId)
  })

  biocideQuestions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

  console.log('=== BUBBLE: Biocides HQ2.1 Questions with Branching ===\n')
  biocideQuestions.forEach((q: any) => {
    const dependentNoShow = q['Dependent (no show)'] === true
    console.log(`Order ${q.Order}: ${(q.Name || '').substring(0, 55)}`)
    console.log(`  Type: ${q.Type || 'undefined'}`)
    console.log(`  Dependent (no show): ${dependentNoShow}`)
    console.log('')
  })
}

main().catch(console.error)
