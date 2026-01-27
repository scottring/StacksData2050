import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/answers - Create or update an answer
 *
 * Body:
 * - sheet_id: string (required)
 * - question_id: string (required)
 * - answer_id?: string (optional - for updates)
 * - value: any (the answer value)
 * - type: string (text, choice, boolean, number, date, text_area)
 * - clarification?: string (optional - additional comments)
 * - list_table_row_id?: string (for list table answers)
 * - list_table_column_id?: string (for list table answers)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's company to verify access
    const { data: userData } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    const {
      sheet_id,
      question_id,
      answer_id,
      value,
      type,
      clarification,
      list_table_row_id,
      list_table_column_id,
    } = body

    // Validate required fields
    if (!sheet_id || !question_id) {
      return NextResponse.json(
        { error: 'sheet_id and question_id are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this sheet (belongs to their company or assigned to their company)
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, company_id, assigned_to_company_id')
      .eq('id', sheet_id)
      .single()

    if (!sheet) {
      return NextResponse.json(
        { error: 'Sheet not found' },
        { status: 404 }
      )
    }

    const hasAccess =
      sheet.company_id === userData.company_id ||
      sheet.assigned_to_company_id === userData.company_id

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this sheet' },
        { status: 403 }
      )
    }

    // Build answer data object
    const answerData: Record<string, unknown> = {
      sheet_id,
      question_id,
      company_id: userData.company_id,
      modified_at: new Date().toISOString(),
    }

    // Handle clarification/comments
    if (clarification !== undefined) {
      answerData.clarification = clarification
    }

    // Handle list table specific fields
    if (list_table_row_id) {
      answerData.list_table_row_id = list_table_row_id
    }
    if (list_table_column_id) {
      answerData.list_table_column_id = list_table_column_id
    }

    // Set the value based on type
    switch (type) {
      case 'boolean':
        answerData.boolean_value = value
        break
      case 'choice':
        answerData.choice_id = value || null
        break
      case 'number':
        answerData.number_value = value !== '' && value !== null ? parseFloat(value) : null
        break
      case 'date':
        answerData.date_value = value || null
        break
      case 'text_area':
        answerData.text_area_value = value || null
        break
      case 'text':
      default:
        answerData.text_value = value || null
        break
    }

    let savedAnswer

    if (answer_id) {
      // Update existing answer
      const { data, error } = await supabase
        .from('answers')
        .update(answerData)
        .eq('id', answer_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating answer:', error)
        return NextResponse.json(
          { error: 'Failed to update answer' },
          { status: 500 }
        )
      }

      savedAnswer = data
    } else {
      // Check if answer already exists for this question/sheet/row
      let existingQuery = supabase
        .from('answers')
        .select('id')
        .eq('sheet_id', sheet_id)
        .eq('question_id', question_id)

      // For list table answers, also match row and column
      if (list_table_row_id) {
        existingQuery = existingQuery.eq('list_table_row_id', list_table_row_id)
      } else {
        existingQuery = existingQuery.is('list_table_row_id', null)
      }

      if (list_table_column_id) {
        existingQuery = existingQuery.eq('list_table_column_id', list_table_column_id)
      } else {
        existingQuery = existingQuery.is('list_table_column_id', null)
      }

      const { data: existingAnswer } = await existingQuery.single()

      if (existingAnswer) {
        // Update existing
        const { data, error } = await supabase
          .from('answers')
          .update(answerData)
          .eq('id', existingAnswer.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating existing answer:', error)
          return NextResponse.json(
            { error: 'Failed to update answer' },
            { status: 500 }
          )
        }

        savedAnswer = data
      } else {
        // Create new answer
        answerData.created_at = new Date().toISOString()

        const { data, error } = await supabase
          .from('answers')
          .insert(answerData)
          .select()
          .single()

        if (error) {
          console.error('Error creating answer:', error)
          return NextResponse.json(
            { error: 'Failed to create answer' },
            { status: 500 }
          )
        }

        savedAnswer = data
      }
    }

    return NextResponse.json({
      success: true,
      answer: savedAnswer
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/answers - Delete an answer
 *
 * Query params:
 * - id: string (answer ID to delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const answerId = searchParams.get('id')

    if (!answerId) {
      return NextResponse.json(
        { error: 'Answer ID is required' },
        { status: 400 }
      )
    }

    // Get the answer to verify ownership
    const { data: answer } = await supabase
      .from('answers')
      .select('id, sheet_id, sheets!inner(company_id, assigned_to_company_id)')
      .eq('id', answerId)
      .single()

    if (!answer) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      )
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify access
    const sheet = answer.sheets as unknown as { company_id: string | null; assigned_to_company_id: string | null }
    const hasAccess =
      sheet.company_id === userData.company_id ||
      sheet.assigned_to_company_id === userData.company_id

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to delete this answer' },
        { status: 403 }
      )
    }

    // Delete the answer
    const { error: deleteError } = await supabase
      .from('answers')
      .delete()
      .eq('id', answerId)

    if (deleteError) {
      console.error('Error deleting answer:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete answer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
