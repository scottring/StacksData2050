import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'
import { randomUUID } from 'crypto'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExcelRow {
  id: string           // Column A - Bubble ID
  section: string      // Column B
  subsection: string   // Column C
  dependent: string    // Column D
  question: string     // Column E
  type: string         // Column F
  questionDisplay: string // Column G
  answer: string       // Column H - Primary answer
  answers: string[]    // Columns I-Q - Additional answers for list tables
  rowIndex: number     // Original row number for list table grouping
}

interface ImportResult {
  questionsMatched: number
  answersImported: number
  listTableRowsCreated: number
  errors: string[]
}

async function parseExcel(excelPath: string): Promise<ExcelRow[]> {
  const zip = new AdmZip(excelPath)

  // Get shared strings
  const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml')
  let sharedStrings: string[] = []
  if (sharedStringsEntry) {
    const sharedStringsXml = sharedStringsEntry.getData().toString('utf8')
    const parsed = await parseStringPromise(sharedStringsXml)
    if (parsed.sst && parsed.sst.si) {
      sharedStrings = parsed.sst.si.map((si: any) => {
        if (si.t) return String(si.t[0] || '')
        if (si.r) return si.r.map((r: any) => r.t ? String(r.t[0] || '') : '').join('')
        return ''
      })
    }
  }

  // Find STACKS TAB 2023
  const workbookEntry = zip.getEntry('xl/workbook.xml')
  if (!workbookEntry) throw new Error('No workbook.xml found')
  const workbookXml = workbookEntry.getData().toString('utf8')
  const workbook = await parseStringPromise(workbookXml)

  const sheets = workbook.workbook.sheets[0].sheet
  let stacksTabIndex = -1
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].$.name === 'STACKS TAB 2023') {
      stacksTabIndex = i + 1
      break
    }
  }

  if (stacksTabIndex === -1) throw new Error('STACKS TAB 2023 not found')

  const sheetEntry = zip.getEntry(`xl/worksheets/sheet${stacksTabIndex}.xml`)
  if (!sheetEntry) throw new Error(`Sheet ${stacksTabIndex} not found`)
  const sheetXml = sheetEntry.getData().toString('utf8')
  const sheet = await parseStringPromise(sheetXml)

  const rows: ExcelRow[] = []
  const sheetData = sheet.worksheet.sheetData[0].row

  const getCellValue = (cell: any): string => {
    if (!cell || !cell.v) return ''
    const value = cell.v[0]
    if (cell.$.t === 's') {
      return sharedStrings[parseInt(value)] || ''
    }
    return String(value)
  }

  const getColumnIndex = (ref: string): number => {
    const match = ref.match(/^([A-Z]+)/)
    if (!match) return -1
    const col = match[1]
    let index = 0
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 64)
    }
    return index - 1
  }

  // Parse rows (skip header)
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i]
    if (!row.c) continue

    const cells: { [key: number]: string } = {}
    for (const cell of row.c) {
      const colIndex = getColumnIndex(cell.$.r)
      cells[colIndex] = getCellValue(cell)
    }

    const id = cells[0] || ''
    if (!id) continue

    // Collect additional answers from columns I-Q (indices 8-16)
    const additionalAnswers: string[] = []
    for (let col = 8; col <= 16; col++) {
      if (cells[col]) {
        additionalAnswers.push(cells[col])
      }
    }

    rows.push({
      id,
      section: cells[1] || '',
      subsection: cells[2] || '',
      dependent: cells[3] || '',
      question: cells[4] || '',
      type: cells[5] || '',
      questionDisplay: cells[6] || '',
      answer: cells[7] || '',
      answers: additionalAnswers,
      rowIndex: i
    })
  }

  return rows
}

async function importExcel(excelPath: string, sheetId: string, dryRun: boolean = true): Promise<ImportResult> {
  const result: ImportResult = {
    questionsMatched: 0,
    answersImported: 0,
    listTableRowsCreated: 0,
    errors: []
  }

  console.log(`\n=== EXCEL IMPORT ${dryRun ? '(DRY RUN)' : ''} ===\n`)
  console.log(`Excel: ${excelPath}`)
  console.log(`Target Sheet ID: ${sheetId}\n`)

  // Verify sheet exists
  const { data: sheet, error: sheetError } = await supabase
    .from('sheets')
    .select('id, name, company_id')
    .eq('id', sheetId)
    .single()

  if (sheetError || !sheet) {
    result.errors.push(`Sheet not found: ${sheetId}`)
    return result
  }

  console.log(`Target sheet: ${sheet.name}\n`)

  // Parse Excel
  console.log('Parsing Excel...')
  const excelRows = await parseExcel(excelPath)
  console.log(`Found ${excelRows.length} rows\n`)

  // Build bubble_id to Supabase question mapping
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, name, question_type, list_table_id')

  const questionByBubbleId = new Map<string, any>()
  for (const q of questions || []) {
    if (q.bubble_id) {
      questionByBubbleId.set(q.bubble_id, q)
    }
  }

  // Get list table columns for questions that have them
  const { data: listTableColumns } = await supabase
    .from('list_table_columns')
    .select('id, parent_table_id, name, order_number, response_type')
    .order('order_number')

  const columnsByTableId = new Map<string, any[]>()
  for (const col of listTableColumns || []) {
    const cols = columnsByTableId.get(col.parent_table_id) || []
    cols.push(col)
    columnsByTableId.set(col.parent_table_id, cols)
  }

  // Get choices for dropdown questions
  const { data: choices } = await supabase
    .from('choices')
    .select('id, parent_question_id, content, import_map')

  const choicesByQuestionId = new Map<string, any[]>()
  for (const choice of choices || []) {
    const qChoices = choicesByQuestionId.get(choice.parent_question_id) || []
    qChoices.push(choice)
    choicesByQuestionId.set(choice.parent_question_id, qChoices)
  }

  // Group Excel rows by question ID (for list tables)
  const rowsByQuestionId = new Map<string, ExcelRow[]>()
  for (const row of excelRows) {
    const rows = rowsByQuestionId.get(row.id) || []
    rows.push(row)
    rowsByQuestionId.set(row.id, rows)
  }

  console.log(`Unique questions in Excel: ${rowsByQuestionId.size}`)
  console.log(`Questions in Supabase with bubble_id: ${questionByBubbleId.size}\n`)

  // Process each question
  const answersToInsert: any[] = []
  const listTableRowsToInsert: any[] = []

  // Helper to check if a value is a placeholder (should be skipped)
  const isPlaceholderValue = (val: string): boolean => {
    if (!val) return true
    const trimmed = val.trim()
    return trimmed === '' || trimmed === '0' || trimmed === 'N/A' || trimmed === 'n/a'
  }

  for (const [bubbleId, rows] of rowsByQuestionId.entries()) {
    const question = questionByBubbleId.get(bubbleId)

    if (!question) {
      // Not matched - skip silently (these are the 12 Excel-only items)
      continue
    }

    result.questionsMatched++
    const questionType = question.question_type?.toLowerCase() || ''
    const isListTable = questionType.includes('list') || questionType.includes('table') || rows.length > 1

    if (isListTable && rows.length > 1) {
      // List table question - create row for each Excel row
      const columns = question.list_table_id ? columnsByTableId.get(question.list_table_id) : []

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const excelRow = rows[rowIdx]

        // Skip rows with only placeholder values (0, empty, N/A)
        const hasRealAnswer = !isPlaceholderValue(excelRow.answer) ||
                              excelRow.answers.some(a => !isPlaceholderValue(a))
        if (!hasRealAnswer) {
          continue
        }

        const listTableRowId = randomUUID()

        // Create the list_table_rows record first
        listTableRowsToInsert.push({
          id: listTableRowId,
          row_id: rowIdx + 1,
          table_id: question.list_table_id,
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString()
        })

        result.listTableRowsCreated++

        // First column is the primary answer (skip placeholders)
        if (!isPlaceholderValue(excelRow.answer)) {
          answersToInsert.push({
            id: randomUUID(),
            sheet_id: sheetId,
            parent_question_id: question.id,
            text_value: excelRow.answer,
            list_table_row_id: listTableRowId,
            list_table_column_id: columns?.[0]?.id || null,
            company_id: sheet.company_id,
            created_at: new Date().toISOString()
          })
        }

        // Additional columns (skip placeholders)
        for (let colIdx = 0; colIdx < excelRow.answers.length; colIdx++) {
          const value = excelRow.answers[colIdx]
          if (isPlaceholderValue(value)) continue

          answersToInsert.push({
            id: randomUUID(),
            sheet_id: sheetId,
            parent_question_id: question.id,
            text_value: value,
            list_table_row_id: listTableRowId,
            list_table_column_id: columns?.[colIdx + 1]?.id || null,
            company_id: sheet.company_id,
            created_at: new Date().toISOString()
          })
        }
      }
    } else {
      // Single answer question
      const excelRow = rows[0]

      // Skip placeholder values globally
      if (isPlaceholderValue(excelRow.answer)) continue

      const answer: any = {
        id: randomUUID(),
        sheet_id: sheetId,
        parent_question_id: question.id,
        company_id: sheet.company_id,
        created_at: new Date().toISOString()
      }

      // Determine answer type based on question type
      if (questionType.includes('dropdown') || questionType.includes('select') || questionType.includes('radio')) {

        // Try to match choice
        const qChoices = choicesByQuestionId.get(question.id) || []
        const answerNormalized = excelRow.answer?.toLowerCase().replace(/[.,!?]$/g, '').trim()

        const matchedChoice = qChoices.find(c => {
          const contentNormalized = c.content?.toLowerCase().replace(/[.,!?]$/g, '').trim()
          const importMapNormalized = c.import_map?.toLowerCase().replace(/[.,!?]$/g, '').trim()

          return (
            c.content === excelRow.answer ||
            c.import_map === excelRow.answer ||
            contentNormalized === answerNormalized ||
            importMapNormalized === answerNormalized ||
            // Match "Yes" variations
            (answerNormalized?.startsWith('yes') && contentNormalized?.startsWith('yes')) ||
            // Match "No" variations
            (answerNormalized === 'no' && contentNormalized?.startsWith('no')) ||
            // Match "details provided" pattern
            (answerNormalized?.includes('details provided') && contentNormalized?.includes('details'))
          )
        })

        if (matchedChoice) {
          answer.choice_id = matchedChoice.id
        } else if (qChoices.length === 0) {
          // No choices exist for this question - store as text (likely missing choice migration)
          answer.text_value = excelRow.answer
        } else {
          // Choices exist but no match - store as text and warn
          answer.text_value = excelRow.answer
          result.errors.push(`No choice match for "${excelRow.answer}" on question ${question.name?.substring(0, 30)}`)
        }
      } else if (questionType.includes('number')) {
        const num = parseFloat(excelRow.answer)
        if (!isNaN(num)) {
          answer.number_value = num
        } else {
          answer.text_value = excelRow.answer
        }
      } else if (questionType.includes('boolean') || questionType.includes('yes/no')) {
        const lower = excelRow.answer.toLowerCase()
        if (lower === 'yes' || lower === 'true' || lower === '1') {
          answer.boolean_value = true
        } else if (lower === 'no' || lower === 'false' || lower === '0') {
          answer.boolean_value = false
        } else {
          answer.text_value = excelRow.answer
        }
      } else if (questionType.includes('date')) {
        // Try to parse as date
        const date = new Date(excelRow.answer)
        if (!isNaN(date.getTime())) {
          answer.date_value = date.toISOString()
        } else {
          answer.text_value = excelRow.answer
        }
      } else {
        // Default to text
        answer.text_value = excelRow.answer
      }

      answersToInsert.push(answer)
    }
  }

  result.answersImported = answersToInsert.length

  console.log('=== IMPORT SUMMARY ===\n')
  console.log(`Questions matched: ${result.questionsMatched}`)
  console.log(`Answers to import: ${result.answersImported}`)
  console.log(`List table rows: ${result.listTableRowsCreated}`)
  console.log(`Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    console.log('\nErrors (first 10):')
    result.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
  }

  if (!dryRun && answersToInsert.length > 0) {
    // First, insert list_table_rows
    if (listTableRowsToInsert.length > 0) {
      console.log(`\nInserting ${listTableRowsToInsert.length} list table rows...`)

      const batchSize = 100
      for (let i = 0; i < listTableRowsToInsert.length; i += batchSize) {
        const batch = listTableRowsToInsert.slice(i, i + batchSize)
        const { error } = await supabase.from('list_table_rows').insert(batch)

        if (error) {
          result.errors.push(`List table row insert error: ${error.message}`)
          console.log(`  Error: ${error.message}`)
        }
      }
      console.log('  List table rows inserted.')
    }

    console.log(`\nInserting ${answersToInsert.length} answers...`)

    // Insert answers in batches
    const batchSize = 100
    for (let i = 0; i < answersToInsert.length; i += batchSize) {
      const batch = answersToInsert.slice(i, i + batchSize)
      const { error } = await supabase.from('answers').insert(batch)

      if (error) {
        result.errors.push(`Insert error at batch ${i / batchSize}: ${error.message}`)
        console.log(`  Error at batch ${i / batchSize}: ${error.message}`)
      } else {
        process.stdout.write(`  Inserted ${Math.min(i + batchSize, answersToInsert.length)}/${answersToInsert.length}\r`)
      }
    }

    console.log('\nImport complete!')
  } else if (dryRun) {
    console.log('\n[DRY RUN - No data was written]')
    console.log('\nSample answers to import:')
    answersToInsert.slice(0, 5).forEach(a => {
      console.log(`  - Question: ${a.parent_question_id.substring(0, 8)}...`)
      console.log(`    Value: ${a.text_value || a.choice_id || a.number_value || a.boolean_value}`)
      if (a.list_table_row_id) console.log(`    List table row: ${a.list_table_row_id.substring(0, 8)}...`)
    })
  }

  return result
}

// Main execution
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log('Usage: npx tsx excel-import.ts <excel-path> <sheet-id> [--execute]')
  console.log('')
  console.log('Options:')
  console.log('  --execute    Actually import (default is dry run)')
  console.log('')
  console.log('Example:')
  console.log('  npx tsx excel-import.ts "/path/to/file.xlsx" "sheet-uuid-here"')
  process.exit(1)
}

const excelPath = args[0]
const sheetId = args[1]
const dryRun = !args.includes('--execute')

importExcel(excelPath, sheetId, dryRun).catch(console.error)
