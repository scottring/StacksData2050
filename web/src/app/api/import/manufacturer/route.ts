import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'
import { extractListTables, matchColumns, type DbQuestion, type DbListTableColumn, type CellLookupEntry } from '@/lib/import/list-tables'

// Import bundled data files (no fs needed in production)
import formulaMapData from '@/data/excel-formula-map.json'
import cellLookupData from '@/data/excel-cell-lookup.json'

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

interface ParsedListTableRow {
  questionId: string
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
    // Parse Excel - regular answers
    const parsedAnswers = parseExcelWithMap(workbook, cellLookup, formulaMap)

    // Load Supabase data
    const supabase = createAdminClient()

    // Section names and display order are needed to anchor list tables.
    const { data: questions } = await supabase
      .from('questions')
      .select('id, bubble_id, content, response_type, required, section_sort_number, subsection_sort_number, order_number, subsections!questions_subsection_id_fkey(sections(name))')
      .order('section_sort_number')
      .order('subsection_sort_number')
      .order('order_number')

    // List tables are located from the workbook layout, not the cell map.
    // Columns the workbook has but the question lacks are created on import
    // so no supplier data is dropped.
    const { data: listTableColumns } = await supabase
      .from('list_table_columns')
      .select('id, question_id, name, order_number')
    const columnsByQuestion = new Map<string, DbListTableColumn[]>()
    for (const c of (listTableColumns || []) as DbListTableColumn[]) {
      if (!c.question_id) continue
      columnsByQuestion.set(c.question_id, [...(columnsByQuestion.get(c.question_id) ?? []), c])
    }
    const orderedQuestions: DbQuestion[] = (questions || []).map((q: any) => ({
      id: q.id,
      bubble_id: q.bubble_id,
      response_type: q.response_type,
      content: q.content,
      section: q.subsections?.sections?.name ?? null,
      section_sort_number: q.section_sort_number,
      subsection_sort_number: q.subsection_sort_number,
      order_number: q.order_number,
    }))
    const extraction = extractListTables(workbook, orderedQuestions, cellLookup as unknown as Record<string, CellLookupEntry>)
    const resolvedTables = extraction.resolved
      .filter(t => t.rows.length > 0)
      .map(t => ({ ...t, columns: matchColumns(t.headers, columnsByQuestion.get(t.questionId) ?? []) }))
    const listTableRows: ParsedListTableRow[] = []
    for (const t of resolvedTables) {
      t.rows.forEach((row, rowIndex) => {
        const cells = t.columns
          .filter(c => row[c.excelCol])
          // columnId is resolved at import time once missing columns exist;
          // carry the workbook column letter until then.
          .map(c => ({ columnId: c.columnId ?? `excel:${c.excelCol}`, value: row[c.excelCol] }))
        if (cells.length) listTableRows.push({ questionId: t.questionId, rowIndex, cells })
      })
    }
    
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
          tables: resolvedTables.map(t => ({
            questionId: t.questionId,
            description: t.questionContent,
            sheet: t.sheetName,
            headerRow: t.headerRow,
            rowsFound: t.rows.length,
            newColumns: t.columns.filter(c => !c.columnId).map(c => c.headerText.replace(/\s+/g, ' ')),
          })),
          unresolved: extraction.unresolved.map(u => ({ description: u.questionContent, sheet: u.sheetName, reason: u.reason })),
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

      // Create any columns the workbook has that the question lacks, then
      // resolve the placeholder "excel:<col>" ids to real column ids.
      const createdColumnId = new Map<string, string>() // `${questionId}:${excelCol}` -> id
      for (const t of resolvedTables) {
        const existing = columnsByQuestion.get(t.questionId) ?? []
        let nextOrder = existing.reduce((m, c) => Math.max(m, c.order_number ?? 0), 0) + 1
        for (const col of t.columns) {
          if (col.columnId) continue
          const { data: created, error: colError } = await supabase
            .from('list_table_columns')
            .insert({
              question_id: t.questionId,
              name: col.headerText.replace(/\s+/g, ' ').trim(),
              order_number: nextOrder++,
              response_type: 'Single text line',
            })
            .select('id')
            .single()
          if (colError || !created) {
            insertErrors.push(`Could not create table column "${col.headerText}": ${colError?.message ?? 'unknown'}`)
            continue
          }
          createdColumnId.set(`${t.questionId}:${col.excelCol}`, created.id)
        }
      }

      // Rows are tied together by list_table_row_id, one per workbook row.
      const rowIdsByQuestion = new Map<string, Map<number, string>>()

      for (const row of listTableRows) {
        if (!rowIdsByQuestion.has(row.questionId)) {
          rowIdsByQuestion.set(row.questionId, new Map())
        }
        const rowIds = rowIdsByQuestion.get(row.questionId)!
        if (!rowIds.has(row.rowIndex)) {
          rowIds.set(row.rowIndex, crypto.randomUUID())
        }
        const listTableRowId = rowIds.get(row.rowIndex)!

        for (const cell of row.cells) {
          const columnId = cell.columnId.startsWith('excel:')
            ? createdColumnId.get(`${row.questionId}:${cell.columnId.slice(6)}`)
            : cell.columnId
          if (!columnId) continue
          listTableAnswers.push({
            sheet_id: newSheet.id,
            question_id: row.questionId,
            company_id: supplierCompanyId,
            list_table_row_id: listTableRowId,
            list_table_column_id: columnId,
            text_value: cell.value,
            created_at: new Date().toISOString()
          })
        }
      }

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
