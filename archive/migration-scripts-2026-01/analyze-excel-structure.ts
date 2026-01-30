import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXCEL_FILE_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'

async function analyzeExcelStructure() {
  console.log('Reading Excel file...')
  const workbook = XLSX.readFile(EXCEL_FILE_PATH)

  console.log('\n=== WORKBOOK STRUCTURE ===')
  console.log('Sheet Names:', workbook.SheetNames)
  console.log('Number of sheets:', workbook.SheetNames.length)

  // Analyze each sheet
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n=== SHEET: ${sheetName} ===`)
    const worksheet = workbook.Sheets[sheetName]

    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    console.log(`Range: ${worksheet['!ref']}`)
    console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`)

    // Convert to JSON to analyze structure
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    // Show first few rows
    console.log('\nFirst 10 rows:')
    data.slice(0, 10).forEach((row: any, idx: number) => {
      console.log(`Row ${idx}:`, row)
    })

    // If it has headers, show column names
    if (data.length > 0) {
      console.log('\nColumn headers (Row 0):', data[0])
    }

    // Sample a few data rows
    if (data.length > 1) {
      console.log('\nSample data rows (Rows 1-3):')
      data.slice(1, 4).forEach((row: any, idx: number) => {
        console.log(`Row ${idx + 1}:`, row)
      })
    }

    // Count non-empty rows
    const nonEmptyRows = data.filter((row: any) =>
      row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
    )
    console.log(`\nNon-empty rows: ${nonEmptyRows.length}`)
  }

  console.log('\n=== ANALYZING QUESTION STRUCTURE ===')

  // Try to identify which sheet contains questions/answers
  const mainSheet = workbook.Sheets[workbook.SheetNames[0]]
  const mainData: any[] = XLSX.utils.sheet_to_json(mainSheet, { header: 1, defval: '' })

  // Look for question numbering patterns (e.g., "4.8.1")
  console.log('\nSearching for question numbering patterns...')
  let questionCount = 0
  let answeredCount = 0

  for (let i = 0; i < Math.min(mainData.length, 200); i++) {
    const row = mainData[i]
    const rowText = row.join(' ')

    // Look for patterns like "1.1.1" or "4.8.2"
    const numberingMatch = rowText.match(/\b(\d+)\.(\d+)\.(\d+)\b/)
    if (numberingMatch) {
      questionCount++

      // Check if there's an answer in this row
      const hasAnswer = row.some((cell: any, idx: number) =>
        idx > 0 && cell !== '' && cell !== null && cell !== undefined
      )

      if (hasAnswer) answeredCount++

      if (questionCount <= 5) {
        console.log(`Question ${questionCount}: ${numberingMatch[0]} - Row ${i}`)
        console.log(`  Full row:`, row.slice(0, 5), '...')
      }
    }
  }

  console.log(`\nFound ${questionCount} questions (in first 200 rows)`)
  console.log(`Found ${answeredCount} with answers`)

  // Get HQ2.1 tag from database
  console.log('\n=== COMPARING WITH DATABASE ===')
  const { data: hq21Tag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'HQ2.1')
    .single()

  if (hq21Tag) {
    console.log('Found HQ2.1 tag:', hq21Tag)

    // Count questions with this tag
    const { data: questionTags, count } = await supabase
      .from('question_tags')
      .select('question_id', { count: 'exact', head: true })
      .eq('tag_id', hq21Tag.id)

    console.log(`Database has ${count} questions tagged with HQ2.1`)

    // Get a few sample questions
    const { data: sampleQuestions } = await supabase
      .from('questions')
      .select('id, section_sort_number, subsection_sort_number, order_number, content, question_type')
      .in('id',
        (await supabase
          .from('question_tags')
          .select('question_id')
          .eq('tag_id', hq21Tag.id)
          .limit(5)
        ).data?.map(qt => qt.question_id) || []
      )
      .order('section_sort_number')
      .order('subsection_sort_number')
      .order('order_number')

    console.log('\nSample HQ2.1 questions from database:')
    sampleQuestions?.forEach(q => {
      console.log(`${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number} - ${q.question_type}`)
      console.log(`  ${q.content?.substring(0, 100)}...`)
    })
  }
}

analyzeExcelStructure()
  .then(() => {
    console.log('\n✓ Analysis complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
