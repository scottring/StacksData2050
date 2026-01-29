import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { sheetId, questionId, resolveAll } = await request.json()

    if (!sheetId || !questionId) {
      return NextResponse.json({ error: 'Missing sheetId or questionId' }, { status: 400 })
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

    const answerIds = answers.map(a => a.id)

    // Resolve (set resolved_at) for unresolved rejections
    const { error } = await supabase
      .from('answer_rejections')
      .update({ resolved_at: new Date().toISOString() })
      .in('answer_id', answerIds)
      .is('resolved_at', null)

    if (error) {
      console.error('Error resolving flags:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in resolve-flag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
