import dotenv from 'dotenv'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function fetchBubble(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BUBBLE_BASE_URL}/api/1.1/obj/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${BUBBLE_API_TOKEN}`,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Bubble API error: ${response.status} - ${text}`)
  }

  return response.json()
}

async function main() {
  console.log('=== Bubble Food Contact Subsections (HQ2.1 tag) ===\n')

  // Get HQ2.1 tag ID
  const tags = await fetchBubble('tag', {
    constraints: JSON.stringify([{ key: 'Name', constraint_type: 'equals', value: 'HQ2.1' }])
  })
  const hq21TagId = tags.response?.results?.[0]?._id
  console.log('HQ2.1 tag ID:', hq21TagId)

  // Get questions with HQ2.1 tag
  console.log('\nFetching HQ2.1 questions...')
  const questions = await fetchBubble('question', {
    limit: '500',
    constraints: JSON.stringify([
      { key: 'Tags', constraint_type: 'contains', value: hq21TagId }
    ])
  })

  console.log(`Total HQ2.1 questions: ${questions.response?.results?.length}`)

  // Get unique subsection IDs from questions
  const subsectionIds = new Set<string>()
  questions.response?.results?.forEach((q: any) => {
    if (q['Parent Subsection']) {
      subsectionIds.add(q['Parent Subsection'])
    }
  })

  console.log(`\nUnique subsections with HQ2.1 questions: ${subsectionIds.size}`)

  // Fetch all subsections
  console.log('\nFetching subsection details...')
  const allSubsections = await fetchBubble('subsection', { limit: '200' })

  // Filter to get Food Contact related subsections
  const foodContactSubsections = allSubsections.response?.results?.filter((sub: any) => {
    // Check if this subsection has HQ2.1 questions
    return subsectionIds.has(sub._id)
  }) || []

  // Group by section sort number
  const bySectionSort = new Map<number, any[]>()
  foodContactSubsections.forEach((sub: any) => {
    const sortNum = sub['SECTION SORT NUMBER'] || 0
    if (!bySectionSort.has(sortNum)) {
      bySectionSort.set(sortNum, [])
    }
    bySectionSort.get(sortNum)!.push(sub)
  })

  // Print by section
  console.log('\n=== Subsections by Section (from Bubble) ===\n')

  const sortedSections = Array.from(bySectionSort.keys()).sort((a, b) => a - b)

  for (const sectionNum of sortedSections) {
    const subs = bySectionSort.get(sectionNum) || []
    // Sort by order
    subs.sort((a, b) => (a.Order || a['SUBSECTION SORT NUMBER'] || 0) - (b.Order || b['SUBSECTION SORT NUMBER'] || 0))

    // Get section name from first subsection
    const sectionName = subs[0]?.['SECTION NAME SORT'] || `Section ${sectionNum}`

    console.log(`\n=== Section ${sectionNum}: ${sectionName} ===`)
    subs.forEach((sub: any, idx: number) => {
      const order = sub.Order || sub['SUBSECTION SORT NUMBER'] || idx + 1
      console.log(`  ${sectionNum}.${order} ${sub.Name}`)
    })
  }

  // Focus on Section 4 (Food Contact)
  console.log('\n\n=== SECTION 4 FOOD CONTACT DETAIL ===\n')

  const section4Subs = foodContactSubsections.filter((sub: any) =>
    (sub['SECTION SORT NUMBER'] === 4) ||
    (sub.Name?.toLowerCase().includes('food') || sub['SECTION NAME SORT']?.toLowerCase().includes('food'))
  )

  section4Subs.sort((a: any, b: any) => (a.Order || a['SUBSECTION SORT NUMBER'] || 0) - (b.Order || b['SUBSECTION SORT NUMBER'] || 0))

  section4Subs.forEach((sub: any) => {
    const order = sub.Order || sub['SUBSECTION SORT NUMBER']
    const questionCount = questions.response?.results?.filter((q: any) => q['Parent Subsection'] === sub._id).length || 0
    console.log(`4.${order} ${sub.Name} (${questionCount} questions)`)
  })
}

main().catch(console.error)
