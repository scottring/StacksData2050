import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// response_type values (on `questions`) that are backed by rows in the
// `choices` table, i.e. the answer must be written as choice_id rather than
// text_value. `question_type` is null for all HQ2.1 data in dev, so
// response_type is the real discriminator (verified empirically: every
// sampled question with one of these response_types has choices rows keyed
// on choices.question_id; PIDSL List and the free-text types do not).
const CHOICE_RESPONSE_TYPES = new Set([
  'Select one Radio',
  'Select one',
  'Dropdown',
  'Select multiple',
])

// Note appended when an extracted value cannot be resolved to a choice.
const CHOICE_MISMATCH_NOTE = 'AI-extracted value did not match a predefined choice'

// Helper to log trial activity (non-blocking)
async function logTrialActivity(email: string, userId: string | null, sheetId: string, answerCount: number) {
  try {
    const adminClient = createAdminClient()

    // Check if this is a trial user
    const { data: invitation } = await adminClient
      .from('invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('invitation_type', 'trial')
      .single()

    if (invitation) {
      // Log the answer submission
      await adminClient.from('trial_activity_events').insert({
        user_id: userId,
        email: email.toLowerCase(),
        event_type: 'answer_submitted',
        event_data: { sheet_id: sheetId, answer_count: answerCount },
      })
    }
  } catch (error) {
    // Silently ignore - tracking should never break the main flow
    console.error('Trial activity logging error:', error)
  }
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
    const supabase = await createClient()

    // Require an authenticated session; there is no service-role fallback.
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
      .select('id, company_id')
      .eq('id', user.id)
      .single()

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

    // Only check access if we have a matching users row
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

    // Get existing answers for this sheet to determine update vs insert.
    // additional_notes is included so choice resolution can clear a stale
    // mismatch note when a re-submission resolves cleanly.
    const { data: existingAnswers } = await supabase
      .from('answers')
      .select('id, question_id, list_table_row_id, list_table_column_id, additional_notes')
      .eq('sheet_id', sheet_id)

    // Build lookup maps for existing answers
    const existingMap = new Map<string, string>()
    const existingNotes = new Map<string, string | null>()
    existingAnswers?.forEach(a => {
      const key = `${a.question_id}|${a.list_table_row_id || ''}|${a.list_table_column_id || ''}`
      existingMap.set(key, a.id)
      existingNotes.set(a.id, a.additional_notes)
    })

    // Determine which of the target questions are choice questions, so that
    // extracted text lands in choice_id (what the classic sheet view and
    // Excel export read) instead of text_value. Detection is server-side and
    // independent of the `type` the caller sent: response_type is the real
    // discriminator since question_type is null for all HQ2.1 data.
    const distinctQuestionIds = [...new Set(answers.map((a) => a.question_id).filter(Boolean))]

    const choiceQuestionIds = new Set<string>()
    if (distinctQuestionIds.length > 0) {
      const batchSize = 100
      for (let i = 0; i < distinctQuestionIds.length; i += batchSize) {
        const batch = distinctQuestionIds.slice(i, i + batchSize)
        const { data: qRows } = await supabase
          .from('questions')
          .select('id, response_type')
          .in('id', batch)

        qRows?.forEach((q) => {
          if (q.response_type && CHOICE_RESPONSE_TYPES.has(q.response_type)) {
            choiceQuestionIds.add(q.id)
          }
        })
      }
      // Also honor an explicit `type: 'choice'` from the caller even if the
      // question's response_type isn't one we recognize.
      answers.forEach((a) => {
        if (a.type === 'choice') choiceQuestionIds.add(a.question_id)
      })
    }

    // Preload choices for those questions so each answer can be resolved
    // without a query per row.
    const choicesByQuestion = new Map<string, { id: string; content: string | null }[]>()
    if (choiceQuestionIds.size > 0) {
      const ids = [...choiceQuestionIds]
      const batchSize = 100
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        const { data: choiceRows } = await supabase
          .from('choices')
          .select('id, content, question_id')
          .in('question_id', batch)

        choiceRows?.forEach((c) => {
          if (!c.question_id) return
          const list = choicesByQuestion.get(c.question_id) || []
          list.push({ id: c.id, content: c.content })
          choicesByQuestion.set(c.question_id, list)
        })
      }
    }

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

        // Find existing answer ID (needed here so choice resolution can
        // clear stale sibling fields on update)
        const lookupKey = `${question_id}|${list_table_row_id || ''}|${list_table_column_id || ''}`
        const existingId = answer_id || existingMap.get(lookupKey)

        // Choice resolution: applies whenever the target question is a
        // choice question (per response_type) or the caller explicitly said
        // `type: 'choice'`, regardless of whether the value is already a
        // choice id (existing UI flows) or raw extracted display text.
        // The matched and unmatched states are mutually exclusive: each
        // branch explicitly nulls the sibling fields so a re-submission
        // cannot leave a stale choice_id or text_value behind (the classic
        // view and export read choice_id preferentially).
        const isChoiceTarget = type === 'choice' || choiceQuestionIds.has(question_id)

        if (isChoiceTarget) {
          const raw = value === null || value === undefined ? '' : String(value)
          const choices = choicesByQuestion.get(question_id) || []
          const matched =
            choices.find((c) => c.id === raw) ||
            choices.find((c) => (c.content || '').trim().toLowerCase() === raw.trim().toLowerCase())

          if (raw === '') {
            answerData.choice_id = null
          } else if (matched) {
            answerData.choice_id = matched.id
            answerData.text_value = null
            // Clear a leftover mismatch note from a previous unmatched save,
            // but only if that note is the only content (and the caller did
            // not supply their own additional_notes this time).
            if (answerData.additional_notes === undefined && existingId) {
              const prevNote = existingNotes.get(existingId)
              if (prevNote && prevNote.trim() === CHOICE_MISMATCH_NOTE) {
                answerData.additional_notes = null
              }
            }
          } else {
            // No predefined choice matched; keep the extracted text visible
            // and flag it instead of silently writing an unresolvable choice_id.
            answerData.choice_id = null
            answerData.text_value = raw
            answerData.additional_notes = answerData.additional_notes
              ? `${answerData.additional_notes}; ${CHOICE_MISMATCH_NOTE}`
              : CHOICE_MISMATCH_NOTE
          }
        } else {
          // Set value based on type
          switch (type) {
            case 'boolean':
              answerData.boolean_value = value as boolean
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
        }

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

    // Log trial activity if answers were saved (non-blocking)
    if (successCount > 0 && user?.email) {
      logTrialActivity(user.email, user.id, sheet_id, successCount)
    }

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
