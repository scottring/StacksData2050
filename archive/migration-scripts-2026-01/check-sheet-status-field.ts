import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkStatus() {
  console.log('=== Checking sections ===\n')

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, section_sort_number')
    .order('section_sort_number', { nullsFirst: false })

  console.log('All sections:')
  sections?.forEach(s => {
    const sortNum = s.section_sort_number !== null ? s.section_sort_number : 'NULL'
    console.log(`  ${sortNum}. ${s.name}`)
  })
}

checkStatus().catch(console.error)
