import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface MappedAnswer {
  bubbleId: string
  questionId: string | null
  excelValue: string | null
  mappedValue: any
  valueType: 'text' | 'choice' | 'number' | 'boolean' | 'date' | 'list_table'
  choiceId?: string
  hasIssue: boolean
}

interface ListTableImport {
  questionId: string
  columns: Array<{
    excelCol: string
    headerText: string
    columnId: string | null
  }>
  rows: Array<Record<string, string>>
}

interface ExecuteRequest {
  sheetId: string
  companyId: string
  answers: MappedAnswer[]
  listTables?: ListTableImport[]
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json()
    const { sheetId, companyId, answers, listTables = [] } = body
    
    if (!sheetId || !companyId || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: sheetId, companyId, answers' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Verify sheet exists
    const { data: sheet, error: sheetError } = await supabase
      .from('sheets')
      .select('id, name')
      .eq('id', sheetId)
      .single()
    
    if (sheetError || !sheet) {
      return NextResponse.json(
        { error: 'Sheet not found' },
        { status: 404 }
      )
    }

    // Mark sheet as imported from Excel
    await supabase
      .from('sheets')
      .update({ import_source: 'excel_import' })
      .eq('id', sheetId)

    // Build answer records
    const answersToInsert: any[] = []
    
    for (const answer of answers) {
      // Skip if no question ID or no value - but allow answers with issues (they'll be stored as text)
      if (!answer.questionId || answer.mappedValue === null) continue
      
      // question_id is what the sheet views join on (and is NOT NULL in prod);
      // parent_question_id alone left imported answers invisible.
      const record: any = {
        sheet_id: sheetId,
        question_id: answer.questionId,
        company_id: companyId,
        created_at: new Date().toISOString()
      }
      
      switch (answer.valueType) {
        case 'text':
          record.text_value = answer.mappedValue
          break
        case 'choice':
          if (answer.choiceId) {
            record.choice_id = answer.choiceId
          } else {
            record.text_value = answer.mappedValue
          }
          break
        case 'number':
          if (typeof answer.mappedValue === 'number') {
            record.number_value = answer.mappedValue
          } else {
            record.text_value = answer.mappedValue
          }
          break
        case 'boolean':
          if (typeof answer.mappedValue === 'boolean') {
            record.boolean_value = answer.mappedValue
          } else {
            record.text_value = answer.mappedValue
          }
          break
        case 'date':
          record.date_value = answer.mappedValue
          break
        default:
          record.text_value = answer.mappedValue
      }
      
      answersToInsert.push(record)
    }
    
    // Insert in batches
    const batchSize = 100
    let inserted = 0
    const errors: string[] = []
    
    for (let i = 0; i < answersToInsert.length; i += batchSize) {
      const batch = answersToInsert.slice(i, i + batchSize)
      const { error } = await supabase.from('answers').insert(batch)

      if (error) {
        errors.push(`Batch ${Math.floor(i/batchSize)}: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    // List tables: one answer per cell, rows tied together by list_table_row_id
    // and cells to their column by list_table_column_id, which is the shape the
    // sheet editor reads. Columns the workbook has but the question lacks are
    // created first so no supplier data is dropped.
    const listTableAnswers: any[] = []
    let columnsCreated = 0
    // list_table_columns is service-role only (RLS with no policies). Answers
    // below still go through the user's client so sheet access is enforced.
    const admin = createAdminClient()

    for (const table of listTables) {
      const { data: existing } = await admin
        .from('list_table_columns')
        .select('id, order_number')
        .eq('question_id', table.questionId)
      let nextOrder = (existing ?? []).reduce((m, c) => Math.max(m, c.order_number ?? 0), 0) + 1

      const columnIdByExcelCol = new Map<string, string>()
      for (const col of table.columns) {
        if (col.columnId) {
          columnIdByExcelCol.set(col.excelCol, col.columnId)
          continue
        }
        const { data: created, error: colError } = await admin
          .from('list_table_columns')
          .insert({
            question_id: table.questionId,
            name: col.headerText.replace(/\s+/g, ' ').trim(),
            order_number: nextOrder++,
            response_type: 'Single text line',
          })
          .select('id')
          .single()
        if (colError || !created) {
          errors.push(`Could not create table column "${col.headerText}": ${colError?.message ?? 'unknown'}`)
          continue
        }
        columnsCreated++
        columnIdByExcelCol.set(col.excelCol, created.id)
      }

      for (const row of table.rows) {
        const rowId = crypto.randomUUID()
        for (const [excelCol, value] of Object.entries(row)) {
          const columnId = columnIdByExcelCol.get(excelCol)
          if (!columnId || !value) continue
          listTableAnswers.push({
            sheet_id: sheetId,
            question_id: table.questionId,
            company_id: companyId,
            list_table_row_id: rowId,
            list_table_column_id: columnId,
            text_value: value,
            created_at: new Date().toISOString(),
          })
        }
      }
    }

    let listTableCellsInserted = 0
    for (let i = 0; i < listTableAnswers.length; i += batchSize) {
      const batch = listTableAnswers.slice(i, i + batchSize)
      const { error } = await supabase.from('answers').insert(batch)
      if (error) {
        errors.push(`List table batch ${Math.floor(i / batchSize)}: ${error.message}`)
      } else {
        listTableCellsInserted += batch.length
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      sheetId,
      sheetName: sheet.name,
      answersInserted: inserted,
      listTablesImported: listTables.length,
      listTableCellsInserted,
      columnsCreated,
      errors
    })
    
  } catch (error: any) {
    console.error('Execute import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute import' },
      { status: 500 }
    )
  }
}
