import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: sub } = await supabase
    .from('subsections')
    .select('id')
    .eq('name', 'Biocides')
    .single()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, order_number, dependent_no_show, response_type')
    .eq('subsection_id', sub!.id)
    .order('order_number')

  console.log('=== Current Biocides Questions (Supabase) ===')
  console.log('')
  questions?.forEach(q => {
    const dep = q.dependent_no_show ? 'DEPENDENT' : 'independent'
    console.log(`${q.order_number}. [${dep}] [${q.response_type}]`)
    console.log(`   ${(q.name || '').substring(0, 70)}`)
    console.log('')
  })

  console.log('=== Expected Branching Logic ===')
  console.log('Q1 = parent question (Contains biocidal substances?)')
  console.log('Q2, Q3 should DEPEND on Q1 (show only when Q1 = Yes)')
  console.log('Q4-Q8 should be INDEPENDENT')
}

main().catch(console.error)
