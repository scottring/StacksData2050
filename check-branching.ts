import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Check Biocides questions for dependent_no_show
  const { data: biocidesSub } = await supabase
    .from('subsections')
    .select('id')
    .eq('name', 'Biocides')
    .single()

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, order_number, dependent_no_show')
    .eq('subsection_id', biocidesSub!.id)
    .order('order_number')

  console.log('=== Biocides questions branching ===')
  questions?.forEach(q => {
    console.log(`${q.order_number}. dependent_no_show=${q.dependent_no_show}`)
    console.log(`    ${(q.name || '').substring(0, 60)}`)
  })

  // Also check Ecolabels
  console.log('\n=== Ecolabels subsections branching ===')

  const { data: ecoSubs } = await supabase
    .from('subsections')
    .select('id, name')
    .or('name.ilike.%EU Ecolabel%,name.ilike.%Nordic%,name.ilike.%Blue Angel%')

  for (const sub of ecoSubs || []) {
    const { data: qs } = await supabase
      .from('questions')
      .select('id, name, order_number, dependent_no_show')
      .eq('subsection_id', sub.id)
      .order('order_number')

    console.log(`\n${sub.name}:`)
    qs?.forEach(q => {
      if (q.dependent_no_show) {
        console.log(`  ${q.order_number}. dependent_no_show=${q.dependent_no_show} - ${(q.name || '').substring(0, 50)}`)
      }
    })
  }
}

main().catch(console.error)
