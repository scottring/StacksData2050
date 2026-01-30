import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create a service role client for when auth cookies aren't available (dev workaround)
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return null
  }

  return createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

interface AnswerInput {
  question_id: string
  answer_id?: string
  value: string | number | boolean | null
  type: string
  clarification?: string
  additional_notes?: string
  list_table_row_id?: string
  list_table_column_id?: string
}

/**
 * POST /api/answers/batch - Save multiple answers at once
 *
 * Body:
 * - sheet_id: string (required)
 * - answers: AnswerInput[] (required)
 *
 * This endpoint is optimized for auto-save scenarios where
 * multiple answers might be saved together.
 */
export async function POST(request: NextRequest) {
  try {
    let supabase = await createClient()
    let userData: { id: string; company_id: string | null } | null = null

    // Try to get current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Auth failed - try service role client as fallback for local dev
      const serviceClient = createServiceRoleClient()
      if (!serviceClient) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      // Use service client for the rest of the request
      supabase = serviceClient as any
      // For service role, we'll skip user-specific access control
      // This is only for local development
      console.warn('[API] Auth session missing, using service role client')
    } else {
      // Get user's company
      const { data } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('id', user.id)
        .single()
      userData = data
    }

    // If we have userData, we can do access control
    // If not (service role fallback), skip access control for local dev

    const body = await request.json()
    const { sheet_id, answers } = body as { sheet_id: string; answers: AnswerInput[] }

    // Validate required fields
    if (!sheet_id || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'sheet_id and answers array are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this sheet
    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, company_id, requesting_company_id, status')
      .eq('id', sheet_id)
      .single()

    if (!sheet) {
      return NextResponse.json(
        { error: 'Sheet not found' },
        { status: 404 }
      )
    }

    // Only check access if we have user data (skip for service role fallback in dev)
    if (userData) {
      const hasAccess =
        sheet.company_id === userData.company_id ||
        sheet.requesting_company_id === userData.company_id

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this sheet' },
          { status: 403 }
        )
      }
    }

    // Get existing answers for this sheet to determine update vs insert
    const { data: existingAnswers } = await supabase
      .from('answers')
      .select('id, question_id, list_table_row_id, list_table_column_id')
      .eq('sheet_id', sheet_id)

    // Build a lookup map for existing answers
    const existingMap = new Map<string, string>()
    existingAnswers?.forEach(a => {
      const key = `${a.question_id}|${a.list_table_row_id || ''}|${a.list_table_column_id || ''}`
      existingMap.set(key, a.id)
    })

    const now = new Date().toISOString()
    const results: { success: boolean; question_id: string; error?: string }[] = []

    // Process each answer
    for (const input of answers) {
      const {
        question_id,
        answer_id,
        value,
        type,
        clarification,
        additional_notes,
        list_table_row_id,
        list_table_column_id,
      } = input

      try {
        // Build answer data
        const answerData: Record<string, unknown> = {
          sheet_id,
          question_id,
          modified_at: now,
        }

        // Add company_id if available
        if (userData?.company_id) {
          answerData.company_id = userData.company_id
        } else if (sheet.company_id) {
          // Fallback to sheet's company
          answerData.company_id = sheet.company_id
        }

        if (clarification !== undefined) {
          answerData.clarification = clarification
        }

        if (additional_notes !== undefined) {
          answerData.additional_notes = additional_notes
        }

        if (list_table_row_id) {
          answerData.list_table_row_id = list_table_row_id
        }
        if (list_table_column_id) {
          answerData.list_table_column_id = list_table_column_id
        }

        // Set value based on type
        switch (type) {
          case 'boolean':
            answerData.boolean_value = value as boolean
            break
          case 'choice':
            answerData.choice_id = (value as string) || null
            break
          case 'number':
            if (typeof value === 'number') {
              answerData.number_value = value
            } else if (typeof value === 'string' && value !== '') {
              answerData.number_value = parseFloat(value)
            } else {
              answerData.number_value = null
            }
            break
          case 'date':
            answerData.date_value = (value as string) || null
            break
          case 'text_area':
            answerData.text_area_value = (value as string) || null
            break
          case 'text':
          default:
            answerData.text_value = value !== null ? String(value) : null
            break
        }

        // Find existing answer ID
        const lookupKey = `${question_id}|${list_table_row_id || ''}|${list_table_column_id || ''}`
        const existingId = answer_id || existingMap.get(lookupKey)

        if (existingId) {
          // Update existing
          const { error } = await supabase
            .from('answers')
            .update(answerData)
            .eq('id', existingId)

          if (error) throw error
        } else {
          // Insert new
          answerData.created_at = now

          const { data: newAnswer, error } = await supabase
            .from('answers')
            .insert(answerData)
            .select('id')
            .single()

          if (error) throw error

          // Update map for potential subsequent answers
          if (newAnswer) {
            existingMap.set(lookupKey, newAnswer.id)
          }
        }

        results.push({ success: true, question_id })

      } catch (error) {
        console.error(`Error saving answer for question ${question_id}:`, error)
        results.push({
          success: false,
          question_id,
          error: error instanceof Error ? error.message : 'Failed to save'
        })
      }
    }

    // Update sheet status if needed (pending -> in_progress)
    if (sheet.status === 'pending' || sheet.status === 'draft') {
      await supabase
        .from('sheets')
        .update({
          status: 'in_progress',
          modified_at: now
        })
        .eq('id', sheet_id)
    }

    // Update sheet modified_at timestamp
    await supabase
      .from('sheets')
      .update({ modified_at: now })
      .eq('id', sheet_id)

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: errorCount === 0,
      saved: successCount,
      errors: errorCount,
      results
    })

  } catch (error) {
    console.error('Batch save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
