import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXCEL_FILE_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'

const SUPPLIER_SHEETS = [
  'Supplier Product Contact',
  'Food Contact',
  'Ecolabels',
  'Biocides',
  'PIDSL',
  'Additional Requirements'
]

async function analyzeSupplierSheets() {
  console.log('Reading Excel file...')
  const workbook = XLSX.readFile(EXCEL_FILE_PATH)

  for (const sheetName of SUPPLIER_SHEETS) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`ANALYZING: ${sheetName}`)
    console.log('='.repeat(80))

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      console.log(`❌ Sheet "${sheetName}" not found!`)
      continue
    }

    // Convert to 2D array
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    console.log(`Total rows: ${data.length}`)

    // Find answer columns (typically labeled "Answer via drop-down list" or similar)
    let answerColumnIndex = -1
    let commentColumnIndex = -1

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]
      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j]).toLowerCase()
        if (cellValue.includes('answer') && cellValue.includes('drop-down')) {
          answerColumnIndex = j
          console.log(`Found answer column at index ${j} (row ${i})`)
        }
        if (cellValue.includes('comment') || cellValue.includes('additional')) {
          commentColumnIndex = j
          console.log(`Found comment column at index ${j} (row ${i})`)
        }
      }
    }

    // Find questions and answers
    let questionsFound = 0
    let answersFound = 0
    const samples: any[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]

      // Look for question text in column B (index 1) - typically where questions appear
      const questionText = String(row[1] || '').trim()

      // Skip empty rows, headers, section titles
      if (!questionText || questionText.length < 10) continue
      if (questionText.toLowerCase().includes('help') || questionText === 'Help') continue

      // Check if this looks like a question (ends with ?, or is a statement)
      const isQuestion = questionText.length > 20

      if (isQuestion) {
        questionsFound++

        // Get answer from the answer column
        const answer = answerColumnIndex >= 0 ? String(row[answerColumnIndex] || '').trim() : ''
        const comment = commentColumnIndex >= 0 ? String(row[commentColumnIndex] || '').trim() : ''

        if (answer || comment) {
          answersFound++
        }

        // Save first 5 samples
        if (samples.length < 5) {
          samples.push({
            row: i,
            question: questionText.substring(0, 150),
            answer: answer.substring(0, 100),
            comment: comment.substring(0, 100),
            hasAnswer: !!(answer || comment)
          })
        }
      }
    }

    console.log(`\n📊 Statistics:`)
    console.log(`  Questions found: ${questionsFound}`)
    console.log(`  Answered: ${answersFound}`)
    console.log(`  Unanswered: ${questionsFound - answersFound}`)

    if (samples.length > 0) {
      console.log(`\n📝 Sample Questions & Answers:`)
      samples.forEach((sample, idx) => {
        console.log(`\n  ${idx + 1}. Row ${sample.row} ${sample.hasAnswer ? '✓' : '○'}`)
        console.log(`     Q: ${sample.question}${sample.question.length >= 150 ? '...' : ''}`)
        if (sample.answer) {
          console.log(`     A: ${sample.answer}${sample.answer.length >= 100 ? '...' : ''}`)
        }
        if (sample.comment) {
          console.log(`     C: ${sample.comment}${sample.comment.length >= 100 ? '...' : ''}`)
        }
      })
    }
  }

  // Now get some sample questions from database to see what we need to match
  console.log(`\n${'='.repeat(80)}`)
  console.log('DATABASE COMPARISON')
  console.log('='.repeat(80))

  const { data: hq21Tag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'HQ2.1')
    .single()

  if (hq21Tag) {
    console.log(`\n✓ Found HQ2.1 tag: ${hq21Tag.id}`)

    // Get all questions for HQ2.1
    const { data: questionTagsData } = await supabase
      .from('question_tags')
      .select('question_id')
      .eq('tag_id', hq21Tag.id)

    const questionIds = questionTagsData?.map(qt => qt.question_id) || []
    console.log(`✓ Found ${questionIds.length} questions tagged with HQ2.1`)

    // Get sample questions with their content
    const { data: sampleQuestions } = await supabase
      .from('questions')
      .select('id, content, question_type, section_name_sort, subsection_name_sort, section_sort_number, subsection_sort_number, order_number')
      .in('id', questionIds.slice(0, 10))
      .order('section_sort_number')
      .order('subsection_sort_number')
      .order('order_number')

    console.log(`\n📋 Sample Database Questions (for matching):`)
    sampleQuestions?.forEach((q, idx) => {
      const number = `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`
      console.log(`\n  ${idx + 1}. ${number} - ${q.section_name_sort}`)
      console.log(`     ${q.content?.substring(0, 150)}${q.content && q.content.length > 150 ? '...' : ''}`)
      console.log(`     Type: ${q.question_type}`)
    })

    // Check sections
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, section_sort_number')
      .order('section_sort_number')

    console.log(`\n📂 Database Sections:`)
    sections?.forEach(s => {
      console.log(`  ${s.section_sort_number}. ${s.name}`)
    })
  }
}

analyzeSupplierSheets()
  .then(() => {
    console.log('\n✓ Analysis complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
