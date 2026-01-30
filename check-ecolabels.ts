import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkEcolabels() {
  // Find Section 2 (Ecolabels)
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .eq('order_number', 2)

  console.log('=== SECTION 2 ===')
  console.log(sections)

  if (!sections || sections.length === 0) return

  const sectionId = sections[0].id

  // Get subsections
  const { data: subsections } = await supabase
    .from('subsections')
    .select('id, name, order_number')
    .eq('section_id', sectionId)
    .order('order_number')

  console.log('\n=== SUBSECTIONS IN ECOLABELS ===')
  if (subsections) {
    subsections.forEach(s => console.log(`${s.order_number}. ${s.name} (${s.id})`))
  }

  // Get questions for each subsection
  for (const sub of subsections || []) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id, name, order_number, response_type, subsection_sort_number')
      .eq('subsection_id', sub.id)
      .order('order_number')

    console.log(`\n=== ${sub.name} (subsection ${sub.order_number}) ===`)
    const count = questions ? questions.length : 0
    console.log(`Total questions: ${count}`)
    if (questions) {
      questions.forEach(q => {
        const name = q.name ? q.name.substring(0, 100) : 'NO NAME'
        console.log(`  ${q.order_number}. [${q.response_type}] ${name}`)
      })
    }
  }
}

checkEcolabels().catch(console.error)
