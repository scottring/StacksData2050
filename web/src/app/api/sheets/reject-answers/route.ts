import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { sheetId, rejections } = await request.json()

    if (!sheetId || !rejections || !Array.isArray(rejections)) {
      return NextResponse.json({ error: 'Missing sheetId or rejections' }, { status: 400 })
    }

    // Verify the sheet exists and get its answers
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('id, question_id')
      .eq('sheet_id', sheetId)

    if (answersError) {
      return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 })
    }

    // Create a map of question_id -> answer_id
    const questionToAnswer = new Map<string, string>()
    answers?.forEach(a => {
      if (!questionToAnswer.has(a.question_id)) {
        questionToAnswer.set(a.question_id, a.id)
      }
    })

    // Insert rejections
    const insertResults = []
    for (const rejection of rejections) {
      const answerId = questionToAnswer.get(rejection.questionId)
      if (answerId) {
        const { error } = await supabase
          .from('answer_rejections')
          .insert({
            answer_id: answerId,
            reason: rejection.reason
          })
        
        if (error) {
          console.error('Failed to insert rejection:', error)
          insertResults.push({ questionId: rejection.questionId, success: false, error: error.message })
        } else {
          insertResults.push({ questionId: rejection.questionId, success: true })
        }
      } else {
        insertResults.push({ questionId: rejection.questionId, success: false, error: 'No answer found' })
      }
    }

    // Update sheet status to flagged
    await supabase
      .from('sheets')
      .update({ status: 'flagged', modified_at: new Date().toISOString() })
      .eq('id', sheetId)

    return NextResponse.json({ 
      success: true, 
      inserted: insertResults.filter(r => r.success).length,
      results: insertResults 
    })

  } catch (error) {
    console.error('Error in reject-answers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
