import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function searchForSection() {
  console.log('=== Searching for "Other relevant national legislations" ===\n')

  // Search questions by subsection name
  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question?limit=500`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (!data.response || !data.response.results) {
    console.log('No questions found')
    return
  }

  // Search for questions with this text in subsection name
  const matches = data.response.results.filter((q: any) =>
    q['SUBSECTION NAME SORT'] &&
    q['SUBSECTION NAME SORT'].toLowerCase().includes('other relevant national')
  )

  console.log(`Found ${matches.length} questions matching "other relevant national":\n`)

  for (const q of matches) {
    console.log(`Question ID: ${q.ID}`)
    console.log(`  Bubble ID: ${q._id}`)
    console.log(`  Name: ${q.Name}`)
    console.log(`  Section: ${q['SECTION NAME SORT']} (${q['SECTION SORT NUMBER']})`)
    console.log(`  Subsection: ${q['SUBSECTION NAME SORT']} (${q['SUBSECTION SORT NUMBER']})`)
    console.log(`  Order: ${q.Order}`)
    console.log(`  Type: ${q.Type}`)
    console.log()
  }

  // Also search sections in Bubble
  console.log('\n=== Checking Bubble Sections ===\n')

  const sectionsUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/section?limit=100`
  const sectionsResponse = await fetch(sectionsUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const sectionsData = await sectionsResponse.json() as any

  if (sectionsData.response && sectionsData.response.results) {
    console.log(`Found ${sectionsData.response.count} sections in Bubble\n`)

    const section4Matches = sectionsData.response.results.filter((s: any) =>
      s.Name && s.Name.toLowerCase().includes('food contact')
    )

    for (const s of section4Matches.slice(0, 5)) {
      console.log(`Section: ${s.Name}`)
      console.log(`  Bubble ID: ${s._id}`)
      console.log()
    }
  }

  // Check subsections
  console.log('\n=== Checking Bubble Subsections ===\n')

  const subsectionsUrl = `${BUBBLE_BASE_URL}/api/1.1/obj/subsection?limit=200`
  const subsectionsResponse = await fetch(subsectionsUrl, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const subsectionsData = await subsectionsResponse.json() as any

  if (subsectionsData.response && subsectionsData.response.results) {
    console.log(`Found ${subsectionsData.response.count} subsections in Bubble\n`)

    const matches = subsectionsData.response.results.filter((s: any) =>
      s.Name && s.Name.toLowerCase().includes('other relevant')
    )

    for (const s of matches) {
      console.log(`Subsection: ${s.Name}`)
      console.log(`  Bubble ID: ${s._id}`)
      console.log(`  Order: ${s.Order}`)
      console.log()
    }
  }
}

searchForSection()
