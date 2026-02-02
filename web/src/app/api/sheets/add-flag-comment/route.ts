import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { sheetId, questionId, comment, role } = await request.json()

    if (!sheetId || !questionId || !comment || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['customer', 'supplier'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get the answer for this question in this sheet
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('sheet_id', sheetId)
      .eq('question_id', questionId)

    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: 'No answer found' }, { status: 404 })
    }

    const answerId = answers[0].id

    // Get the unresolved rejection for this answer
    const { data: rejections } = await supabase
      .from('answer_rejections')
      .select('id, comments')
      .eq('answer_id', answerId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!rejections || rejections.length === 0) {
      return NextResponse.json({ error: 'No active flag found' }, { status: 404 })
    }

    const rejection = rejections[0]
    const currentComments = rejection.comments || []

    // Add the new comment
    const newComment = {
      role,
      text: comment,
      created_at: new Date().toISOString()
    }

    const updatedComments = [...currentComments, newComment]

    // Update the rejection with new comments
    const { error } = await supabase
      .from('answer_rejections')
      .update({ comments: updatedComments })
      .eq('id', rejection.id)

    if (error) {
      console.error('Error adding comment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, comment: newComment })

  } catch (error) {
    console.error('Error in add-flag-comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
