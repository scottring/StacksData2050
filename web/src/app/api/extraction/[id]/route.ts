import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: doc, error: docError } = await supabase
    .from('extraction_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: items } = await supabase
    .from('extraction_items')
    .select('*')
    .eq('document_id', id)
    .order('item_type')
    .order('created_at')

  return NextResponse.json({ document: doc, items: items || [] })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get document to find storage file path
  const { data: doc } = await supabase
    .from('extraction_documents')
    .select('file_path')
    .eq('id', id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Delete extraction items (cascade should handle this, but be explicit)
  await supabase.from('extraction_items').delete().eq('document_id', id)

  // Delete the document record
  await supabase.from('extraction_documents').delete().eq('id', id)

  // Delete the file from storage
  if (doc.file_path) {
    await supabase.storage.from('extraction-documents').remove([doc.file_path])
  }

  return NextResponse.json({ success: true })
}
