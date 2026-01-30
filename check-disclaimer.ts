import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // List all sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, order_number')
    .order('order_number')

  console.log('=== All Sections ===')
  sections?.forEach(s => console.log(`${s.order_number}. ${s.name}`))

  // Find the disclaimer question directly
  console.log('\n=== Disclaimer Question ===')
  const { data: disclaimer } = await supabase
    .from('questions')
    .select(`
      id,
      name,
      response_type,
      order_number,
      subsection_id,
      subsections (
        name,
        section_id,
        sections (
          name
        )
      )
    `)
    .ilike('name', '%disclaimer%')

  disclaimer?.forEach(q => {
    const sub = q.subsections as any
    const sec = sub?.sections as any
    console.log(`Section: ${sec?.name}`)
    console.log(`Subsection: ${sub?.name}`)
    console.log(`Question: ${q.name}`)
    console.log(`Response type: ${q.response_type}`)
    console.log(`Order: ${q.order_number}`)
  })

  // Check the view
  console.log('\n=== In sheet_answers_display view ===')
  const { data: viewData } = await supabase
    .from('sheet_answers_display')
    .select('question_id, question_name, response_type')
    .ilike('question_name', '%disclaimer%')
    .limit(3)

  viewData?.forEach(v => {
    console.log(`[${v.response_type}] ${v.question_name}`)
  })
}

main().catch(console.error)
