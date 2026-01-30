import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch comments for a sheet/question
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const sheetId = searchParams.get('sheet_id')
  const questionId = searchParams.get('question_id')

  if (!sheetId) {
    return NextResponse.json({ error: 'sheet_id is required' }, { status: 400 })
  }

  let query = supabase
    .from('question_comments')
    .select(`
      id,
      question_id,
      content,
      created_at,
      updated_at,
      user_id
    `)
    .eq('sheet_id', sheetId)
    .order('created_at', { ascending: true })

  if (questionId) {
    query = query.eq('question_id', questionId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { sheet_id, question_id, content } = body

  if (!sheet_id || !question_id || !content?.trim()) {
    return NextResponse.json(
      { error: 'sheet_id, question_id, and content are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('question_comments')
    .insert({
      sheet_id,
      question_id,
      user_id: user.id,
      content: content.trim(),
    })
    .select(`
      id,
      question_id,
      content,
      created_at,
      user_id
    `)
    .single()

  if (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE - Delete a comment
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const commentId = searchParams.get('id')

  if (!commentId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('question_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
