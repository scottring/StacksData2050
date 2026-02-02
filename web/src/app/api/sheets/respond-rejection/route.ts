import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { sheetId, responses } = await request.json()

    if (!sheetId || !responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Missing sheetId or responses' }, { status: 400 })
    }

    // Get answers for this sheet to map question_id -> answer_id
    const { data: answers } = await supabase
      .from('answers')
      .select('id, question_id')
      .eq('sheet_id', sheetId)

    const questionToAnswer = new Map<string, string>()
    answers?.forEach(a => {
      if (!questionToAnswer.has(a.question_id)) {
        questionToAnswer.set(a.question_id, a.id)
      }
    })

    // Update each rejection with the response (add to comments array)
    const results = []
    for (const resp of responses) {
      const answerId = questionToAnswer.get(resp.questionId)
      if (answerId) {
        // Get current rejection to append to comments
        const { data: rejections } = await supabase
          .from('answer_rejections')
          .select('id, comments')
          .eq('answer_id', answerId)
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        if (rejections && rejections.length > 0) {
          const rejection = rejections[0]
          const currentComments = rejection.comments || []

          const newComment = {
            role: 'supplier',
            text: resp.response,
            created_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('answer_rejections')
            .update({
              response: resp.response, // Keep for backwards compatibility
              comments: [...currentComments, newComment]
            })
            .eq('id', rejection.id)

          if (error) {
            results.push({ questionId: resp.questionId, success: false, error: error.message })
          } else {
            results.push({ questionId: resp.questionId, success: true })
          }
        } else {
          results.push({ questionId: resp.questionId, success: false, error: 'No active flag found' })
        }
      }
    }

    return NextResponse.json({ success: true, results })

  } catch (error) {
    console.error('Error in respond-rejection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
