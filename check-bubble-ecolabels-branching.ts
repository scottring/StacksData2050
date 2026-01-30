import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function main() {
  const tagsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/tag?limit=100'
  const tagsRes = await fetch(tagsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const tagsData = await tagsRes.json()
  const ecolabelsTagId = tagsData.response.results.find((t: any) => t.Name === 'Ecolabels')?._id
  const hq21TagId = '1681774190520x129918874175406080'

  const questionsUrl = BUBBLE_BASE_URL + '/api/1.1/obj/question?limit=500'
  const questionsRes = await fetch(questionsUrl, { headers: { Authorization: 'Bearer ' + BUBBLE_API_TOKEN }})
  const questionsData = await questionsRes.json()
  const allQuestions = questionsData.response.results

  // Find Ecolabels questions with HQ2.1
  const ecolabelQuestions = allQuestions.filter((q: any) => {
    const tags = q.Tags || []
    return tags.includes(ecolabelsTagId) && tags.includes(hq21TagId)
  })

  ecolabelQuestions.sort((a: any, b: any) => (a.Order || 999) - (b.Order || 999))

  console.log('=== BUBBLE: Ecolabels HQ2.1 Questions with Branching ===\n')
  ecolabelQuestions.forEach((q: any) => {
    const dependentNoShow = q['Dependent (no show)'] === true
    const name = (q.Name || '').substring(0, 60)
    // Skip General Info questions
    if (name.includes('Product Description') || name.includes('Product Code') ||
        name.includes('Function in') || name.includes('Producer') || name.includes('Production sites')) {
      return
    }
    console.log(`Order ${q.Order}: ${name}`)
    console.log(`  Type: ${q.Type || 'undefined'}`)
    console.log(`  Dependent (no show): ${dependentNoShow}`)
    console.log('')
  })
}

main().catch(console.error)
