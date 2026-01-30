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
    .select('id, parent_question_id, text_value')
    .eq('sheet_id', sheetId)

  console.log('Total answers:', answers?.length)

  // Count answers per question
  const questionCounts = new Map()
  answers?.forEach(a => {
    const qid = a.parent_question_id || 'null'
    questionCounts.set(qid, (questionCounts.get(qid) || 0) + 1)
  })

  const duplicates = Array.from(questionCounts.entries()).filter(([_, count]) => count > 1)

  console.log('\nQuestions with multiple answers:', duplicates.length)

  if (duplicates.length > 0) {
    console.log('\nDuplicate answers:')
    duplicates.forEach(([qid, count]) => {
      const shortQid = String(qid).substring(0, 8)
      console.log(`  Question ${shortQid}...: ${count} answers`)

      const dupes = answers?.filter(a => a.parent_question_id === qid)
      dupes?.forEach(a => {
        const shortId = a.id.substring(0, 8)
        const shortVal = a.text_value?.substring(0, 40) || 'empty'
        console.log(`    - ${shortId}...: ${shortVal}...`)
      })
    })
  }

  // Count unique questions
  console.log('\nUnique questions answered:', questionCounts.size)
}

main()
