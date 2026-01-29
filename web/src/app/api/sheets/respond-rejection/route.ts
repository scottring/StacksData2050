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

    // Update each rejection with the response
    const results = []
    for (const resp of responses) {
      const answerId = questionToAnswer.get(resp.questionId)
      if (answerId) {
        const { error } = await supabase
          .from('answer_rejections')
          .update({ response: resp.response })
          .eq('answer_id', answerId)
        
        if (error) {
          results.push({ questionId: resp.questionId, success: false, error: error.message })
        } else {
          results.push({ questionId: resp.questionId, success: true })
        }
      }
    }

    return NextResponse.json({ success: true, results })

  } catch (error) {
    console.error('Error in respond-rejection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
