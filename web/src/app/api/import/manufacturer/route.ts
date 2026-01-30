import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Extract metadata from "Supplier Product Contact" sheet
function extractMetadata(workbook: XLSX.WorkBook) {
  const ws = workbook.Sheets['Supplier Product Contact']
  if (!ws) {
    return { error: 'Supplier Product Contact sheet not found' }
  }
  
  return {
    supplierName: ws['C10']?.v?.toString().trim() || null,
    supplierAddress: ws['C11']?.v?.toString().trim() || null,
    supplierDivision: ws['C12']?.v?.toString().trim() || null,
    supplierPhone: ws['C13']?.v?.toString().trim() || null,
    supplierEmail: ws['C14']?.v?.toString().trim() || null,
    supplierContact: ws['C15']?.v?.toString().trim() || null,
    submissionDate: ws['C16']?.v?.toString().trim() || null,
    productName: ws['C19']?.v?.toString().trim() || null,
    productDescription: ws['C20']?.v?.toString().trim() || null,
    productCode: ws['C21']?.v?.toString().trim() || null,
    productFunction: ws['C22']?.v?.toString().trim() || null,
    producer: ws['C23']?.v?.toString().trim() || null,
    productionSites: ws['C24']?.v?.toString().trim() || null,
  }
}

// Types (same as excel import)
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

function isPlaceholder(value: string | null): boolean {
  if (!value) return true
  const trimmed = value.trim().toLowerCase()
  return trimmed === '' || trimmed === '0' || trimmed === 'n/a' || trimmed === '-'
}

function matchChoice(excelValue: string, choices: any[]): { choiceId: string; choiceText: string } | null {
  if (!excelValue || !choices?.length) return null
  const normalized = excelValue.toLowerCase().trim().replace(/[.,!?]$/g, '')
  
  for (const c of choices) {
    const contentNorm = c.content?.toLowerCase().trim().replace(/[.,!?]$/g, '')
    if (c.content === excelValue || contentNorm === normalized) {
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
    const action = formData.get('action') as string // 'preview' or 'import'
    const manufacturerCompanyId = formData.get('manufacturerCompanyId') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Read directly from buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    // Read XLSX from buffer directly
    const workbook = XLSX.read(buffer, { type: "buffer" })
    
    
    
    // Extract metadata
    const metadata = extractMetadata(workbook)
    if ('error' in metadata) {
      return NextResponse.json({ error: metadata.error }, { status: 400 })
    }
    
    // Load formula maps
    const stacksDir = process.env.STACKS_DIR || '/Users/scottkaufman/Developer/StacksData2050/stacks'
    const formulaMap: QuestionMapping[] = JSON.parse(
      fs.readFileSync(path.join(stacksDir, 'excel-formula-map.json'), 'utf-8')
    )
    const cellLookup: Record<string, CellLookup> = JSON.parse(
      fs.readFileSync(path.join(stacksDir, 'excel-cell-lookup.json'), 'utf-8')
    )
    
    // Parse Excel
    const parsedAnswers = parseExcelWithMap(workbook, cellLookup, formulaMap)
    
    // Load Supabase data
    const supabase = createAdminClient()
    
    const { data: questions } = await supabase
      .from('questions')
      .select('id, bubble_id, content, response_type, required')
    
    const { data: choices } = await supabase
      .from('choices')
      .select('id, question_id, content')
    
    // Build lookup maps
    const questionByBubbleId = new Map<string, any>()
    for (const q of questions || []) {
      if (q.bubble_id) questionByBubbleId.set(q.bubble_id, q)
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
    const mappedAnswers: any[] = []
    const issues: any[] = []
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
      
      const mapped: any = {
        bubbleId: answer.bubbleId,
        questionId: question.id,
        questionText: question.content || answer.question,
        section: answer.section,
        excelValue: answer.value,
        mappedValue: null,
        valueType: 'text',
        isRequired: question.required || false,
        hasIssue: false
      }
      
      if (isPlaceholder(answer.value)) {
        mappedAnswers.push(mapped)
        continue
      }
      
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
          issues.push({
            type: 'choice_mismatch',
            question: question.content,
            excelValue: answer.value,
            details: `Available: ${qChoices.map((c: any) => c.content).slice(0, 3).join(', ')}...`
          })
        } else {
          mapped.valueType = 'text'
          mapped.mappedValue = answer.value
        }
      } else {
        mapped.mappedValue = answer.value
      }
      
      mappedAnswers.push(mapped)
    }
    
    // PREVIEW mode - just return the data
    if (action !== 'import') {
      const answersWithValues = mappedAnswers.filter(a => a.mappedValue !== null && !isPlaceholder(a.excelValue))
      
      return NextResponse.json({
        success: true,
        metadata,
        fileName: file.name,
        totalQuestions: parsedAnswers.length,
        matchedQuestions: matchedCount,
        answeredQuestions: answersWithValues.length,
        issueCount: issues.length,
        answers: mappedAnswers,
        issues
      })
    }
    
    // IMPORT mode - create supplier, sheet, and answers
    if (!manufacturerCompanyId) {
      return NextResponse.json({ error: 'manufacturerCompanyId required for import' }, { status: 400 })
    }
    
    // Find or create supplier company
    let supplierCompanyId: string
    
    if (metadata.supplierName) {
      // Check if company exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', metadata.supplierName)
        .single()
      
      if (existingCompany) {
        supplierCompanyId = existingCompany.id
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ 
            name: metadata.supplierName, 
            location: metadata.supplierAddress || null, 
            type: 'supplier' 
          })
          .select('id')
          .single()
        
        if (companyError || !newCompany) {
          console.error('Company create error:', companyError)
          return NextResponse.json({ error: 'Failed to create supplier company' }, { status: 500 })
        }
        supplierCompanyId = newCompany.id
      }
    } else {
      return NextResponse.json({ error: 'Could not extract supplier name from Excel' }, { status: 400 })
    }
    // Create sheet
    const { data: newSheet, error: sheetError } = await supabase
      .from('sheets')
      .insert({
        name: metadata.productName || 'Imported Product',
        company_id: supplierCompanyId,
        requesting_company_id: manufacturerCompanyId,
        status: 'imported',  // Special status for imported sheets
        created_at: new Date().toISOString()
      })
      .select('id, name')
      .single()
    
    if (sheetError || !newSheet) {
      return NextResponse.json({ error: 'Failed to create sheet: ' + sheetError?.message }, { status: 500 })
    }

    // Auto-assign HQ2.1 tag for full workbook import
    const HQ21_TAG_ID = "a3fbb37e-cace-4aae-85c1-a2571e539e81"
    await supabase.from("sheet_tags").insert({
      sheet_id: newSheet.id,
      tag_id: HQ21_TAG_ID
    })
    
    // Insert answers
    const answersToInsert: any[] = []
    for (const answer of mappedAnswers) {
      if (!answer.questionId || answer.mappedValue === null || answer.hasIssue) continue
      
      const record: any = {
        sheet_id: newSheet.id,
        question_id: answer.questionId,
        company_id: supplierCompanyId,
        created_at: new Date().toISOString()
      }
      
      if (answer.valueType === 'choice' && answer.choiceId) {
        record.choice_id = answer.choiceId
      } else {
        record.text_value = answer.mappedValue
      }
      
      answersToInsert.push(record)
    }
    
    // Batch insert
    let inserted = 0
    const batchSize = 100
    for (let i = 0; i < answersToInsert.length; i += batchSize) {
      const batch = answersToInsert.slice(i, i + batchSize)
      console.log("Inserting batch:", batch.length); const { error } = await supabase.from('answers').insert(batch)
      if (error) console.error("Answer insert error:", error); else inserted += batch.length
    }
    
    return NextResponse.json({
      success: true,
      sheetId: newSheet.id,
      sheetName: newSheet.name,
      supplierCompanyId,
      supplierName: metadata.supplierName,
      answersImported: inserted,
      issueCount: issues.length
    })
    
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
