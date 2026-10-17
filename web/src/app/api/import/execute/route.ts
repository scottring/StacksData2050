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
  /** Supplier comment, saved to additional_notes. */
  additionalNotes?: string | null
  /** With protectExisting: replace a non-empty answer already on the sheet. */
  overwrite?: boolean
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
  /**
   * Leave answers already on the sheet alone unless the answer says
   * overwrite, and update the existing row instead of adding a duplicate.
   * Tables whose question already has rows are skipped.
   */
  protectExisting?: boolean
}

const VALUE_FIELDS = ['text_value', 'text_area_value', 'number_value', 'boolean_value', 'date_value', 'choice_id'] as const

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json()
    const { sheetId, companyId, answers, listTables = [], protectExisting = false } = body
    
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

    // Existing answers, read only when the caller asked to protect them.
    const existingByQuestion = new Map<string, { ids: string[]; nonEmpty: boolean }>()
    const questionsWithTableRows = new Set<string>()
    if (protectExisting) {
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('answers')
          .select('id, question_id, list_table_row_id, ' + VALUE_FIELDS.join(', '))
          .eq('sheet_id', sheetId)
          .range(from, from + 999)
        if (error) {
          return NextResponse.json({ error: `Could not read existing answers: ${error.message}` }, { status: 500 })
        }
        for (const a of (data ?? []) as any[]) {
          if (!a.question_id) continue
          if (a.list_table_row_id) {
            questionsWithTableRows.add(a.question_id)
            continue
          }
          const entry = existingByQuestion.get(a.question_id) ?? { ids: [], nonEmpty: false }
          entry.ids.push(a.id)
          if (VALUE_FIELDS.some(f => a[f] !== null && a[f] !== undefined && String(a[f]).trim() !== '')) entry.nonEmpty = true
          existingByQuestion.set(a.question_id, entry)
        }
        if (!data || data.length < 1000) break
      }
    }

    // Build answer records
    const answersToInsert: any[] = []
    const answersToUpdate: Array<{ ids: string[]; record: any }> = []
    let skippedExisting = 0
    
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

      if (answer.additionalNotes) record.additional_notes = answer.additionalNotes

      const existing = protectExisting ? existingByQuestion.get(answer.questionId) : undefined
      if (existing) {
        if (existing.nonEmpty && !answer.overwrite) {
          skippedExisting++
          continue
        }
        answersToUpdate.push({ ids: existing.ids, record })
        continue
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

    // Existing rows are updated in place so the sheet keeps one answer per
    // question; value fields not set by the import are cleared.
    let updated = 0
    for (let i = 0; i < answersToUpdate.length; i += 10) {
      const results = await Promise.all(
        answersToUpdate.slice(i, i + 10).map(({ ids, record }) => {
          const { sheet_id, question_id, company_id, created_at, ...values } = record
          const patch: any = { modified_at: new Date().toISOString() }
          for (const f of VALUE_FIELDS) patch[f] = values[f] ?? null
          if (values.additional_notes) patch.additional_notes = values.additional_notes
          return supabase.from('answers').update(patch).in('id', ids).select('id')
        }),
      )
      results.forEach((r, j) => {
        if (r.error) errors.push(`Update ${answersToUpdate[i + j].record.question_id}: ${r.error.message}`)
        else if (!r.data?.length) errors.push(`Update ${answersToUpdate[i + j].record.question_id}: no rows changed (permission?)`)
        else updated++
      })
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

    let listTablesSkipped = 0
    for (const table of listTables) {
      if (protectExisting && questionsWithTableRows.has(table.questionId)) {
        listTablesSkipped++
        continue
      }
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
      answersUpdated: updated,
      answersSkippedExisting: skippedExisting,
      listTablesImported: listTables.length - listTablesSkipped,
      listTablesSkipped,
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
