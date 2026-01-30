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
  console.log('🔍 Verifying FennoCide Import')
  console.log('=' .repeat(80))

  // 1. Find the FennoCide sheet
  const { data: sheet, error: sheetError } = await supabase
    .from('sheets')
    .select('id, name, assigned_to_company_id, companies!sheets_assigned_to_company_id_fkey(name)')
    .eq('name', 'FennoCide BZ26 - P&P ViS HQ v2.1')
    .single()

  if (sheetError || !sheet) {
    console.error('   ❌ Failed to find sheet:', sheetError)
    process.exit(1)
  }

  console.log(`\n✓ Found sheet: ${sheet.name}`)
  console.log(`   ID: ${sheet.id}`)
  console.log(`   Company: ${(sheet.companies as any)?.name}`)

  // 2. Count answers for this sheet
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('id, text_value, custom_comment_text, parent_question_id, questions!answers_parent_question_id_fkey(name, sections!questions_parent_section_id_fkey(name))')
    .eq('sheet_id', sheet.id)

  if (answersError) {
    console.error('   ❌ Failed to fetch answers:', answersError)
    process.exit(1)
  }

  console.log(`\n✓ Found ${answers.length} answers for this sheet`)

  // 3. Group by section
  const sectionStats = new Map<string, number>()

  for (const answer of answers) {
    const question = answer.questions as any
    const section = question?.sections?.name || 'Unknown'
    sectionStats.set(section, (sectionStats.get(section) || 0) + 1)
  }

  console.log('\n📊 Answers by Section:')
  for (const [section, count] of Array.from(sectionStats.entries()).sort()) {
    console.log(`   ${section}: ${count} answers`)
  }

  // 4. Show sample answers
  console.log('\n📝 Sample Answers (first 10):')
  answers.slice(0, 10).forEach((answer, idx) => {
    const question = answer.questions as any
    const section = question?.sections?.name || 'Unknown'
    console.log(`\n   ${idx + 1}. [${section}]`)
    console.log(`      Question: ${question?.name?.substring(0, 70)}...`)
    console.log(`      Answer: ${answer.text_value}`)
    if (answer.custom_comment_text) {
      console.log(`      Comment: ${answer.custom_comment_text.substring(0, 70)}...`)
    }
  })

  console.log('\n✅ Verification complete!')
}

main().catch(console.error)
