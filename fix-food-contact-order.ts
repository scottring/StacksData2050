import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL || 'https://app.stacksdata.com/version-live'
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  console.log('=== Fixing Food Contact Subsection Order ===\n')

  // Get HQ2.1 tag
  const tags = await fetchBubble('tag', {
    constraints: JSON.stringify([{ key: 'Name', constraint_type: 'equals', value: 'HQ2.1' }])
  })
  const hq21TagId = tags.response?.results?.[0]?._id

  // Get HQ2.1 questions
  const questions = await fetchBubble('question', {
    limit: '500',
    constraints: JSON.stringify([{ key: 'Tags', constraint_type: 'contains', value: hq21TagId }])
  })

  // Get unique subsection IDs
  const subsectionIds = new Set<string>()
  questions.response?.results?.forEach((q: any) => {
    if (q['Parent Subsection']) subsectionIds.add(q['Parent Subsection'])
  })

  // Fetch all subsections
  const allSubsections = await fetchBubble('subsection', { limit: '200' })

  // Filter Food Contact subsections (section sort = 4)
  const foodContactSubs = allSubsections.response?.results?.filter((sub: any) => {
    return subsectionIds.has(sub._id) && sub['SECTION SORT NUMBER'] === 4
  }) || []

  // Sort by SUBSECTION SORT NUMBER from Bubble
  foodContactSubs.sort((a: any, b: any) =>
    (a['SUBSECTION SORT NUMBER'] || 0) - (b['SUBSECTION SORT NUMBER'] || 0)
  )

  console.log('Food Contact subsections from Bubble (section 4):')
  foodContactSubs.forEach((sub: any, idx: number) => {
    console.log(`  ${idx + 1}. [Order: ${sub['SUBSECTION SORT NUMBER']}] ${sub.Name}`)
  })

  // Now get Supabase subsections for Food Contact (section 4)
  const { data: supabaseSubs, error } = await supabase
    .from('subsections')
    .select('id, name, order_number, bubble_id')
    .order('name')

  if (error) {
    console.error('Error fetching Supabase subsections:', error)
    return
  }

  console.log('\n\n=== Mapping Bubble to Supabase ===\n')

  // Map Bubble subsections to Supabase and update order
  for (const bubbleSub of foodContactSubs) {
    const bubbleOrder = bubbleSub['SUBSECTION SORT NUMBER']
    const bubbleName = bubbleSub.Name
    const bubbleId = bubbleSub._id

    // Find matching Supabase subsection
    const supabaseSub = supabaseSubs?.find(s =>
      s.bubble_id === bubbleId ||
      s.name === bubbleName ||
      s.name?.toLowerCase().trim() === bubbleName?.toLowerCase().trim()
    )

    if (supabaseSub) {
      console.log(`Bubble: "${bubbleName.substring(0, 50)}..." Order: ${bubbleOrder}`)
      console.log(`  -> Supabase ID: ${supabaseSub.id}, Current order: ${supabaseSub.order_number}`)

      if (supabaseSub.order_number !== bubbleOrder) {
        const { error: updateError } = await supabase
          .from('subsections')
          .update({ order_number: bubbleOrder })
          .eq('id', supabaseSub.id)

        if (updateError) {
          console.log(`  ERROR updating: ${updateError.message}`)
        } else {
          console.log(`  UPDATED to order: ${bubbleOrder}`)
        }
      } else {
        console.log(`  Already correct`)
      }
    } else {
      console.log(`NOT FOUND in Supabase: "${bubbleName.substring(0, 50)}..."`)
    }
    console.log()
  }

  // Also update question subsection_sort_number
  console.log('\n=== Updating question subsection_sort_number ===\n')

  for (const bubbleSub of foodContactSubs) {
    const bubbleOrder = bubbleSub['SUBSECTION SORT NUMBER']
    const bubbleName = bubbleSub.Name
    const bubbleId = bubbleSub._id

    const supabaseSub = supabaseSubs?.find(s =>
      s.bubble_id === bubbleId ||
      s.name === bubbleName ||
      s.name?.toLowerCase().trim() === bubbleName?.toLowerCase().trim()
    )

    if (supabaseSub) {
      const { error: qError, count } = await supabase
        .from('questions')
        .update({ subsection_sort_number: bubbleOrder })
        .eq('subsection_id', supabaseSub.id)
        .eq('section_sort_number', 4)

      if (qError) {
        console.log(`Error updating questions for ${bubbleName.substring(0, 30)}: ${qError.message}`)
      } else {
        console.log(`Updated questions in "${bubbleName.substring(0, 40)}..." to subsection_sort_number: ${bubbleOrder}`)
      }
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
