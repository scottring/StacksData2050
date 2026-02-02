import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MappedAnswer {
  bubbleId: string
  questionId: string | null
  excelValue: string | null
  mappedValue: any
  valueType: 'text' | 'choice' | 'number' | 'boolean' | 'date' | 'list_table'
  choiceId?: string
  hasIssue: boolean
}

interface ExecuteRequest {
  sheetId: string
  companyId: string
  answers: MappedAnswer[]
}

export async function POST(request: NextRequest) {
  try {
    const body: ExecuteRequest = await request.json()
    const { sheetId, companyId, answers } = body
    
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
      
      const record: any = {
        sheet_id: sheetId,
        parent_question_id: answer.questionId,
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
    
    return NextResponse.json({
      success: errors.length === 0,
      sheetId,
      sheetName: sheet.name,
      answersInserted: inserted,
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
