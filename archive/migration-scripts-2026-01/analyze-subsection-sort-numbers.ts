import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function analyzeSubsectionSortNumbers() {
  console.log('=== Analyzing Subsection Sort Numbers ===\n')

  // Check how many questions have null subsection_sort_number
  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })

  const { count: questionsWithNull } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .is('subsection_sort_number', null)

  const { count: questionsWithValue } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .not('subsection_sort_number', 'is', null)

  console.log(`Total questions: ${totalQuestions}`)
  console.log(`Questions with null subsection_sort_number: ${questionsWithNull}`)
  console.log(`Questions with subsection_sort_number: ${questionsWithValue}\n`)

  // Get sample questions with null subsection_sort_number but with parent_subsection_id
  console.log('=== Sample Questions with Null Subsection Sort Number ===\n')

  const { data: sampleQuestions } = await supabase
    .from('questions')
    .select('id, bubble_id, name, section_sort_number, subsection_sort_number, order_number, parent_subsection_id, subsection_name_sort')
    .is('subsection_sort_number', null)
    .not('parent_subsection_id', 'is', null)
    .limit(10)

  if (sampleQuestions && sampleQuestions.length > 0) {
    for (const q of sampleQuestions) {
      console.log(`Question: ${q.name?.substring(0, 60)}`)
      console.log(`  Bubble ID: ${q.bubble_id}`)
      console.log(`  Section: ${q.section_sort_number}`)
      console.log(`  Subsection sort: ${q.subsection_sort_number} (NULL)`)
      console.log(`  Subsection name: ${q.subsection_name_sort}`)
      console.log(`  Order: ${q.order_number}`)
      console.log(`  Parent subsection ID: ${q.parent_subsection_id}`)

      // Check the subsection
      if (q.parent_subsection_id) {
        const { data: subsection } = await supabase
          .from('subsections')
          .select('name, order_number, parent_section_id')
          .eq('id', q.parent_subsection_id)
          .maybeSingle()

        if (subsection) {
          console.log(`  → Subsection in DB: ${subsection.name} (order: ${subsection.order_number})`)
        } else {
          console.log(`  → Subsection NOT FOUND in DB`)
        }
      }
      console.log()
    }
  }

  // Check if we can get subsection_sort_number from Bubble
  console.log('\n=== Checking Bubble for Subsection Sort Numbers ===\n')

  if (sampleQuestions && sampleQuestions.length > 0) {
    const bubbleId = sampleQuestions[0].bubble_id

    const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question/${bubbleId}`
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
    })
    const data = await response.json() as any

    if (data.response) {
      console.log('Sample Bubble question:')
      console.log(`  Name: ${data.response.Name}`)
      console.log(`  SECTION SORT NUMBER: ${data.response['SECTION SORT NUMBER']}`)
      console.log(`  SUBSECTION SORT NUMBER: ${data.response['SUBSECTION SORT NUMBER']}`)
      console.log(`  Order: ${data.response.Order}`)
      console.log(`  Parent Subsection: ${data.response['Parent Subsection']}`)
    }
  }

  // Check if subsections have order_number
  console.log('\n=== Checking Subsections Order Numbers ===\n')

  const { data: subsections, count: subsectionCount } = await supabase
    .from('subsections')
    .select('id, name, order_number, parent_section_id', { count: 'exact' })
    .limit(20)

  console.log(`Total subsections: ${subsectionCount}`)

  if (subsections && subsections.length > 0) {
    console.log('\nSample subsections:')
    for (const s of subsections.slice(0, 10)) {
      console.log(`  ${s.name?.substring(0, 50)} - order: ${s.order_number}`)
    }
  }
}

analyzeSubsectionSortNumbers()
