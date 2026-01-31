import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Types
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
}

interface ParsedAnswer {
  bubbleId: string
  section: string
  subsection: string
  question: string
  type: string
  value: string | null
  additionalValues: string[]
}

interface MappedAnswer {
  bubbleId: string
  questionId: string | null
  questionText: string
  section: string
  subsection: string
  excelValue: string | null
  mappedValue: any
  valueType: 'text' | 'choice' | 'number' | 'boolean' | 'date' | 'list_table'
  choiceId?: string
  choiceText?: string
  isRequired: boolean
  hasIssue: boolean
  issueType?: string
  issueDetails?: string
}

interface ImportPreview {
  success: boolean
  fileName: string
  totalQuestions: number
  matchedQuestions: number
  answeredQuestions: number
  issueCount: number
  answers: MappedAnswer[]
  issues: Array<{
    type: string
    question: string
    excelValue: string | null
    details: string
  }>
}

// Load the formula map and cell lookup (embedded as static data)
// In production, these would be loaded from files or database
const FORMULA_MAP_URL = '/data/excel-formula-map.json'
const CELL_LOOKUP_URL = '/data/excel-cell-lookup.json'

// Helper: Check if value is a placeholder
function isPlaceholder(value: string | null): boolean {
  if (!value) return true
  const trimmed = value.trim().toLowerCase()
  return trimmed === '' || trimmed === '0' || trimmed === 'n/a' || trimmed === '-'
}

// Helper: Match Excel choice value to Supabase choice
function matchChoice(excelValue: string, choices: any[]): { choiceId: string; choiceText: string } | null {
  if (!excelValue || !choices?.length) return null
  
  const normalized = excelValue.toLowerCase().trim().replace(/[.,!?]$/g, '')
  
  for (const c of choices) {
    const contentNorm = c.content?.toLowerCase().trim().replace(/[.,!?]$/g, '')
    
    if (c.content === excelValue) {
      return { choiceId: c.id, choiceText: c.content }
    }
    if (contentNorm === normalized) {
      return { choiceId: c.id, choiceText: c.content }
    }
    if (normalized.startsWith('yes') && contentNorm?.startsWith('yes')) {
      return { choiceId: c.id, choiceText: c.content }
    }
    if (normalized === 'no' && contentNorm?.startsWith('no')) {
      return { choiceId: c.id, choiceText: c.content }
    }
    if (normalized.includes(contentNorm) || contentNorm?.includes(normalized)) {
      return { choiceId: c.id, choiceText: c.content }
    }
  }
  
  return null
}

interface ParseResult {
  answers: ParsedAnswer[]
  debug: {
    workbookSheets: string[]
    sheetNameMapping: Record<string, string>
    cellsChecked: number
    valuesFound: number
    sampleValues: Array<{ question: string; value: string | null }>
    cellLookupCount: number
    formulaMapCount: number
  }
}

// Parse Excel using formula map
function parseExcelWithMap(
  workbook: XLSX.WorkBook,
  cellLookup: Record<string, CellLookup>,
  formulaMap: QuestionMapping[]
): ParseResult {
  const answers: ParsedAnswer[] = []

  // Get all sheet names from the workbook for flexible matching
  const workbookSheets = workbook.SheetNames
  console.log('Workbook sheet names:', workbookSheets)

  // Build a map from expected sheet names to actual sheet names
  const sheetNameMap = new Map<string, string>()
  const expectedSheets = ['Supplier Product Contact', 'Ecolabels', 'Biocides', 'Food Contact', 'PIDSL', 'Additional Requirements']

  for (const expected of expectedSheets) {
    // Try exact match first
    if (workbookSheets.includes(expected)) {
      sheetNameMap.set(expected, expected)
      continue
    }

    // Try case-insensitive match
    const lowerExpected = expected.toLowerCase()
    for (const actual of workbookSheets) {
      if (actual.toLowerCase() === lowerExpected) {
        sheetNameMap.set(expected, actual)
        break
      }
      // Try partial match (e.g., "HQ 2.1 - Food Contact" contains "Food Contact")
      if (actual.toLowerCase().includes(lowerExpected)) {
        sheetNameMap.set(expected, actual)
        break
      }
    }
  }

  console.log('Sheet name mapping:', Object.fromEntries(sheetNameMap))

  function readCell(sheetName: string, cellRef: string): string | null {
    const normalizedName = sheetName.replace(/^'|'$/g, '')
    // Use mapped sheet name if available
    const actualSheetName = sheetNameMap.get(normalizedName) || normalizedName
    const ws = workbook.Sheets[actualSheetName]
    if (!ws) {
      return null
    }

    const cell = ws[cellRef]
    if (!cell) return null

    // Try to get the formatted value (w) first, then raw value (v)
    // This handles formulas better
    if (cell.w !== undefined) return String(cell.w)
    if (cell.v !== undefined) return String(cell.v)
    return null
  }

  let valuesFound = 0
  let cellsChecked = 0

  for (const q of formulaMap) {
    const lookup = cellLookup[q.bubbleId]

    let value: string | null = null
    let additionalValues: string[] = []

    if (lookup) {
      cellsChecked++
      value = readCell(lookup.sheet, lookup.cell)
      if (value) valuesFound++

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
      additionalValues
    })
  }

  console.log(`Cells checked: ${cellsChecked}, Values found: ${valuesFound}`)

  // Collect sample values found for debugging
  const sampleValues = answers
    .filter(a => a.value !== null)
    .slice(0, 10)
    .map(a => ({ question: a.question.substring(0, 40), value: a.value }))

  return {
    answers,
    debug: {
      workbookSheets,
      sheetNameMapping: Object.fromEntries(sheetNameMap),
      cellsChecked,
      valuesFound,
      sampleValues,
      cellLookupCount: Object.keys(cellLookup).length,
      formulaMapCount: formulaMap.length
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Read directly from buffer (no temp file needed)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Load formula map and cell lookup
    // For now, read from the stacks directory - in production would be bundled
    const stacksDir = process.env.STACKS_DIR || '/Users/scottkaufman/Developer/StacksData2050/stacks'
    const formulaMap: QuestionMapping[] = JSON.parse(
      fs.readFileSync(path.join(stacksDir, 'excel-formula-map.json'), 'utf-8')
    )
    const cellLookup: Record<string, CellLookup> = JSON.parse(
      fs.readFileSync(path.join(stacksDir, 'excel-cell-lookup.json'), 'utf-8')
    )
    
    // Parse Excel
    const parseResult = parseExcelWithMap(workbook, cellLookup, formulaMap)
    const parsedAnswers = parseResult.answers
    const debug = parseResult.debug
    
    // Load Supabase data for mapping
    const supabase = await createClient()
    
    const { data: questions } = await supabase
      .from('questions')
      .select('id, bubble_id, content, response_type, required')
    
    const { data: choices } = await supabase
      .from('choices')
      .select('id, question_id, content')
    
    // Build lookup maps
    const questionByBubbleId = new Map<string, any>()
    for (const q of questions || []) {
      if (q.bubble_id) {
        questionByBubbleId.set(q.bubble_id, q)
      }
    }
    
    const choicesByQuestionId = new Map<string, any[]>()
    for (const c of choices || []) {
      if (c.question_id) {
        const arr = choicesByQuestionId.get(c.question_id) || []
        arr.push(c)
        choicesByQuestionId.set(c.question_id, arr)
      }
    }
    
    // Map answers
    const mappedAnswers: MappedAnswer[] = []
    const issues: ImportPreview['issues'] = []
    let matchedCount = 0
    
    for (const answer of parsedAnswers) {
      const question = questionByBubbleId.get(answer.bubbleId)
      
      if (!question) {
        if (answer.value && !isPlaceholder(answer.value)) {
          issues.push({
            type: 'no_question_match',
            question: answer.question,
            excelValue: answer.value,
            details: 'Question not found in database'
          })
        }
        continue
      }
      
      matchedCount++
      const qChoices = choicesByQuestionId.get(question.id) || []
      const responseType = question.response_type?.toLowerCase() || ''
      
      const mapped: MappedAnswer = {
        bubbleId: answer.bubbleId,
        questionId: question.id,
        questionText: question.content || answer.question,
        section: answer.section,
        subsection: answer.subsection,
        excelValue: answer.value,
        mappedValue: null,
        valueType: 'text',
        isRequired: question.required || false,
        hasIssue: false
      }
      
      if (isPlaceholder(answer.value)) {
        if (question.required) {
          mapped.hasIssue = true
          mapped.issueType = 'missing_required'
          mapped.issueDetails = 'Required question has no answer'
          issues.push({
            type: 'missing_required',
            question: question.content,
            excelValue: answer.value,
            details: 'Required question has no answer'
          })
        }
        mappedAnswers.push(mapped)
        continue
      }
      
      // Map based on type
      const isChoiceType = responseType.includes('dropdown') || 
                           responseType.includes('select') || 
                           responseType.includes('radio')
      
      if (isChoiceType) {
        mapped.valueType = 'choice'
        const match = matchChoice(answer.value!, qChoices)
        
        if (match) {
          mapped.choiceId = match.choiceId
          mapped.choiceText = match.choiceText
          mapped.mappedValue = match.choiceId
        } else if (qChoices.length > 0) {
          mapped.hasIssue = true
          mapped.mappedValue = answer.value
          mapped.issueType = 'choice_mismatch'
          mapped.issueDetails = `Available: ${qChoices.map(c => c.content).slice(0, 3).join(', ')}...`
          issues.push({
            type: 'choice_mismatch',
            question: question.content,
            excelValue: answer.value,
            details: mapped.issueDetails
          })
        } else {
          mapped.valueType = 'text'
          mapped.mappedValue = answer.value
        }
      } else if (responseType.includes('number')) {
        mapped.valueType = 'number'
        const num = parseFloat(answer.value!)
        mapped.mappedValue = isNaN(num) ? answer.value : num
      } else {
        mapped.valueType = 'text'
        mapped.mappedValue = answer.value
      }
      
      mappedAnswers.push(mapped)
    }
    
    const answeredCount = mappedAnswers.filter(a => 
      a.mappedValue !== null && !isPlaceholder(a.excelValue)
    ).length
    
    const preview = {
      success: true,
      fileName: file.name,
      totalQuestions: parsedAnswers.length,
      matchedQuestions: matchedCount,
      answeredQuestions: answeredCount,
      issueCount: issues.length,
      answers: mappedAnswers,
      issues,
      debug
    }

    return NextResponse.json(preview)
    
  } catch (error: any) {
    console.error('Excel import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process Excel file' },
      { status: 500 }
    )
  }
}
