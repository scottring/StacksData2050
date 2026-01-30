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
  // Fetch all subsections
  const subsections = await fetchBubble('subsection', { limit: '200' })

  console.log('=== All Subsection Fields (sample) ===\n')
  if (subsections.response?.results?.[0]) {
    console.log('Fields:', Object.keys(subsections.response.results[0]))
  }

  // Filter for Food Contact related
  const foodContactSubs = subsections.response?.results?.filter((sub: any) =>
    sub['SECTION NAME SORT']?.toLowerCase().includes('food') ||
    sub.Name?.toLowerCase().includes('food') ||
    sub.Name?.toLowerCase().includes('bfr') ||
    sub.Name?.toLowerCase().includes('usa') ||
    sub.Name?.toLowerCase().includes('china') ||
    sub.Name?.toLowerCase().includes('mercosur') ||
    sub.Name?.toLowerCase().includes('switzerland') ||
    sub.Name?.toLowerCase().includes('italy') ||
    sub.Name?.toLowerCase().includes('france') ||
    sub.Name?.toLowerCase().includes('netherlands') ||
    sub.Name?.toLowerCase().includes('european union')
  ) || []

  console.log(`\n=== Food Contact Subsections (${foodContactSubs.length}) ===\n`)

  // Sort by Order field if it exists
  foodContactSubs.sort((a: any, b: any) => {
    const orderA = a.Order ?? a['SUBSECTION SORT NUMBER'] ?? 999
    const orderB = b.Order ?? b['SUBSECTION SORT NUMBER'] ?? 999
    return orderA - orderB
  })

  foodContactSubs.forEach((sub: any) => {
    console.log(`Order: ${sub.Order ?? 'N/A'} | SUBSECTION SORT NUMBER: ${sub['SUBSECTION SORT NUMBER'] ?? 'N/A'} | Created: ${sub['Created Date']}`)
    console.log(`  Name: ${sub.Name?.substring(0, 70)}...`)
    console.log(`  ID: ${sub._id}`)
    console.log()
  })
}

main().catch(console.error)
