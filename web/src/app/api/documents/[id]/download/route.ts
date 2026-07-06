import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Fetch document record
  const { data: doc, error } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (!userData?.company_id || doc.company_id !== userData.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (doc.status !== 'ready' || !doc.file_path) {
    return NextResponse.json({ error: 'Document not ready for download' }, { status: 400 })
  }

  // Create signed URL
  const { data: signedUrl, error: signError } = await supabase.storage
    .from('generated-documents')
    .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

  if (signError || !signedUrl) {
    return NextResponse.json({ error: 'Failed to create download URL' }, { status: 500 })
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    fileName: doc.file_name,
    mimeType: doc.mime_type,
  })
}
