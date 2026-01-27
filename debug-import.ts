import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function debug() {
  // Load Excel file
  const excelPath = "/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx"
  const workbook = XLSX.readFile(excelPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

  // Find mineral oil hydrocarbons question in Excel
  console.log('=== SEARCHING EXCEL FOR "mineral oil hydrocarbons" ===\n')

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[1]) continue
    const questionText = String(row[1]).toLowerCase()
    if (questionText.includes('mineral oil') || questionText.includes('moh')) {
      console.log(`Row ${i + 1}:`)
      console.log(`  Col A (ID): ${row[0]}`)
      console.log(`  Col B (Question): ${String(row[1]).substring(0, 80)}...`)
      console.log(`  Col C (Answer): "${row[2]}"`)
      console.log()
    }
  }

  // Now check what's in the database for that question
  console.log('=== CHECKING DATABASE FOR "mineral oil hydrocarbons" ===\n')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, bubble_id')
    .ilike('name', '%mineral oil%')

  for (const q of questions || []) {
    console.log(`Question: ${q.name?.substring(0, 60)}...`)
    console.log(`  ID: ${q.id}`)
    console.log(`  Bubble ID: ${q.bubble_id}`)

    // Check if there's an answer for this in the test sheet
    const { data: answer } = await supabase
      .from('answers')
      .select('text_value, choice_id')
      .eq('sheet_id', '0e21cabb-84f4-43a6-8e77-614e9941a734')
      .eq('parent_question_id', q.id)
      .single()

    if (answer) {
      if (answer.choice_id) {
        const { data: choice } = await supabase.from('choices').select('content').eq('id', answer.choice_id).single()
        console.log(`  Answer in DB: "${choice?.content}" (via choice_id)`)
      } else {
        console.log(`  Answer in DB: "${answer.text_value}" (text_value)`)
      }
    } else {
      console.log(`  Answer in DB: NONE`)
    }
    console.log()
  }
}

debug().catch(console.error)
