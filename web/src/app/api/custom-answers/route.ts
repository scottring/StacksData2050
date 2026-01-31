import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/custom-answers - Fetch custom answers for a sheet
 *
 * Query params:
 * - sheet_id: string (required)
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const sheetId = searchParams.get('sheet_id')

    if (!sheetId) {
      return NextResponse.json(
        { error: 'sheet_id is required' },
        { status: 400 }
      )
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 404 }
      )
    }

    // Verify user has access to this sheet
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, company_id, requesting_company_id')
      .eq('id', sheetId)
      .single()

    if (!sheet) {
      return NextResponse.json(
        { error: 'Sheet not found' },
        { status: 404 }
      )
    }

    const hasAccess =
      sheet.company_id === userData.company_id ||
      sheet.requesting_company_id === userData.company_id

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this sheet' },
        { status: 403 }
      )
    }

    // Fetch custom answers with question details
    const { data, error } = await supabase
      .from('custom_question_answers')
      .select(`
        id,
        sheet_id,
        company_question_id,
        value,
        created_at,
        updated_at,
        company_questions (
          id,
          question_text,
          response_type,
          choices,
          hint,
          required
        )
      `)
      .eq('sheet_id', sheetId)

    if (error) {
      console.error('Error fetching custom answers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch custom answers' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/custom-answers - Create or update a custom answer
 *
 * Body:
 * - sheet_id: string (required)
 * - company_question_id: string (required)
 * - value: string (the answer value - text, "true"/"false" for yes/no, or choice text)
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

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { sheet_id, company_question_id, value } = body

    // Validate required fields
    if (!sheet_id || !company_question_id) {
      return NextResponse.json(
        { error: 'sheet_id and company_question_id are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this sheet (must be the supplier company)
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, company_id, requesting_company_id')
      .eq('id', sheet_id)
      .single()

    if (!sheet) {
      return NextResponse.json(
        { error: 'Sheet not found' },
        { status: 404 }
      )
    }

    // Only the supplier (sheet.company_id) can answer custom questions
    if (sheet.company_id !== userData.company_id) {
      return NextResponse.json(
        { error: 'Only the supplier can answer custom questions' },
        { status: 403 }
      )
    }

    // Verify the custom question exists
    const { data: question } = await supabase
      .from('company_questions')
      .select('id')
      .eq('id', company_question_id)
      .single()

    if (!question) {
      return NextResponse.json(
        { error: 'Custom question not found' },
        { status: 404 }
      )
    }

    // Upsert the answer (update if exists, insert if not)
    const { data: existingAnswer } = await supabase
      .from('custom_question_answers')
      .select('id')
      .eq('sheet_id', sheet_id)
      .eq('company_question_id', company_question_id)
      .single()

    let savedAnswer

    if (existingAnswer) {
      // Update existing answer
      const { data, error } = await supabase
        .from('custom_question_answers')
        .update({
          value: value ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAnswer.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating custom answer:', error)
        return NextResponse.json(
          { error: 'Failed to update answer' },
          { status: 500 }
        )
      }

      savedAnswer = data
    } else {
      // Create new answer
      const { data, error } = await supabase
        .from('custom_question_answers')
        .insert({
          sheet_id,
          company_question_id,
          value: value ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating custom answer:', error)
        return NextResponse.json(
          { error: 'Failed to create answer' },
          { status: 500 }
        )
      }

      savedAnswer = data
    }

    return NextResponse.json({
      success: true,
      answer: savedAnswer,
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
