import { supabase } from './src/migration/supabase-client.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const BUBBLE_BASE_URL = process.env.BUBBLE_API_URL!
const BUBBLE_API_TOKEN = process.env.BUBBLE_API_TOKEN!

async function findMissingSection() {
  console.log('=== Investigating Missing Section 4.8 ===\n')

  // First check Bubble for Section 4.8
  console.log('Checking Bubble for Section 4.8 questions...\n')

  const url = `${BUBBLE_BASE_URL}/api/1.1/obj/question?constraints=[{"key":"SECTION SORT NUMBER","constraint_type":"equals","value":4}]&limit=200`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${BUBBLE_API_TOKEN}` }
  })
  const data = await response.json() as any

  if (!data.response || !data.response.results) {
    console.log('No questions found in Bubble')
    return
  }

  // Filter for subsection 8
  const section48Questions = data.response.results.filter((q: any) =>
    q['SUBSECTION SORT NUMBER'] === 8
  )

  console.log(`Found ${section48Questions.length} questions in Section 4.8 in Bubble:\n`)

  for (const q of section48Questions) {
    console.log(`Question Order ${q.Order}:`)
    console.log(`  ID: ${q.ID}`)
    console.log(`  Bubble ID: ${q._id}`)
    console.log(`  Name: ${q.Name}`)
    console.log(`  Type: ${q.Type}`)
    console.log(`  Section: ${q['SECTION NAME SORT']}`)
    console.log(`  Subsection: ${q['SUBSECTION NAME SORT']}`)

    // Check if migrated
    const { data: supabaseQ } = await supabase
      .from('questions')
      .select('id, name, question_id_number, section_sort_number, subsection_sort_number, order_number')
      .eq('bubble_id', q._id)
      .maybeSingle()

    if (supabaseQ) {
      console.log(`  ✓ Migrated to Supabase:`)
      console.log(`    Supabase ID: ${supabaseQ.id}`)
      console.log(`    Section/Subsection/Order: ${supabaseQ.section_sort_number}.${supabaseQ.subsection_sort_number}.${supabaseQ.order_number}`)
    } else {
      console.log(`  ❌ NOT FOUND in Supabase`)
    }
    console.log()
  }

  // Now check what Supabase has for section 4
  console.log('\n=== Supabase Section 4 Structure ===\n')

  const { data: allSection4 } = await supabase
    .from('questions')
    .select('question_id_number, section_sort_number, subsection_sort_number, order_number, name, section_name_sort, subsection_name_sort')
    .eq('section_sort_number', 4)
    .order('subsection_sort_number, order_number')

  if (allSection4 && allSection4.length > 0) {
    // Group by subsection
    const bySubsection = new Map<number, typeof allSection4>()

    for (const q of allSection4) {
      const subsec = q.subsection_sort_number || 0
      if (!bySubsection.has(subsec)) {
        bySubsection.set(subsec, [])
      }
      bySubsection.get(subsec)!.push(q)
    }

    const subsections = Array.from(bySubsection.keys()).sort((a, b) => a - b)

    console.log(`Found subsections: ${subsections.join(', ')}\n`)

    for (const subsec of subsections) {
      const questions = bySubsection.get(subsec)!
      console.log(`Subsection ${subsec} (${questions.length} questions):`)
      if (questions[0].subsection_name_sort) {
        console.log(`  Name: ${questions[0].subsection_name_sort}`)
      }
      for (const q of questions.slice(0, 3)) {
        console.log(`  - Order ${q.order_number}: ${q.name?.substring(0, 60)}`)
      }
      console.log()
    }
  }
}

findMissingSection()
