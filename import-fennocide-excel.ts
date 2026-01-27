import XLSX from 'xlsx'
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

const EXCEL_FILE_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'

// Sheet parser configurations
interface SheetParserConfig {
  sheetName: string
  questionColumns: number[]
  answerColumn: number
  commentColumn?: number
  skipPatterns: RegExp[]
  tableHeaderPatterns: RegExp[]
}

const HQ21_PARSER_CONFIG: SheetParserConfig[] = [
  {
    sheetName: 'Supplier Product Contact',
    questionColumns: [1], // Column B
    answerColumn: 2, // Column C
    skipPatterns: [
      /^short instructions/i,
      /^version \d/i,
      /^disclaimer/i,
      /^HQ Version/i,
      /improve legibility/i,
      /BLOCK Letters/i,
      /Document Completed by/i
    ],
    tableHeaderPatterns: []
  },
  {
    sheetName: 'Food Contact',
    questionColumns: [1, 2, 3], // Columns B, C, D
    answerColumn: 6, // Column G
    commentColumn: 7, // Column H
    skipPatterns: [
      /^if yes, continue/i,
      /^help$/i,
      /^answer via/i,
      /Food Contact Compliance - General/i,
      /^General Information$/i
    ],
    tableHeaderPatterns: [/CAS Number/i, /Chemical Name/i, /Concentration/i, /FCM Number/i]
  },
  {
    sheetName: 'Ecolabels',
    questionColumns: [0], // Column A
    answerColumn: 5, // Column F
    commentColumn: 6, // Column G
    skipPatterns: [/^help$/i, /^answer via/i, /^EU Ecolabel$/i, /^Nordic Ecolabel$/i, /^Blue Angel$/i],
    tableHeaderPatterns: []
  },
  {
    sheetName: 'Biocides',
    questionColumns: [0], // Column A
    answerColumn: 3, // Column D
    commentColumn: 4, // Column E
    skipPatterns: [/^if yes, please specify/i, /^answer via/i, /^Biocides$/i],
    tableHeaderPatterns: [/Chemical Name/i, /CAS Number/i, /EC Number/i]
  },
  {
    sheetName: 'PIDSL',
    questionColumns: [1], // Column B
    answerColumn: 6, // Column G
    commentColumn: 7, // Column H
    skipPatterns: [
      /^if yes, please provide details/i,
      /^answer via/i,
      /Pulp and Paper Industry List/i,
      /^\(PIDSL\)$/i
    ],
    tableHeaderPatterns: [/Chemical name/i, /CAS Number/i, /EC Number/i]
  },
  {
    sheetName: 'Additional Requirements',
    questionColumns: [1, 2, 3], // Columns B, C, D (CRITICAL!)
    answerColumn: 2, // Column C
    commentColumn: 3, // Column D
    skipPatterns: [
      /^if yes, please provide/i,
      /^answer via/i,
      /^Additional Requirements$/i,
      /^Additional comments\/information$/i,
      /^Mineral Oil \(MOSH\/MOAH\)$/i,
      /Expiry date$/i
    ],
    tableHeaderPatterns: [/Substance Name/i, /Chemical Name/i, /CAS Number/i]
  }
]

const SHEET_TO_SECTION_MAP: Record<string, string> = {
  'Supplier Product Contact': 'Product Information',
  'Food Contact': 'Food Contact',
  'Ecolabels': 'Ecolabels',
  'Biocides': 'Biocides',
  'PIDSL': 'PIDSL',
  'Additional Requirements': 'Additional Requirements'
}

interface ParsedQuestion {
  sheetName: string
  rowNumber: number
  questionText: string
  subQuestionText?: string
  answerValue?: string
  commentValue?: string
  section: string
}

// Dice coefficient for fuzzy matching
function similarityScore(s1: string, s2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  const str1 = normalize(s1)
  const str2 = normalize(s2)

  if (str1 === str2) return 1.0
  if (str1.length < 2 || str2.length < 2) return 0.0

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

// Check if row is a table header
function isTableHeader(row: any[], config: SheetParserConfig): boolean {
  const rowText = row.map(cell => String(cell || '')).join(' ')
  return config.tableHeaderPatterns.some(pattern => pattern.test(rowText))
}

// Check if row should be skipped
function shouldSkipRow(row: any[], config: SheetParserConfig): boolean {
  // Empty row
  if (row.every(cell => !cell || String(cell).trim() === '')) {
    return true
  }

  // Check all cells for skip patterns
  const rowText = row.map(cell => String(cell || '')).join(' ')
  return config.skipPatterns.some(pattern => pattern.test(rowText))
}

// Parse a single sheet
function parseSheet(sheetData: any[][], config: SheetParserConfig): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  let inTableMode = false

  for (let i = 0; i < sheetData.length; i++) {
    const row = sheetData[i]

    // Skip empty rows
    if (shouldSkipRow(row, config)) {
      continue
    }

    // Check if this is a table header row
    if (isTableHeader(row, config)) {
      inTableMode = true
      continue
    }

    // Extract question text from configured columns
    let questionText = ''
    let subQuestionText = ''

    for (let colIdx = 0; colIdx < config.questionColumns.length; colIdx++) {
      const col = config.questionColumns[colIdx]
      const cellText = String(row[col] || '').trim()

      // Skip if this text matches skip patterns
      const shouldSkip = config.skipPatterns.some(pattern => pattern.test(cellText))
      if (shouldSkip) {
        continue
      }

      if (cellText && cellText.length > 20) {
        // First substantial text is main question
        if (!questionText) {
          questionText = cellText
        } else {
          // Additional text is sub-question
          subQuestionText = cellText
        }
      }
    }

    // No question text found, might be in table or skip row
    if (!questionText) {
      continue
    }

    // Exit table mode if we found a new question
    if (inTableMode && questionText) {
      inTableMode = false
    }

    // Extract answer and comment
    const answerValue = String(row[config.answerColumn] || '').trim()
    const commentValue = config.commentColumn
      ? String(row[config.commentColumn] || '').trim()
      : undefined

    // Only include if there's an answer
    if (answerValue) {
      questions.push({
        sheetName: config.sheetName,
        rowNumber: i + 1,
        questionText,
        subQuestionText: subQuestionText || undefined,
        answerValue,
        commentValue: commentValue || undefined,
        section: SHEET_TO_SECTION_MAP[config.sheetName]
      })
    }
  }

  return questions
}

async function main() {
  console.log('🚀 FennoCide Excel Import Script')
  console.log('=' .repeat(80))

  // 1. Load Excel file
  console.log('\n📂 Loading Excel file...')
  const workbook = XLSX.readFile(EXCEL_FILE_PATH)
  console.log(`   Found ${workbook.SheetNames.length} sheets`)

  // 2. Parse all supplier sheets
  console.log('\n📊 Parsing supplier sheets...')
  const allParsedQuestions: ParsedQuestion[] = []

  for (const config of HQ21_PARSER_CONFIG) {
    if (!workbook.SheetNames.includes(config.sheetName)) {
      console.log(`   ⚠️  Sheet "${config.sheetName}" not found, skipping`)
      continue
    }

    const sheet = workbook.Sheets[config.sheetName]
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

    const questions = parseSheet(sheetData, config)
    allParsedQuestions.push(...questions)

    console.log(`   ✓ ${config.sheetName}: ${questions.length} questions with answers`)
  }

  console.log(`\n   Total parsed: ${allParsedQuestions.length} answered questions`)

  // 3. Fetch HQ2.1 questions from database
  console.log('\n🗄️  Fetching HQ2.1 questions from database...')

  // Get HQ2.1 tag ID
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', 'HQ2.1')
    .single()

  if (tagError || !tag) {
    console.error('   ❌ Failed to find HQ2.1 tag:', tagError)
    process.exit(1)
  }

  console.log(`   ✓ Found tag: ${tag.name} (${tag.id})`)

  // Get all questions tagged with HQ2.1
  const { data: questionTags, error: qtError } = await supabase
    .from('question_tags')
    .select('question_id')
    .eq('tag_id', tag.id)

  if (qtError) {
    console.error('   ❌ Failed to fetch question_tags:', qtError)
    process.exit(1)
  }

  const questionIds = questionTags.map(qt => qt.question_id)
  console.log(`   ✓ Found ${questionIds.length} questions tagged with HQ2.1`)

  // Fetch question details with section info and question type
  const { data: dbQuestions, error: qError } = await supabase
    .from('questions')
    .select('id, name, question_type, parent_section_id, sections!questions_parent_section_id_fkey(name)')
    .in('id', questionIds)

  if (qError || !dbQuestions) {
    console.error('   ❌ Failed to fetch questions:', qError)
    process.exit(1)
  }

  console.log(`   ✓ Loaded ${dbQuestions.length} HQ2.1 question details`)

  // Fetch all choices for dropdown questions
  const { data: allChoices, error: choicesError} = await supabase
    .from('choices')
    .select('id, content, parent_question_id')

  if (choicesError) {
    console.error('   ⚠️  Warning: Failed to fetch choices:', choicesError)
  }

  console.log(`   ✓ Loaded ${allChoices?.length || 0} choices for dropdown questions`)

  // Build a map of choices by question_id -> content -> choice_id
  const choicesByQuestion = new Map<string, Map<string, string>>()
  allChoices?.forEach(choice => {
    if (!choice.parent_question_id) return

    if (!choicesByQuestion.has(choice.parent_question_id)) {
      choicesByQuestion.set(choice.parent_question_id, new Map())
    }

    const questionChoices = choicesByQuestion.get(choice.parent_question_id)!
    // Normalize content for matching (lowercase, trim, remove trailing periods/spaces)
    const normalizedText = choice.content.toLowerCase().trim().replace(/[.\s]+$/, '')
    questionChoices.set(normalizedText, choice.id)
  })

  // 4. Match Excel questions to database questions
  console.log('\n🔍 Matching Excel questions to database...')

  interface MatchResult {
    excelQuestion: ParsedQuestion
    dbQuestion: any
    matchScore: number
    matchMethod: 'exact' | 'fuzzy' | 'fuzzy-with-sub'
  }

  const matches: MatchResult[] = []
  const unmatched: ParsedQuestion[] = []
  const MATCH_THRESHOLD = 0.6

  for (const excelQ of allParsedQuestions) {
    // Filter DB questions by section
    const sectionQuestions = dbQuestions.filter(dbQ => {
      const sectionName = (dbQ.sections as any)?.name
      return sectionName === excelQ.section
    })

    let bestMatch: any = null
    let bestScore = 0
    let matchMethod: 'exact' | 'fuzzy' | 'fuzzy-with-sub' = 'fuzzy'

    // Try matching main question text
    for (const dbQ of sectionQuestions) {
      const score = similarityScore(excelQ.questionText, dbQ.name)
      if (score > bestScore) {
        bestScore = score
        bestMatch = dbQ
        matchMethod = 'fuzzy'
      }
    }

    // If no good match, try combining main + sub-question text
    if (bestScore < MATCH_THRESHOLD && excelQ.subQuestionText) {
      const combinedText = `${excelQ.questionText} ${excelQ.subQuestionText}`
      for (const dbQ of sectionQuestions) {
        const score = similarityScore(combinedText, dbQ.name)
        if (score > bestScore) {
          bestScore = score
          bestMatch = dbQ
          matchMethod = 'fuzzy-with-sub'
        }
      }
    }

    if (bestScore >= MATCH_THRESHOLD) {
      matches.push({
        excelQuestion: excelQ,
        dbQuestion: bestMatch,
        matchScore: bestScore,
        matchMethod
      })
    } else {
      unmatched.push(excelQ)
    }
  }

  console.log(`   ✓ Matched: ${matches.length} questions`)
  console.log(`   ⚠️  Unmatched: ${unmatched.length} questions`)

  // Show match statistics by method
  const exactMatches = matches.filter(m => m.matchScore > 0.95).length
  const fuzzyMatches = matches.filter(m => m.matchScore >= 0.6 && m.matchScore <= 0.95).length
  console.log(`      - Exact/Very High (>95%): ${exactMatches}`)
  console.log(`      - Fuzzy (60-95%): ${fuzzyMatches}`)

  // 5. Show unmatched questions
  if (unmatched.length > 0) {
    console.log('\n❓ Unmatched Questions:')
    unmatched.forEach(q => {
      console.log(`   - [${q.sheetName} Row ${q.rowNumber}] ${q.questionText.substring(0, 80)}...`)
      if (q.subQuestionText) {
        console.log(`     Sub: ${q.subQuestionText.substring(0, 70)}...`)
      }
    })
  }

  // 6. Show low-confidence matches for review
  const lowConfidence = matches.filter(m => m.matchScore >= 0.6 && m.matchScore < 0.75)
  if (lowConfidence.length > 0) {
    console.log('\n⚠️  Low Confidence Matches (60-75%):')
    lowConfidence.slice(0, 10).forEach(m => {
      console.log(`   - ${(m.matchScore * 100).toFixed(0)}% [${m.excelQuestion.sheetName}]`)
      console.log(`     Excel: ${m.excelQuestion.questionText.substring(0, 70)}...`)
      console.log(`     DB:    ${m.dbQuestion.name.substring(0, 70)}...`)
    })
    if (lowConfidence.length > 10) {
      console.log(`   ... and ${lowConfidence.length - 10} more`)
    }
  }

  console.log('\n✅ Analysis complete!')
  console.log(`   Match rate: ${((matches.length / allParsedQuestions.length) * 100).toFixed(1)}%`)

  // 7. Ask user if they want to proceed with import
  console.log('\n' + '='.repeat(80))
  console.log('📥 IMPORT PHASE')
  console.log('='.repeat(80))

  if (matches.length === 0) {
    console.log('❌ No matches found - cannot import. Exiting.')
    process.exit(0)
  }

  // For now, automatically proceed (later we can add user confirmation)
  console.log(`\n⚠️  About to import ${matches.length} answers to database`)
  console.log('   This will create/update:')
  console.log('   - Company record for "Kemira Oyj"')
  console.log('   - Sheet record for FennoCide BZ26')
  console.log(`   - ${matches.length} answer records`)

  // 8. Find or create company
  console.log('\n🏢 Finding/creating company...')

  const COMPANY_NAME = 'Kemira Oyj'
  let companyId: string

  const { data: existingCompany, error: companyFindError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', COMPANY_NAME)
    .single()

  if (companyFindError && companyFindError.code !== 'PGRST116') {
    console.error('   ❌ Failed to search for company:', companyFindError)
    process.exit(1)
  }

  if (existingCompany) {
    companyId = existingCompany.id
    console.log(`   ✓ Found existing company: ${existingCompany.name} (${companyId})`)
  } else {
    // Create new company
    const { data: newCompany, error: companyCreateError } = await supabase
      .from('companies')
      .insert({
        name: COMPANY_NAME,
        company_type: 'Supplier'
      })
      .select('id, name')
      .single()

    if (companyCreateError || !newCompany) {
      console.error('   ❌ Failed to create company:', companyCreateError)
      process.exit(1)
    }

    companyId = newCompany.id
    console.log(`   ✓ Created new company: ${newCompany.name} (${companyId})`)
  }

  // 9. Find or create sheet
  console.log('\n📄 Finding/creating sheet...')

  const SHEET_NAME = 'FennoCide BZ26 - P&P ViS HQ v2.1'
  let sheetId: string

  const { data: existingSheet, error: sheetFindError } = await supabase
    .from('sheets')
    .select('id, name')
    .eq('name', SHEET_NAME)
    .eq('assigned_to_company_id', companyId)
    .single()

  if (sheetFindError && sheetFindError.code !== 'PGRST116') {
    console.error('   ❌ Failed to search for sheet:', sheetFindError)
    process.exit(1)
  }

  if (existingSheet) {
    sheetId = existingSheet.id
    console.log(`   ✓ Found existing sheet: ${existingSheet.name} (${sheetId})`)
  } else {
    // Create new sheet
    const { data: newSheet, error: sheetCreateError } = await supabase
      .from('sheets')
      .insert({
        name: SHEET_NAME,
        assigned_to_company_id: companyId,
        new_status: 'In Progress'
      })
      .select('id, name')
      .single()

    if (sheetCreateError || !newSheet) {
      console.error('   ❌ Failed to create sheet:', sheetCreateError)
      process.exit(1)
    }

    sheetId = newSheet.id
    console.log(`   ✓ Created new sheet: ${newSheet.name} (${sheetId})`)
  }

  // 10. Link sheet to HQ2.1 tag
  console.log('\n🏷️  Linking sheet to HQ2.1 tag...')

  const { data: existingSheetTag, error: stFindError } = await supabase
    .from('sheet_tags')
    .select('sheet_id, tag_id')
    .eq('sheet_id', sheetId)
    .eq('tag_id', tag.id)
    .single()

  if (stFindError && stFindError.code !== 'PGRST116') {
    console.error('   ❌ Failed to search for sheet_tag:', stFindError)
    process.exit(1)
  }

  if (existingSheetTag) {
    console.log(`   ✓ Sheet already linked to HQ2.1 tag`)
  } else {
    const { error: stCreateError } = await supabase
      .from('sheet_tags')
      .insert({
        sheet_id: sheetId,
        tag_id: tag.id
      })

    if (stCreateError) {
      console.error('   ❌ Failed to link sheet to tag:', stCreateError)
      process.exit(1)
    }

    console.log(`   ✓ Linked sheet to HQ2.1 tag`)
  }

  // 11. Replace database choices with Excel values for dropdown questions
  console.log('\n🔄 Syncing dropdown choices from Excel to database...')

  const processedQuestions = new Set<string>()
  let choicesCreated = 0

  for (const match of matches) {
    const { excelQuestion, dbQuestion, confidence } = match

    // Only process dropdown questions with high confidence matches
    const isDropdown = dbQuestion.question_type === 'Select one Radio' ||
                       dbQuestion.question_type === 'Select one' ||
                       dbQuestion.question_type === 'Dropdown'

    if (isDropdown && excelQuestion.answerValue && !processedQuestions.has(dbQuestion.id)) {
      processedQuestions.add(dbQuestion.id)

      // Check if this choice exists
      const normalizedAnswer = excelQuestion.answerValue.toLowerCase().trim().replace(/[.\s]+$/, '')
      let questionChoices = choicesByQuestion.get(dbQuestion.id)

      if (!questionChoices) {
        questionChoices = new Map()
        choicesByQuestion.set(dbQuestion.id, questionChoices)
      }

      let choiceId = questionChoices.get(normalizedAnswer)

      if (!choiceId) {
        // Create new choice with exact Excel value
        const { data: newChoice, error: choiceError } = await supabase
          .from('choices')
          .insert({
            content: excelQuestion.answerValue,
            parent_question_id: dbQuestion.id
          })
          .select('id')
          .single()

        if (!choiceError && newChoice) {
          choiceId = newChoice.id
          questionChoices.set(normalizedAnswer, choiceId)
          choicesCreated++
        }
      }
    }
  }

  console.log(`   ✓ Created ${choicesCreated} new choices from Excel values`)

  // 12. Import answers
  console.log('\n💾 Importing answers (Excel overwrites database)...')

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const match of matches) {
    const { excelQuestion, dbQuestion } = match

    // Check if answer already exists
    const { data: existingAnswer, error: answerFindError } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', sheetId)
      .eq('parent_question_id', dbQuestion.id)
      .single()

    if (answerFindError && answerFindError.code !== 'PGRST116') {
      console.error(`   ❌ Error checking existing answer for question ${dbQuestion.id}:`, answerFindError)
      errors++
      continue
    }

    // Prepare answer data
    const answerData: any = {
      sheet_id: sheetId,
      parent_question_id: dbQuestion.id,
      text_value: excelQuestion.answerValue,
      custom_comment_text: excelQuestion.commentValue || null
    }

    // For dropdown questions, set the choice_id (should exist after sync step)
    const isDropdown = dbQuestion.question_type === 'Select one Radio' ||
                       dbQuestion.question_type === 'Select one' ||
                       dbQuestion.question_type === 'Dropdown'

    if (isDropdown && excelQuestion.answerValue) {
      const questionChoices = choicesByQuestion.get(dbQuestion.id)
      if (questionChoices) {
        const normalizedAnswer = excelQuestion.answerValue.toLowerCase().trim().replace(/[.\s]+$/, '')
        const choiceId = questionChoices.get(normalizedAnswer)

        if (choiceId) {
          answerData.choice_id = choiceId
        } else {
          console.log(`   ⚠️  Choice not found (should have been created in sync step)`)
          console.log(`      Question: ${dbQuestion.name?.substring(0, 60)}...`)
          console.log(`      Answer text: "${excelQuestion.answerValue}"`)
        }
      }
    }

    if (existingAnswer) {
      // Update existing answer
      const { error: updateError } = await supabase
        .from('answers')
        .update(answerData)
        .eq('id', existingAnswer.id)

      if (updateError) {
        console.error(`   ❌ Failed to update answer ${existingAnswer.id}:`, updateError)
        errors++
      } else {
        imported++
      }
    } else {
      // Insert new answer
      const { error: insertError } = await supabase
        .from('answers')
        .insert(answerData)

      if (insertError) {
        console.error(`   ❌ Failed to insert answer for question ${dbQuestion.id}:`, insertError)
        errors++
      } else {
        imported++
      }
    }
  }

  console.log(`   ✓ Imported: ${imported} answers`)
  if (skipped > 0) {
    console.log(`   ⚠️  Skipped: ${skipped} answers`)
  }
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors} answers`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ IMPORT COMPLETE!')
  console.log('='.repeat(80))
  console.log(`\n📊 Summary:`)
  console.log(`   Company: ${COMPANY_NAME} (${companyId})`)
  console.log(`   Sheet: ${SHEET_NAME} (${sheetId})`)
  console.log(`   Answers imported: ${imported} of ${matches.length} matched`)
  console.log(`   Match rate: ${((matches.length / allParsedQuestions.length) * 100).toFixed(1)}%`)
}

main().catch(console.error)
