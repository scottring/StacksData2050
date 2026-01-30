import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

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

// Parse Excel using formula map
function parseExcelWithMap(
  workbook: XLSX.WorkBook, 
  cellLookup: Record<string, CellLookup>,
  formulaMap: QuestionMapping[]
): ParsedAnswer[] {
  const answers: ParsedAnswer[] = []
  
  function readCell(sheetName: string, cellRef: string): string | null {
    const normalizedName = sheetName.replace(/^'|'$/g, '')
    const ws = workbook.Sheets[normalizedName]
    if (!ws) return null
    
    const cell = ws[cellRef]
    if (!cell || cell.v === undefined) return null
    return String(cell.v)
  }
  
  for (const q of formulaMap) {
    const lookup = cellLookup[q.bubbleId]
    
    let value: string | null = null
    let additionalValues: string[] = []
    
    if (lookup) {
      value = readCell(lookup.sheet, lookup.cell)
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
  
  return answers
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Save file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.xlsx`)
    fs.writeFileSync(tempPath, buffer)
    
    // Read Excel
    const workbook = XLSX.readFile(tempPath)
    
    // Clean up temp file
    fs.unlinkSync(tempPath)
    
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
    const parsedAnswers = parseExcelWithMap(workbook, cellLookup, formulaMap)
    
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
    
    const preview: ImportPreview = {
      success: true,
      fileName: file.name,
      totalQuestions: parsedAnswers.length,
      matchedQuestions: matchedCount,
      answeredQuestions: answeredCount,
      issueCount: issues.length,
      answers: mappedAnswers,
      issues
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
