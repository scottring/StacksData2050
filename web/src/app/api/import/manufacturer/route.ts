import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'

// Import bundled data files (no fs needed in production)
import formulaMapData from '@/data/excel-formula-map.json'
import cellLookupData from '@/data/excel-cell-lookup.json'
import listTableMappingData from '@/data/excel-list-table-mapping.json'

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

// List table mapping types
interface ListTableColumnMapping {
  excelCol: string
  columnId: string
  name: string
}

interface ListTableMapping {
  questionBubbleId: string
  questionNumber: string
  description: string
  excelSheet: string
  dataStartRow: number
  maxRows: number
  columns: ListTableColumnMapping[]
}

interface ListTableConfig {
  description: string
  tables: ListTableMapping[]
}

interface ParsedListTableRow {
  questionBubbleId: string
  rowIndex: number
  cells: Array<{
    columnId: string
    value: string
  }>
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

// Parse list tables from Excel
function parseListTables(
  workbook: XLSX.WorkBook,
  listTableConfig: ListTableConfig
): ParsedListTableRow[] {
  const rows: ParsedListTableRow[] = []

  console.log('DEBUG: List table config has', listTableConfig.tables.length, 'tables')

  for (const table of listTableConfig.tables) {
    console.log(`DEBUG: Processing table ${table.questionNumber} - ${table.description}`)
    console.log(`DEBUG:   Sheet: ${table.excelSheet}, StartRow: ${table.dataStartRow}, Columns: ${table.columns.length}`)

    if (table.columns.length === 0) {
      console.log('DEBUG:   Skipping - no columns defined')
      continue
    }

    const ws = workbook.Sheets[table.excelSheet]
    if (!ws) {
      console.log(`DEBUG:   Sheet not found: ${table.excelSheet}`)
      console.log('DEBUG:   Available sheets:', workbook.SheetNames)
      continue
    }

    // Debug: show what's in the first few cells of the expected range
    console.log('DEBUG:   Sampling cells from expected range:')
    for (let i = 0; i < 3; i++) {
      const sampleRow = table.dataStartRow + i
      const samples: string[] = []
      for (const col of table.columns.slice(0, 3)) {
        const cellRef = `${col.excelCol}${sampleRow}`
        const cell = ws[cellRef]
        const val = cell?.w || cell?.v || '(empty)'
        samples.push(`${cellRef}=${val}`)
      }
      console.log(`DEBUG:     Row ${sampleRow}: ${samples.join(', ')}`)
    }

    // Parse each row in the table
    let rowsFoundForTable = 0
    for (let rowOffset = 0; rowOffset < table.maxRows; rowOffset++) {
      const excelRow = table.dataStartRow + rowOffset
      const cells: Array<{ columnId: string; value: string }> = []
      let hasAnyValue = false

      // Read each column for this row
      for (const col of table.columns) {
        const cellRef = `${col.excelCol}${excelRow}`
        const cell = ws[cellRef]

        // Get value - try formatted (w) first, then raw (v)
        let value: string | null = null
        if (cell) {
          if (cell.w !== undefined) value = String(cell.w).trim()
          else if (cell.v !== undefined) value = String(cell.v).trim()
        }

        if (value && value !== '' && value !== '0' && value.toLowerCase() !== 'n/a') {
          hasAnyValue = true
          cells.push({
            columnId: col.columnId,
            value
          })
        }
      }

      // Only include rows that have at least one value
      if (hasAnyValue && cells.length > 0) {
        rowsFoundForTable++
        rows.push({
          questionBubbleId: table.questionBubbleId,
          rowIndex: rowOffset,
          cells
        })
      }
    }
    console.log(`DEBUG:   Found ${rowsFoundForTable} rows with data for this table`)
  }

  console.log(`DEBUG: Total parsed ${rows.length} list table rows`)
  return rows
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

    console.log('DEBUG: File name:', file.name, 'size:', file.size, 'type:', file.type)

    // Read directly from buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('DEBUG: File size:', buffer.length, 'bytes')

    // Read XLSX from buffer directly
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: "buffer" })
      console.log('DEBUG: Workbook sheets:', workbook.SheetNames)
    } catch (xlsxError: any) {
      console.error('DEBUG: XLSX read error:', xlsxError)
      return NextResponse.json({
        error: `Failed to read Excel file: ${xlsxError.message}`,
        details: xlsxError.stack
      }, { status: 400 })
    }
    
    
    
    // Extract metadata
    const metadata = extractMetadata(workbook)
    if ('error' in metadata) {
      return NextResponse.json({ error: metadata.error }, { status: 400 })
    }
    
    // Use bundled data files
    const formulaMap: QuestionMapping[] = formulaMapData as QuestionMapping[]
    const cellLookup: Record<string, CellLookup> = cellLookupData as Record<string, CellLookup>
    const listTableConfig: ListTableConfig = listTableMappingData as ListTableConfig

    // Parse Excel - regular answers
    const parsedAnswers = parseExcelWithMap(workbook, cellLookup, formulaMap)

    // Parse list tables
    const listTableRows = parseListTables(workbook, listTableConfig)
    
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

      // Count list table cells
      const listTableCellCount = listTableRows.reduce((sum, row) => sum + row.cells.length, 0)

      return NextResponse.json({
        success: true,
        metadata,
        fileName: file.name,
        totalQuestions: parsedAnswers.length,
        matchedQuestions: matchedCount,
        answeredQuestions: answersWithValues.length,
        issueCount: issues.length,
        answers: mappedAnswers,
        issues,
        listTables: {
          rowCount: listTableRows.length,
          cellCount: listTableCellCount,
          tables: listTableConfig.tables.map(t => ({
            questionNumber: t.questionNumber,
            description: t.description,
            rowsFound: listTableRows.filter(r => r.questionBubbleId === t.questionBubbleId).length
          }))
        }
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

    // Debug: count answers by status
    const debugCounts = {
      total: mappedAnswers.length,
      withQuestionId: 0,
      withMappedValue: 0,
      withBoth: 0,
      skippedNoQuestionId: 0,
      skippedNullValue: 0,
    }

    for (const answer of mappedAnswers) {
      if (answer.questionId) debugCounts.withQuestionId++
      if (answer.mappedValue !== null) debugCounts.withMappedValue++
      if (answer.questionId && answer.mappedValue !== null) debugCounts.withBoth++

      // Skip if no question ID or no value
      if (!answer.questionId) {
        debugCounts.skippedNoQuestionId++
        continue
      }
      if (answer.mappedValue === null) {
        debugCounts.skippedNullValue++
        continue
      }

      const record: any = {
        sheet_id: newSheet.id,
        question_id: answer.questionId,
        company_id: supplierCompanyId,
        created_at: new Date().toISOString()
      }

      // If it's a choice type with a matched choice, use choice_id
      // Otherwise (including choice mismatches), store as text_value
      if (answer.valueType === 'choice' && answer.choiceId) {
        record.choice_id = answer.choiceId
      } else {
        record.text_value = answer.mappedValue
      }

      answersToInsert.push(record)
    }

    console.log('DEBUG Import counts:', debugCounts)
    console.log('DEBUG answersToInsert length:', answersToInsert.length)
    if (answersToInsert.length === 0 && mappedAnswers.length > 0) {
      console.log('DEBUG First 5 mappedAnswers:', JSON.stringify(mappedAnswers.slice(0, 5), null, 2))
    }
    
    // Batch insert
    let inserted = 0
    const batchSize = 100
    const insertErrors: string[] = []
    for (let i = 0; i < answersToInsert.length; i += batchSize) {
      const batch = answersToInsert.slice(i, i + batchSize)
      const { error } = await supabase.from('answers').insert(batch)
      if (error) {
        console.error('DEBUG Insert error:', error)
        insertErrors.push(error.message)
      } else {
        inserted += batch.length
      }
    }
    console.log('DEBUG Inserted:', inserted, 'Errors:', insertErrors)

    // Insert list table answers
    let listTableInserted = 0
    if (listTableRows.length > 0) {
      const listTableAnswers: any[] = []

      // Group rows by question and assign unique row IDs
      const rowIdsByQuestion = new Map<string, Map<number, string>>()

      for (const row of listTableRows) {
        // Get or create row ID map for this question
        if (!rowIdsByQuestion.has(row.questionBubbleId)) {
          rowIdsByQuestion.set(row.questionBubbleId, new Map())
        }
        const rowIds = rowIdsByQuestion.get(row.questionBubbleId)!

        // Generate a unique row ID for this row index
        if (!rowIds.has(row.rowIndex)) {
          rowIds.set(row.rowIndex, crypto.randomUUID())
        }
        const listTableRowId = rowIds.get(row.rowIndex)!

        // Get question ID from bubble ID
        const question = questionByBubbleId.get(row.questionBubbleId)
        if (!question) {
          console.log(`Question not found for bubble ID: ${row.questionBubbleId}`)
          continue
        }

        // Create answer records for each cell
        for (const cell of row.cells) {
          listTableAnswers.push({
            sheet_id: newSheet.id,
            question_id: question.id,
            company_id: supplierCompanyId,
            list_table_row_id: listTableRowId,
            list_table_column_id: cell.columnId,
            text_value: cell.value,
            created_at: new Date().toISOString()
          })
        }
      }

      console.log('DEBUG List table answers to insert:', listTableAnswers.length)

      // Batch insert list table answers
      for (let i = 0; i < listTableAnswers.length; i += batchSize) {
        const batch = listTableAnswers.slice(i, i + batchSize)
        const { error } = await supabase.from('answers').insert(batch)
        if (error) {
          console.error('DEBUG List table insert error:', error)
          insertErrors.push('List table: ' + error.message)
        } else {
          listTableInserted += batch.length
        }
      }
      console.log('DEBUG List table inserted:', listTableInserted)
    }

    return NextResponse.json({
      success: true,
      sheetId: newSheet.id,
      sheetName: newSheet.name,
      supplierCompanyId,
      supplierName: metadata.supplierName,
      answersImported: inserted,
      listTableCellsImported: listTableInserted,
      issueCount: issues.length
    })
    
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
