import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseExcelWorkbook, ParsedAnswer, ParseResult } from './excel-parser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Types for import
interface ImportIssue {
  type: 'choice_mismatch' | 'missing_required' | 'no_question_match' | 'suspicious_value'
  bubbleId: string
  question: string
  excelValue: string | null
  details: string
  suggestedFix?: string
}

interface MappedAnswer {
  bubbleId: string
  questionId: string | null
  questionText: string
  section: string
  subsection: string
  excelValue: string | null
  mappedValue: any  // The value to insert (may be transformed)
  valueType: 'text' | 'choice' | 'number' | 'boolean' | 'date' | 'list_table'
  choiceId?: string
  choiceText?: string
  isRequired: boolean
  hasIssue: boolean
  issue?: ImportIssue
}

interface ImportPreview {
  success: boolean
  fileName: string
  totalQuestions: number
  matchedQuestions: number
  answeredQuestions: number
  issueCount: number
  answers: MappedAnswer[]
  issues: ImportIssue[]
  readyToImport: boolean
}

interface ImportResult {
  success: boolean
  answersCreated: number
  listTableRowsCreated: number
  errors: string[]
}

// Load Supabase mappings
async function loadSupabaseMappings() {
  // Load questions with bubble_id
  const { data: questions } = await supabase
    .from('questions')
    .select('id, bubble_id, content, response_type, required')
  
  // Load choices
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
  
  return { questionByBubbleId, choicesByQuestionId }
}

// Match Excel choice value to Supabase choice
function matchChoice(excelValue: string, choices: any[]): { choiceId: string; choiceText: string } | null {
  if (!excelValue || !choices?.length) return null
  
  const normalized = excelValue.toLowerCase().trim().replace(/[.,!?]$/g, '')
  
  for (const c of choices) {
    const contentNorm = c.content?.toLowerCase().trim().replace(/[.,!?]$/g, '')
    
    // Exact match
    if (c.content === excelValue) {
      return { choiceId: c.id, choiceText: c.content }
    }
    // Normalized match
    if (contentNorm === normalized) {
      return { choiceId: c.id, choiceText: c.content }
    }
    // Fuzzy match for Yes/No variations
    if (normalized.startsWith('yes') && contentNorm?.startsWith('yes')) {
      return { choiceId: c.id, choiceText: c.content }
    }
    if (normalized === 'no' && contentNorm?.startsWith('no')) {
      return { choiceId: c.id, choiceText: c.content }
    }
    // Partial match - if Excel value contains the choice content or vice versa
    if (normalized.includes(contentNorm) || contentNorm?.includes(normalized)) {
      return { choiceId: c.id, choiceText: c.content }
    }
  }
  
  return null
}

// Check if value is a placeholder that should be skipped
function isPlaceholder(value: string | null): boolean {
  if (!value) return true
  const trimmed = value.trim().toLowerCase()
  return trimmed === '' || trimmed === '0' || trimmed === 'n/a' || trimmed === '-'
}

// Create import preview (for review screen)
export async function createImportPreview(excelPath: string): Promise<ImportPreview> {
  const parseResult = parseExcelWorkbook(excelPath)
  
  if (!parseResult.success) {
    return {
      success: false,
      fileName: parseResult.metadata.fileName,
      totalQuestions: 0,
      matchedQuestions: 0,
      answeredQuestions: 0,
      issueCount: parseResult.errors.length,
      answers: [],
      issues: [],
      readyToImport: false
    }
  }
  
  const { questionByBubbleId, choicesByQuestionId } = await loadSupabaseMappings()
  
  const mappedAnswers: MappedAnswer[] = []
  const issues: ImportIssue[] = []
  let matchedCount = 0
  
  for (const answer of parseResult.answers) {
    const question = questionByBubbleId.get(answer.bubbleId)
    
    if (!question) {
      // Question not found in Supabase
      if (answer.value && !isPlaceholder(answer.value)) {
        issues.push({
          type: 'no_question_match',
          bubbleId: answer.bubbleId,
          question: answer.question,
          excelValue: answer.value,
          details: 'Question not found in database (may be deprecated)'
        })
      }
      continue
    }
    
    matchedCount++
    const choices = choicesByQuestionId.get(question.id) || []
    const responseType = question.response_type?.toLowerCase() || ''
    
    let mappedAnswer: MappedAnswer = {
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
    
    // Skip placeholders
    if (isPlaceholder(answer.value)) {
      if (question.required) {
        mappedAnswer.hasIssue = true
        mappedAnswer.issue = {
          type: 'missing_required',
          bubbleId: answer.bubbleId,
          question: question.content,
          excelValue: answer.value,
          details: 'Required question has no answer'
        }
        issues.push(mappedAnswer.issue)
      }
      mappedAnswers.push(mappedAnswer)
      continue
    }
    
    // Map based on question type
    // Response types in Supabase: "Select one Radio", "Dropdown", "Select one", "Select multiple"
    const isChoiceType = responseType.includes('dropdown') || 
                         responseType.includes('select') || 
                         responseType.includes('radio') ||
                         responseType.includes('choice')
    
    if (isChoiceType) {
      mappedAnswer.valueType = 'choice'
      const match = matchChoice(answer.value!, choices)
      
      if (match) {
        mappedAnswer.choiceId = match.choiceId
        mappedAnswer.choiceText = match.choiceText
        mappedAnswer.mappedValue = match.choiceId
      } else if (choices.length > 0) {
        mappedAnswer.hasIssue = true
        mappedAnswer.mappedValue = answer.value  // Store as text fallback
        mappedAnswer.issue = {
          type: 'choice_mismatch',
          bubbleId: answer.bubbleId,
          question: question.content,
          excelValue: answer.value,
          details: `No matching choice found. Available: ${choices.map(c => c.content).join(', ')}`,
          suggestedFix: choices[0]?.content
        }
        issues.push(mappedAnswer.issue)
      } else {
        // No choices in DB - store as text
        mappedAnswer.valueType = 'text'
        mappedAnswer.mappedValue = answer.value
      }
    } else if (responseType.includes('number')) {
      mappedAnswer.valueType = 'number'
      const num = parseFloat(answer.value!)
      mappedAnswer.mappedValue = isNaN(num) ? answer.value : num
    } else if (responseType.includes('boolean') || responseType.includes('yes/no')) {
      mappedAnswer.valueType = 'boolean'
      const lower = answer.value!.toLowerCase()
      if (lower === 'yes' || lower === 'true' || lower === '1') {
        mappedAnswer.mappedValue = true
      } else if (lower === 'no' || lower === 'false' || lower === '0') {
        mappedAnswer.mappedValue = false
      } else {
        mappedAnswer.mappedValue = answer.value
      }
    } else if (responseType.includes('date')) {
      mappedAnswer.valueType = 'date'
      const date = new Date(answer.value!)
      mappedAnswer.mappedValue = isNaN(date.getTime()) ? answer.value : date.toISOString()
    } else if (responseType.includes('list') || responseType.includes('table')) {
      mappedAnswer.valueType = 'list_table'
      mappedAnswer.mappedValue = answer.value
      // TODO: Handle list table rows with additionalValues
    } else {
      mappedAnswer.valueType = 'text'
      mappedAnswer.mappedValue = answer.value
    }
    
    mappedAnswers.push(mappedAnswer)
  }
  
  const answeredCount = mappedAnswers.filter(a => a.mappedValue !== null && !isPlaceholder(a.excelValue)).length
  
  return {
    success: true,
    fileName: parseResult.metadata.fileName,
    totalQuestions: parseResult.answers.length,
    matchedQuestions: matchedCount,
    answeredQuestions: answeredCount,
    issueCount: issues.length,
    answers: mappedAnswers,
    issues,
    readyToImport: issues.filter(i => i.type !== 'no_question_match').length === 0
  }
}

// Execute the import to a specific sheet
export async function executeImport(
  preview: ImportPreview, 
  sheetId: string, 
  companyId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    answersCreated: 0,
    listTableRowsCreated: 0,
    errors: []
  }
  
  const answersToInsert: any[] = []
  
  for (const answer of preview.answers) {
    if (!answer.questionId || answer.mappedValue === null) continue
    if (isPlaceholder(answer.excelValue)) continue
    
    const answerRecord: any = {
      sheet_id: sheetId,
      parent_question_id: answer.questionId,
      company_id: companyId,
      created_at: new Date().toISOString()
    }
    
    switch (answer.valueType) {
      case 'text':
        answerRecord.text_value = answer.mappedValue
        break
      case 'choice':
        if (answer.choiceId) {
          answerRecord.choice_id = answer.choiceId
        } else {
          answerRecord.text_value = answer.mappedValue
        }
        break
      case 'number':
        if (typeof answer.mappedValue === 'number') {
          answerRecord.number_value = answer.mappedValue
        } else {
          answerRecord.text_value = answer.mappedValue
        }
        break
      case 'boolean':
        if (typeof answer.mappedValue === 'boolean') {
          answerRecord.boolean_value = answer.mappedValue
        } else {
          answerRecord.text_value = answer.mappedValue
        }
        break
      case 'date':
        answerRecord.date_value = answer.mappedValue
        break
      default:
        answerRecord.text_value = answer.mappedValue
    }
    
    answersToInsert.push(answerRecord)
  }
  
  // Insert in batches
  const batchSize = 100
  for (let i = 0; i < answersToInsert.length; i += batchSize) {
    const batch = answersToInsert.slice(i, i + batchSize)
    const { error } = await supabase.from('answers').insert(batch)
    
    if (error) {
      result.errors.push(`Batch ${Math.floor(i/batchSize)}: ${error.message}`)
    } else {
      result.answersCreated += batch.length
    }
  }
  
  result.success = result.errors.length === 0
  return result
}

// CLI for testing
const isMainModule = process.argv[1]?.endsWith('excel-importer.ts')
if (isMainModule) {
  const args = process.argv.slice(2)
  
  if (args.length < 1) {
    console.log('Usage: npx tsx lib/excel-importer.ts <excel-path> [--import <sheet-id> <company-id>]')
    process.exit(1)
  }
  
  const excelPath = args[0]
  
  createImportPreview(excelPath).then(preview => {
    console.log('\n=== IMPORT PREVIEW ===')
    console.log('File:', preview.fileName)
    console.log('Success:', preview.success)
    console.log('Total questions:', preview.totalQuestions)
    console.log('Matched to DB:', preview.matchedQuestions)
    console.log('With answers:', preview.answeredQuestions)
    console.log('Issues:', preview.issueCount)
    console.log('Ready to import:', preview.readyToImport)
    
    if (preview.issues.length > 0) {
      console.log('\n=== ISSUES ===')
      preview.issues.slice(0, 10).forEach(issue => {
        console.log(`\n[${issue.type}] ${issue.question?.substring(0, 60)}...`)
        console.log(`  Excel value: ${issue.excelValue}`)
        console.log(`  Details: ${issue.details}`)
        if (issue.suggestedFix) console.log(`  Suggested: ${issue.suggestedFix}`)
      })
      if (preview.issues.length > 10) {
        console.log(`\n... and ${preview.issues.length - 10} more issues`)
      }
    }
    
    console.log('\n=== SAMPLE MAPPED ANSWERS (first 15 with values) ===')
    preview.answers
      .filter(a => a.mappedValue !== null)
      .slice(0, 15)
      .forEach(a => {
        const status = a.hasIssue ? '⚠️' : '✓'
        console.log(`${status} [${a.valueType}] ${a.section} / ${a.questionText?.substring(0, 40)}...`)
        console.log(`  Excel: ${a.excelValue}`)
        console.log(`  Mapped: ${a.choiceText || a.mappedValue}`)
      })
    
    // If --import flag, execute the import
    if (args.includes('--import')) {
      const importIdx = args.indexOf('--import')
      const sheetId = args[importIdx + 1]
      const companyId = args[importIdx + 2]
      
      if (!sheetId || !companyId) {
        console.log('\nError: --import requires <sheet-id> <company-id>')
        process.exit(1)
      }
      
      console.log('\n=== EXECUTING IMPORT ===')
      executeImport(preview, sheetId, companyId).then(result => {
        console.log('Success:', result.success)
        console.log('Answers created:', result.answersCreated)
        if (result.errors.length > 0) {
          console.log('Errors:', result.errors)
        }
      })
    }
  }).catch(console.error)
}
