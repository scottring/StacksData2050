import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXCEL_PATH = '/Users/scottkaufman/Dropbox/02. Stacks Data Master Folder/200.Stacks Data/40-49 Software Development/41 Testing/41.01 Excel Upload/2023 Excel upload/20230113 FennoCide BZ26 - P&P ViS HQ v2.1.xlsx'

interface ExcelRow {
  id: string
  section: string
  subsection: string
  dependent: string
  question: string
  type: string
  questionDisplay: string
  answer: string
}

async function parseExcelStacksTab(): Promise<ExcelRow[]> {
  const zip = new AdmZip(EXCEL_PATH)

  // Get shared strings (for cell text values)
  const sharedStringsEntry = zip.getEntry('xl/sharedStrings.xml')
  let sharedStrings: string[] = []
  if (sharedStringsEntry) {
    const sharedStringsXml = sharedStringsEntry.getData().toString('utf8')
    const parsed = await parseStringPromise(sharedStringsXml)
    if (parsed.sst && parsed.sst.si) {
      sharedStrings = parsed.sst.si.map((si: any) => {
        if (si.t) return si.t[0]
        if (si.r) return si.r.map((r: any) => r.t ? r.t[0] : '').join('')
        return ''
      })
    }
  }

  // Find STACKS TAB 2023 sheet
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

  // Parse the sheet
  const sheetEntry = zip.getEntry(`xl/worksheets/sheet${stacksTabIndex}.xml`)
  if (!sheetEntry) throw new Error(`Sheet ${stacksTabIndex} not found`)
  const sheetXml = sheetEntry.getData().toString('utf8')
  const sheet = await parseStringPromise(sheetXml)

  const rows: ExcelRow[] = []
  const sheetData = sheet.worksheet.sheetData[0].row

  // Helper to get cell value
  const getCellValue = (cell: any): string => {
    if (!cell || !cell.v) return ''
    const value = cell.v[0]
    if (cell.$.t === 's') {
      // Shared string reference
      return sharedStrings[parseInt(value)] || ''
    }
    return value.toString()
  }

  // Helper to parse cell reference (e.g., "A1" -> column index)
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

  // Skip header row, parse data rows
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i]
    if (!row.c) continue

    const cells: { [key: number]: string } = {}
    for (const cell of row.c) {
      const colIndex = getColumnIndex(cell.$.r)
      cells[colIndex] = getCellValue(cell)
    }

    const id = cells[0] || ''
    if (!id) continue // Skip rows without ID

    rows.push({
      id: id,
      section: cells[1] || '',
      subsection: cells[2] || '',
      dependent: cells[3] || '',
      question: cells[4] || '',
      type: cells[5] || '',
      questionDisplay: cells[6] || '',
      answer: cells[7] || ''
    })
  }

  return rows
}

async function reconcile() {
  console.log('=== EXCEL ↔ SUPABASE RECONCILIATION ===\n')

  // Parse Excel
  console.log('Parsing Excel STACKS TAB 2023...')
  const excelRows = await parseExcelStacksTab()
  console.log(`Found ${excelRows.length} rows in Excel\n`)

  // Get unique IDs and count occurrences
  const idCounts = new Map<string, number>()
  const idToRows = new Map<string, ExcelRow[]>()

  for (const row of excelRows) {
    const count = idCounts.get(row.id) || 0
    idCounts.set(row.id, count + 1)

    const rows = idToRows.get(row.id) || []
    rows.push(row)
    idToRows.set(row.id, rows)
  }

  const uniqueIds = [...idCounts.keys()]
  console.log(`Unique Excel IDs: ${uniqueIds.length}`)

  // Find IDs that appear multiple times (list table placeholders)
  const multiRowIds = [...idCounts.entries()].filter(([, count]) => count > 1)
  console.log(`IDs appearing multiple times (list tables): ${multiRowIds.length}`)

  // Get Supabase questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      id,
      bubble_id,
      name,
      content,
      question_type,
      section_name_sort,
      subsection_name_sort,
      sections!questions_parent_section_id_fkey (name),
      subsections!questions_parent_subsection_id_fkey (name)
    `)

  if (error) {
    console.error('Error fetching questions:', error)
    return
  }

  console.log(`Supabase questions: ${questions?.length || 0}\n`)

  // Create bubble_id lookup
  const supabaseByBubbleId = new Map<string, any>()
  const questionsWithoutBubbleId: any[] = []

  for (const q of questions || []) {
    if (q.bubble_id) {
      supabaseByBubbleId.set(q.bubble_id, q)
    } else {
      questionsWithoutBubbleId.push(q)
    }
  }

  // Match Excel IDs to Supabase
  const matched: { excelId: string; supabaseId: string; excelQuestion: string; supabaseQuestion: string; rowCount: number }[] = []
  const excelOnly: { id: string; section: string; question: string; rowCount: number; type: string }[] = []

  for (const [id, rows] of idToRows.entries()) {
    const supabaseQ = supabaseByBubbleId.get(id)
    const excelQuestion = String(rows[0].question || '').substring(0, 50)
    if (supabaseQ) {
      matched.push({
        excelId: id,
        supabaseId: supabaseQ.id,
        excelQuestion: excelQuestion,
        supabaseQuestion: String(supabaseQ.name || supabaseQ.content || '').substring(0, 50),
        rowCount: rows.length
      })
    } else {
      excelOnly.push({
        id: id,
        section: String(rows[0].section || ''),
        question: String(rows[0].question || '').substring(0, 60),
        rowCount: rows.length,
        type: String(rows[0].type || '')
      })
    }
  }

  // Find Supabase questions not in Excel
  const supabaseOnly: any[] = []
  for (const q of questions || []) {
    if (q.bubble_id && !idToRows.has(q.bubble_id)) {
      supabaseOnly.push(q)
    }
  }

  // Report
  console.log('=== MATCH SUMMARY ===\n')
  console.log(`Matched (Excel ID = Supabase bubble_id): ${matched.length}`)
  console.log(`Excel only (no Supabase match): ${excelOnly.length}`)
  console.log(`Supabase only (no Excel match): ${supabaseOnly.length}`)
  console.log(`Supabase questions without bubble_id: ${questionsWithoutBubbleId.length}`)

  // List table analysis
  console.log('\n=== LIST TABLE ANALYSIS ===\n')
  const listTables = matched.filter(m => m.rowCount > 1).sort((a, b) => b.rowCount - a.rowCount)
  console.log(`Questions with multiple rows (list tables): ${listTables.length}`)
  console.log('\nTop list tables by placeholder row count:')
  listTables.slice(0, 15).forEach(lt => {
    console.log(`  ${lt.rowCount} rows: "${lt.excelQuestion || '(no question text)'}..."`)
  })

  // Excel-only items
  if (excelOnly.length > 0) {
    console.log('\n=== EXCEL-ONLY ITEMS (not in Supabase) ===\n')
    const bySection = new Map<string, typeof excelOnly>()
    for (const item of excelOnly) {
      const section = item.section || 'Unknown'
      const items = bySection.get(section) || []
      items.push(item)
      bySection.set(section, items)
    }

    for (const [section, items] of bySection.entries()) {
      console.log(`\n${section} (${items.length} items):`)
      items.slice(0, 5).forEach(item => {
        console.log(`  - [${item.type || 'unknown'}] ${item.question || '(no text)'}...`)
        if (item.rowCount > 1) console.log(`    (${item.rowCount} rows - list table)`)
      })
      if (items.length > 5) console.log(`  ... and ${items.length - 5} more`)
    }
  }

  // Supabase-only items
  if (supabaseOnly.length > 0) {
    console.log('\n=== SUPABASE-ONLY QUESTIONS (added after Excel) ===\n')

    // Group by section
    const bySection = new Map<string, any[]>()
    for (const q of supabaseOnly) {
      const sectionName = (q.sections as any)?.name || 'Unknown section'
      const items = bySection.get(sectionName) || []
      items.push(q)
      bySection.set(sectionName, items)
    }

    for (const [section, items] of bySection.entries()) {
      console.log(`\n${section} (${items.length} questions):`)
      items.slice(0, 8).forEach(q => {
        const questionText = String(q.name || q.content || '(no text)').substring(0, 70)
        const subsectionName = q.subsection_name_sort || (q.subsections as any)?.name || ''
        const prefix = subsectionName ? `[${subsectionName}] ` : ''
        console.log(`  - ${prefix}${questionText}...`)
        console.log(`    bubble_id: ${q.bubble_id}, type: ${q.question_type || 'unknown'}`)
      })
      if (items.length > 8) console.log(`  ... and ${items.length - 8} more`)
    }
  }

  // Section breakdown of matches
  console.log('\n=== MATCHED BY SECTION ===\n')
  const matchedBySection = new Map<string, number>()
  for (const m of matched) {
    const q = supabaseByBubbleId.get(m.excelId)
    const section = q?.sections?.name || 'Unknown'
    matchedBySection.set(section, (matchedBySection.get(section) || 0) + 1)
  }

  for (const [section, count] of matchedBySection.entries()) {
    console.log(`  ${section}: ${count} questions matched`)
  }

  // Summary stats
  console.log('\n=== FINAL STATISTICS ===\n')
  const totalPlaceholderRows = matched.reduce((sum, m) => sum + (m.rowCount > 1 ? m.rowCount - 1 : 0), 0)
  console.log(`Total Excel rows: ${excelRows.length}`)
  console.log(`Unique question IDs: ${uniqueIds.length}`)
  console.log(`List table placeholder rows: ${totalPlaceholderRows}`)
  console.log(`Actual questions: ${uniqueIds.length} (${matched.length} matched + ${excelOnly.length} Excel-only)`)
  console.log(`Match rate: ${((matched.length / uniqueIds.length) * 100).toFixed(1)}%`)
}

reconcile().catch(console.error)
