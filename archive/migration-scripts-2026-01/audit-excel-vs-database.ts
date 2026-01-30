import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'

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

interface ExcelQuestion {
  sheetName: string
  rowNumber: number
  questionText: string
  sectionName: string
}

interface DatabaseQuestion {
  id: string
  name: string
  section_name_sort: string
  section_sort_number: number
  subsection_sort_number: number
  order_number: number
  question_type: string
}

// Simple similarity score (0-1)
function similarityScore(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim()
  const str2 = s2.toLowerCase().trim()

  if (str1 === str2) return 1.0

  // Dice coefficient (bigram similarity)
  const bigrams1 = new Set<string>()
  const bigrams2 = new Set<string>()

  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substring(i, i + 2))
  }
  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substring(i, i + 2))
  }

  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)))
  return (2.0 * intersection.size) / (bigrams1.size + bigrams2.size)
}

async function extractExcelQuestions(): Promise<ExcelQuestion[]> {
  console.log('📖 Reading Excel file...\n')
  const workbook = XLSX.readFile(EXCEL_FILE_PATH)
  const questions: ExcelQuestion[] = []

  for (const sheetName of SUPPLIER_SHEETS) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue

    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    // Find answer column for this sheet
    let answerColumnIndex = -1
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]
      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j]).toLowerCase()
        if (cellValue.includes('answer') && (cellValue.includes('drop-down') || cellValue.includes('list'))) {
          answerColumnIndex = j
          break
        }
      }
      if (answerColumnIndex >= 0) break
    }

    // Extract questions
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const questionText = String(row[1] || '').trim()

      // Skip empty rows, headers, instructions
      if (!questionText || questionText.length < 15) continue
      if (questionText.toLowerCase().includes('help')) continue
      if (questionText.toLowerCase().startsWith('if yes')) continue
      if (questionText.toLowerCase().startsWith('please specify')) continue

      // This looks like a question
      questions.push({
        sheetName,
        rowNumber: i + 1,
        questionText,
        sectionName: sheetName
      })
    }
  }

  return questions
}

async function getDatabaseQuestions(): Promise<DatabaseQuestion[]> {
  console.log('🗄️  Fetching HQ2.1 questions from database...\n')

  // Get HQ2.1 tag
  const { data: hq21Tag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'HQ2.1')
    .single()

  if (!hq21Tag) {
    throw new Error('HQ2.1 tag not found in database')
  }

  // Get question IDs for HQ2.1
  const { data: questionTags } = await supabase
    .from('question_tags')
    .select('question_id')
    .eq('tag_id', hq21Tag.id)

  const questionIds = questionTags?.map(qt => qt.question_id) || []

  // Get full question details
  const { data: questions } = await supabase
    .from('questions')
    .select('id, name, section_name_sort, section_sort_number, subsection_sort_number, order_number, question_type')
    .in('id', questionIds)
    .order('section_sort_number')
    .order('subsection_sort_number')
    .order('order_number')

  return questions || []
}

async function performAudit() {
  console.log('═'.repeat(80))
  console.log('   EXCEL vs DATABASE QUESTION AUDIT')
  console.log('═'.repeat(80))
  console.log()

  const excelQuestions = await extractExcelQuestions()
  const dbQuestions = await getDatabaseQuestions()

  console.log(`📊 Summary:`)
  console.log(`   Excel: ${excelQuestions.length} questions`)
  console.log(`   Database: ${dbQuestions.length} HQ2.1-tagged questions`)
  console.log()

  // Group Excel questions by sheet
  const excelBySheet: Record<string, ExcelQuestion[]> = {}
  for (const q of excelQuestions) {
    if (!excelBySheet[q.sheetName]) excelBySheet[q.sheetName] = []
    excelBySheet[q.sheetName].push(q)
  }

  console.log('📋 Excel Questions by Sheet:')
  for (const [sheet, questions] of Object.entries(excelBySheet)) {
    console.log(`   ${sheet}: ${questions.length} questions`)
  }
  console.log()

  // Group DB questions by section
  const dbBySection: Record<string, DatabaseQuestion[]> = {}
  for (const q of dbQuestions) {
    const section = q.section_name_sort || 'Unknown'
    if (!dbBySection[section]) dbBySection[section] = []
    dbBySection[section].push(q)
  }

  console.log('🗄️  Database Questions by Section:')
  for (const [section, questions] of Object.entries(dbBySection)) {
    console.log(`   ${section}: ${questions.length} questions`)
  }
  console.log()

  // Try to match Excel to DB
  console.log('═'.repeat(80))
  console.log('   MATCHING ANALYSIS')
  console.log('═'.repeat(80))
  console.log()

  const matched: Array<{excel: ExcelQuestion, db: DatabaseQuestion, score: number}> = []
  const unmatchedExcel: ExcelQuestion[] = []
  const unmatchedDb: DatabaseQuestion[] = [...dbQuestions]

  for (const excelQ of excelQuestions) {
    let bestMatch: DatabaseQuestion | null = null
    let bestScore = 0

    for (const dbQ of unmatchedDb) {
      const score = similarityScore(excelQ.questionText, dbQ.name || '')
      if (score > bestScore && score > 0.6) { // 60% threshold
        bestScore = score
        bestMatch = dbQ
      }
    }

    if (bestMatch && bestScore > 0.6) {
      matched.push({ excel: excelQ, db: bestMatch, score: bestScore })
      const index = unmatchedDb.indexOf(bestMatch)
      if (index > -1) unmatchedDb.splice(index, 1)
    } else {
      unmatchedExcel.push(excelQ)
    }
  }

  console.log(`✅ MATCHED: ${matched.length} questions`)
  console.log(`   (Questions that appear in both Excel and Database)`)
  console.log()

  console.log(`❌ IN EXCEL ONLY: ${unmatchedExcel.length} questions`)
  console.log(`   (Questions in Excel template but NOT in database)`)
  console.log()

  console.log(`⚠️  IN DATABASE ONLY: ${unmatchedDb.length} questions`)
  console.log(`   (Questions in database but NOT in Excel template)`)
  console.log()

  // Show details
  if (unmatchedExcel.length > 0) {
    console.log('═'.repeat(80))
    console.log('   QUESTIONS IN EXCEL BUT NOT IN DATABASE')
    console.log('═'.repeat(80))
    console.log()
    unmatchedExcel.forEach((q, idx) => {
      console.log(`${idx + 1}. [${q.sheetName}] Row ${q.rowNumber}`)
      console.log(`   ${q.questionText.substring(0, 120)}...`)
      console.log()
    })
  }

  if (unmatchedDb.length > 0) {
    console.log('═'.repeat(80))
    console.log('   QUESTIONS IN DATABASE BUT NOT IN EXCEL')
    console.log('═'.repeat(80))
    console.log()
    unmatchedDb.forEach((q, idx) => {
      console.log(`${idx + 1}. [${q.section_name_sort}] ${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`)
      console.log(`   ${(q.name || '').substring(0, 120)}...`)
      console.log(`   Type: ${q.question_type}`)
      console.log()
    })
  }

  // Write detailed report to file
  const report = {
    summary: {
      excel_count: excelQuestions.length,
      database_count: dbQuestions.length,
      matched: matched.length,
      excel_only: unmatchedExcel.length,
      database_only: unmatchedDb.length
    },
    matched: matched.map(m => ({
      excel_sheet: m.excel.sheetName,
      excel_row: m.excel.rowNumber,
      excel_text: m.excel.questionText,
      db_section: m.db.section_name_sort,
      db_number: `${m.db.section_sort_number}.${m.db.subsection_sort_number}.${m.db.order_number}`,
      db_text: m.db.name,
      match_score: m.score
    })),
    excel_only: unmatchedExcel,
    database_only: unmatchedDb.map(q => ({
      id: q.id,
      section: q.section_name_sort,
      number: `${q.section_sort_number}.${q.subsection_sort_number}.${q.order_number}`,
      name: q.name,
      type: q.question_type
    }))
  }

  const reportPath = path.join(__dirname, 'excel-vs-database-audit-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)

  console.log('\n' + '═'.repeat(80))
  console.log('   RECOMMENDATION')
  console.log('═'.repeat(80))
  console.log()

  if (unmatchedExcel.length === 0 && unmatchedDb.length === 0) {
    console.log('✅ PERFECT MATCH! Excel and database are in sync.')
    console.log('   Proceed with import functionality as planned.')
  } else if (unmatchedExcel.length > 0 && unmatchedDb.length === 0) {
    console.log('⚠️  Excel has ADDITIONAL questions not in database.')
    console.log('   Options:')
    console.log('   A) Add missing questions to database (sync DB to Excel)')
    console.log('   B) Remove questions from Excel template (sync Excel to DB)')
    console.log('   C) Build flexible import that handles mismatches')
  } else if (unmatchedExcel.length === 0 && unmatchedDb.length > 0) {
    console.log('⚠️  Database has ADDITIONAL questions not in Excel.')
    console.log('   Options:')
    console.log('   A) Add missing questions to Excel template (sync Excel to DB)')
    console.log('   B) Remove questions from database (sync DB to Excel)')
    console.log('   C) These questions may have been added after Excel was created')
  } else {
    console.log('⚠️  DIVERGENCE: Both Excel and database have unique questions.')
    console.log('   This suggests they\'ve evolved independently.')
    console.log('   Options:')
    console.log('   A) Decide which is the source of truth and sync the other')
    console.log('   B) Merge both (keep all questions, update tags accordingly)')
    console.log('   C) Review each discrepancy manually')
  }

  console.log()
}

performAudit()
  .then(() => {
    console.log('✓ Audit complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
