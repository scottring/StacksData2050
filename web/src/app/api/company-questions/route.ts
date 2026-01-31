import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/company-questions - Fetch all custom questions for the current user's company
 *
 * Query params:
 * - include_archived: boolean (default false)
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

    const searchParams = request.nextUrl.searchParams
    const includeArchived = searchParams.get('include_archived') === 'true'

    let query = supabase
      .from('company_questions')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!includeArchived) {
      query = query.eq('archived', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching company questions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
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
 * POST /api/company-questions - Create a new custom question
 *
 * Body:
 * - question_text: string (required)
 * - response_type: 'text' | 'yes_no' | 'choice' (default 'text')
 * - choices: string[] (required if response_type is 'choice')
 * - hint: string (optional)
 * - required: boolean (default false)
 * - sort_order: number (optional)
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
    const {
      question_text,
      response_type = 'text',
      choices,
      hint,
      required = false,
      sort_order,
    } = body

    // Validate required fields
    if (!question_text?.trim()) {
      return NextResponse.json(
        { error: 'question_text is required' },
        { status: 400 }
      )
    }

    // Validate response_type
    if (!['text', 'yes_no', 'choice'].includes(response_type)) {
      return NextResponse.json(
        { error: 'response_type must be text, yes_no, or choice' },
        { status: 400 }
      )
    }

    // Validate choices for choice type
    if (response_type === 'choice') {
      if (!Array.isArray(choices) || choices.length < 2) {
        return NextResponse.json(
          { error: 'At least 2 choices are required for choice response type' },
          { status: 400 }
        )
      }
    }

    // Get the next sort_order if not provided
    let finalSortOrder = sort_order
    if (finalSortOrder === undefined) {
      const { data: existingQuestions } = await supabase
        .from('company_questions')
        .select('sort_order')
        .eq('company_id', userData.company_id)
        .order('sort_order', { ascending: false })
        .limit(1)

      finalSortOrder = existingQuestions && existingQuestions.length > 0
        ? (existingQuestions[0].sort_order || 0) + 1
        : 0
    }

    const { data, error } = await supabase
      .from('company_questions')
      .insert({
        company_id: userData.company_id,
        question_text: question_text.trim(),
        response_type,
        choices: response_type === 'choice' ? choices : null,
        hint: hint?.trim() || null,
        required,
        sort_order: finalSortOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating company question:', error)
      return NextResponse.json(
        { error: 'Failed to create question' },
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
