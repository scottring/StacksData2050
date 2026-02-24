import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDocument } from '@/lib/extraction/process'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { document_id } = body

  if (!document_id) {
    return NextResponse.json({ error: 'document_id is required' }, { status: 400 })
  }

  // Verify document exists and belongs to user's company
  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('id, status')
    .eq('id', document_id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.status === 'processing') {
    return NextResponse.json({ error: 'Document is already being processed' }, { status: 409 })
  }

  // Process the document with Claude
  const result = await processDocument(document_id)

  if (result.status === 'failed') {
    return NextResponse.json({ error: result.error, ...result }, { status: 500 })
  }

  return NextResponse.json(result)
}

export const maxDuration = 60 // Allow up to 60 seconds for Claude processing
