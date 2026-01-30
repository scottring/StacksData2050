import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Check Ecolabels section
  const { data: ecoSection } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Ecolabels')
    .single()

  console.log('=== ECOLABELS SUBSECTIONS ===')
  const { data: ecoSubs } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', ecoSection!.id)
    .order('order_number')

  ecoSubs?.forEach(s => {
    console.log(`${s.order_number}. ${s.name}`)
    console.log(`   ID: ${s.id}`)
  })

  // Check for duplicate questions by name
  console.log('\n=== CHECKING FOR DUPLICATE QUESTIONS ===')

  for (const sub of ecoSubs || []) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, order_number')
      .eq('subsection_id', sub.id)
      .order('order_number')

    console.log(`\n${sub.name} (${questions?.length} questions):`)
    questions?.forEach(q => {
      console.log(`  ${q.order_number}. ${(q.name || '').substring(0, 50)}`)
    })
  }

  // Check Biocides too
  console.log('\n=== BIOCIDES SUBSECTIONS ===')
  const { data: bioSection } = await supabase
    .from('sections')
    .select('id')
    .eq('name', 'Biocides')
    .single()

  const { data: bioSubs } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', bioSection!.id)
    .order('order_number')

  bioSubs?.forEach(s => {
    console.log(`${s.order_number}. ${s.name}`)
  })

  for (const sub of bioSubs || []) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, order_number')
      .eq('subsection_id', sub.id)
      .order('order_number')

    console.log(`\n${sub.name} (${questions?.length} questions):`)
    questions?.forEach(q => {
      console.log(`  ${q.order_number}. ${(q.name || '').substring(0, 50)}`)
    })
  }

  // Check for any questions with duplicate names across the system
  console.log('\n=== CHECKING FOR GLOBAL DUPLICATE QUESTION NAMES ===')
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, name, subsection_id')

  const nameCount = new Map<string, number>()
  allQuestions?.forEach(q => {
    const name = q.name || ''
    nameCount.set(name, (nameCount.get(name) || 0) + 1)
  })

  const duplicates = Array.from(nameCount.entries()).filter(([_, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log('Found duplicate question names:')
    duplicates.forEach(([name, count]) => {
      console.log(`  "${name.substring(0, 50)}..." appears ${count} times`)
    })
  } else {
    console.log('No duplicate question names found')
  }
}

main().catch(console.error)
