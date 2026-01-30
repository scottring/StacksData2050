import XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load the cell lookup map (generated from template)
const LOOKUP_MAP_PATH = path.join(__dirname, '..', 'excel-cell-lookup.json')
const FORMULA_MAP_PATH = path.join(__dirname, '..', 'excel-formula-map.json')

interface CellLookup {
  sheet: string
  cell: string
  additionalCells: Array<{ sheet: string; cell: string }>
}

interface QuestionMapping {
  bubbleId: string
  section: string
  subsection: string
  question: string
  type: string
  answerFormula: string | null
  answerSheet: string | null
  answerCell: string | null
  additionalFormulas: string[]
}

export interface ParsedAnswer {
  bubbleId: string
  section: string
  subsection: string
  question: string
  type: string
  value: string | null
  additionalValues: string[]
  source: 'stacks_tab' | 'human_tab'
  sourceSheet?: string
  sourceCell?: string
}

export interface ParseResult {
  success: boolean
  answers: ParsedAnswer[]
  warnings: string[]
  errors: string[]
  metadata: {
    fileName: string
    hasStacksTab: boolean
    sheetNames: string[]
    totalQuestions: number
    answeredQuestions: number
  }
}

export function loadLookupMaps(): { cellLookup: Record<string, CellLookup>; formulaMap: QuestionMapping[] } {
  const cellLookup = JSON.parse(fs.readFileSync(LOOKUP_MAP_PATH, 'utf-8'))
  const formulaMap = JSON.parse(fs.readFileSync(FORMULA_MAP_PATH, 'utf-8'))
  return { cellLookup, formulaMap }
}

export function parseExcelWorkbook(filePath: string): ParseResult {
  const result: ParseResult = {
    success: false,
    answers: [],
    warnings: [],
    errors: [],
    metadata: {
      fileName: path.basename(filePath),
      hasStacksTab: false,
      sheetNames: [],
      totalQuestions: 0,
      answeredQuestions: 0
    }
  }

  try {
    const { cellLookup, formulaMap } = loadLookupMaps()
    const wb = XLSX.readFile(filePath)
    
    result.metadata.sheetNames = wb.SheetNames
    result.metadata.hasStacksTab = wb.SheetNames.includes('STACKS TAB 2023')
    
    // Always use the formula map to read from human tabs
    // Even files with STACKS TAB have stale cached values (all 0s)
    // unless someone opened them in Excel to evaluate formulas
    result.answers = parseFromHumanTabs(wb, cellLookup, formulaMap)
    
    result.metadata.totalQuestions = result.answers.length
    result.metadata.answeredQuestions = result.answers.filter(a => a.value && a.value.trim() !== '').length
    result.success = true
    
  } catch (error: any) {
    result.errors.push(error.message)
  }
  
  return result
}

function parseFromStacksTab(wb: XLSX.WorkBook, formulaMap: QuestionMapping[]): ParsedAnswer[] {
  const ws = wb.Sheets['STACKS TAB 2023']
  const answers: ParsedAnswer[] = []
  
  // Build a map from bubble ID to row in the sheet
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Q1')
  const rowByBubbleId = new Map<string, number>()
  
  for (let row = 2; row <= range.e.r + 1; row++) {
    const cell = ws['A' + row]
    if (cell?.v) {
      rowByBubbleId.set(String(cell.v), row)
    }
  }
  
  // Parse each question from formula map
  for (const q of formulaMap) {
    const row = rowByBubbleId.get(q.bubbleId)
    if (!row) continue
    
    // Get main answer from column H
    const valueCell = ws['H' + row]
    const value = valueCell?.v !== undefined ? String(valueCell.v) : null
    
    // Get additional values from columns I-Q
    const additionalValues: string[] = []
    const cols = 'IJKLMNOPQ'.split('')
    for (const col of cols) {
      const cell = ws[col + row]
      if (cell?.v !== undefined) {
        additionalValues.push(String(cell.v))
      }
    }
    
    answers.push({
      bubbleId: q.bubbleId,
      section: q.section,
      subsection: q.subsection,
      question: q.question,
      type: q.type,
      value,
      additionalValues,
      source: 'stacks_tab'
    })
  }
  
  return answers
}

function parseFromHumanTabs(
  wb: XLSX.WorkBook, 
  cellLookup: Record<string, CellLookup>,
  formulaMap: QuestionMapping[]
): ParsedAnswer[] {
  const answers: ParsedAnswer[] = []
  
  // Helper to read a cell value from a sheet
  function readCell(sheetName: string, cellRef: string): string | null {
    // Normalize sheet name (some have quotes in formulas)
    const normalizedName = sheetName.replace(/^'|'$/g, '')
    const ws = wb.Sheets[normalizedName]
    if (!ws) return null
    
    const cell = ws[cellRef]
    if (!cell || cell.v === undefined) return null
    return String(cell.v)
  }
  
  // Parse each question using the lookup map
  for (const q of formulaMap) {
    const lookup = cellLookup[q.bubbleId]
    
    let value: string | null = null
    let additionalValues: string[] = []
    let sourceSheet: string | undefined
    let sourceCell: string | undefined
    
    if (lookup) {
      // We have a direct cell reference
      value = readCell(lookup.sheet, lookup.cell)
      sourceSheet = lookup.sheet
      sourceCell = lookup.cell
      
      // Read additional cells for list tables
      additionalValues = lookup.additionalCells
        .map(c => readCell(c.sheet, c.cell))
        .filter((v): v is string => v !== null)
    }
    
    answers.push({
      bubbleId: q.bubbleId,
      section: q.section,
      subsection: q.subsection,
      question: q.question,
      type: q.type,
      value,
      additionalValues,
      source: 'human_tab',
      sourceSheet,
      sourceCell
    })
  }
  
  return answers
}

// CLI for testing
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule || process.argv[1]?.endsWith('excel-parser.ts')) {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.log('Usage: npx tsx lib/excel-parser.ts <excel-path>')
    process.exit(1)
  }
  
  const result = parseExcelWorkbook(args[0])
  
  console.log('=== PARSE RESULT ===')
  console.log('Success:', result.success)
  console.log('Has STACKS TAB:', result.metadata.hasStacksTab)
  console.log('Total questions:', result.metadata.totalQuestions)
  console.log('Answered:', result.metadata.answeredQuestions)
  
  if (result.errors.length > 0) {
    console.log('\nErrors:', result.errors)
  }
  
  console.log('\n=== SAMPLE ANSWERS (first 10 with values) ===')
  result.answers
    .filter(a => a.value)
    .slice(0, 10)
    .forEach(a => {
      console.log(`[${a.source}] ${a.section} / ${a.question.substring(0, 50)}`)
      console.log(`  Value: ${a.value}`)
      if (a.sourceSheet) console.log(`  From: ${a.sourceSheet}!${a.sourceCell}`)
    })
}
