import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fetchBubble(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` },
  })
  if (!response.ok) throw new Error(`Bubble API error: ${response.status}`)
  return response.json()
}

async function main() {
  // Get HQ2.1 tag
  const tags = await fetchBubble('tag', {
    constraints: JSON.stringify([{ key: 'Name', constraint_type: 'equals', value: 'HQ2.1' }])
  })
  const hq21TagId = tags.response?.results?.[0]?._id
  console.log('HQ2.1 tag:', hq21TagId)

  // Get HQ2.1 questions
  const questions = await fetchBubble('question', {
    limit: '500',
    constraints: JSON.stringify([{ key: 'Tags', constraint_type: 'contains', value: hq21TagId }])
  })

  console.log(`\nTotal HQ2.1 questions: ${questions.response?.results?.length}`)

  // Get unique section sort numbers and names
  const sectionInfo = new Map<number, { names: Set<string>, count: number }>()

  questions.response?.results?.forEach((q: any) => {
    const sortNum = q['SECTION SORT NUMBER'] || 0
    const sectionName = q['SECTION NAME SORT'] || 'Unknown'

    if (!sectionInfo.has(sortNum)) {
      sectionInfo.set(sortNum, { names: new Set(), count: 0 })
    }
    sectionInfo.get(sortNum)!.names.add(sectionName)
    sectionInfo.get(sortNum)!.count++
  })

  console.log('\n=== Sections in Bubble (HQ2.1) ===\n')
  Array.from(sectionInfo.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([sortNum, info]) => {
      console.log(`Section ${sortNum}: ${Array.from(info.names).join(', ')} (${info.count} questions)`)
    })

  // Now specifically look for Food Contact
  console.log('\n\n=== Food Contact Questions Detail ===\n')

  const foodContactQuestions = questions.response?.results?.filter((q: any) =>
    (q['SECTION NAME SORT'] || '').toLowerCase().includes('food')
  ) || []

  console.log(`Food Contact questions: ${foodContactQuestions.length}`)

  // Group by subsection
  const bySubsection = new Map<string, { name: string, order: number, questions: any[] }>()

  foodContactQuestions.forEach((q: any) => {
    const subId = q['Parent Subsection']
    const subName = q['SUBSECTION NAME SORT'] || 'Unknown'
    const subOrder = q['SUBSECTION SORT NUMBER'] || 0

    if (!bySubsection.has(subId)) {
      bySubsection.set(subId, { name: subName, order: subOrder, questions: [] })
    }
    bySubsection.get(subId)!.questions.push(q)
  })

  // Sort and print
  const sortedSubs = Array.from(bySubsection.entries())
    .sort((a, b) => a[1].order - b[1].order)

  sortedSubs.forEach(([subId, info]) => {
    console.log(`\n4.${info.order} ${info.name} (${info.questions.length} questions)`)
    info.questions.slice(0, 2).forEach((q: any) => {
      console.log(`    - ${q.Name?.substring(0, 60)}...`)
    })
  })
}

main().catch(console.error)
