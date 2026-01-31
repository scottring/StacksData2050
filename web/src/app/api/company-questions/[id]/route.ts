import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/company-questions/[id] - Fetch a single custom question
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data, error } = await supabase
      .from('company_questions')
      .select('*')
      .eq('id', id)
      .eq('company_id', userData.company_id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
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
 * PATCH /api/company-questions/[id] - Update a custom question
 *
 * Body (all optional):
 * - question_text: string
 * - response_type: 'text' | 'yes_no' | 'choice'
 * - choices: string[]
 * - hint: string
 * - required: boolean
 * - sort_order: number
 * - archived: boolean
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify the question belongs to user's company
    const { data: existingQuestion } = await supabase
      .from('company_questions')
      .select('id, company_id')
      .eq('id', id)
      .single()

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    if (existingQuestion.company_id !== userData.company_id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this question' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      question_text,
      response_type,
      choices,
      hint,
      required,
      sort_order,
      archived,
    } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (question_text !== undefined) {
      if (!question_text?.trim()) {
        return NextResponse.json(
          { error: 'question_text cannot be empty' },
          { status: 400 }
        )
      }
      updateData.question_text = question_text.trim()
    }

    if (response_type !== undefined) {
      if (!['text', 'yes_no', 'choice'].includes(response_type)) {
        return NextResponse.json(
          { error: 'response_type must be text, yes_no, or choice' },
          { status: 400 }
        )
      }
      updateData.response_type = response_type

      // Clear choices if changing away from choice type
      if (response_type !== 'choice') {
        updateData.choices = null
      }
    }

    if (choices !== undefined) {
      // Only allow setting choices if response_type is 'choice'
      const effectiveResponseType = response_type || existingQuestion
      if (effectiveResponseType === 'choice') {
        if (!Array.isArray(choices) || choices.length < 2) {
          return NextResponse.json(
            { error: 'At least 2 choices are required for choice response type' },
            { status: 400 }
          )
        }
        updateData.choices = choices
      }
    }

    if (hint !== undefined) {
      updateData.hint = hint?.trim() || null
    }

    if (required !== undefined) {
      updateData.required = Boolean(required)
    }

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order
    }

    if (archived !== undefined) {
      updateData.archived = Boolean(archived)
    }

    const { data, error } = await supabase
      .from('company_questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company question:', error)
      return NextResponse.json(
        { error: 'Failed to update question' },
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
 * DELETE /api/company-questions/[id] - Delete a custom question
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify the question belongs to user's company
    const { data: existingQuestion } = await supabase
      .from('company_questions')
      .select('id, company_id')
      .eq('id', id)
      .single()

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    if (existingQuestion.company_id !== userData.company_id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this question' },
        { status: 403 }
      )
    }

    // Delete the question (this will cascade delete request_custom_questions
    // but custom_question_answers will remain orphaned for history)
    const { error } = await supabase
      .from('company_questions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company question:', error)
      return NextResponse.json(
        { error: 'Failed to delete question' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
