import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const sheetId = '1038e05e-f492-4bf3-a101-bb7593142bb1'

  const { data: answers } = await supabase
    .from('answers')
    .select('id, parent_question_id, text_value, modified_at, created_at')
    .eq('sheet_id', sheetId)
    .order('modified_at', { ascending: false })

  console.log('Total answers:', answers?.length)
  console.log('\nModified_at distribution:')

  const modifiedAtCounts = new Map()
  answers?.forEach(a => {
    const timestamp = a.modified_at || 'null'
    modifiedAtCounts.set(timestamp, (modifiedAtCounts.get(timestamp) || 0) + 1)
  })

  for (const [timestamp, count] of Array.from(modifiedAtCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${timestamp}: ${count} answers`)
  }

  console.log('\nSample answers (first 5):')
  answers?.slice(0, 5).forEach(a => {
    const qid = a.parent_question_id?.substring(0, 8) || 'none'
    const val = a.text_value?.substring(0, 50) || 'empty'
    console.log(`  - Question ${qid}...`)
    console.log(`    Value: ${val}...`)
    console.log(`    Modified: ${a.modified_at}`)
    console.log(`    Created: ${a.created_at}`)
  })

  // Check if modified_at is null
  const nullModified = answers?.filter(a => !a.modified_at) || []
  console.log(`\n⚠️  Answers with NULL modified_at: ${nullModified.length}`)
}

main()
