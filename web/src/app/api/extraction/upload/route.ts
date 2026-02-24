import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET_NAME = 'extraction-documents'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const ALLOWED_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const documentType = formData.get('document_type') as string | null
  const sheetId = formData.get('sheet_id') as string | null

  if (!file || !documentType) {
    return NextResponse.json({ error: 'file and document_type are required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'File type not allowed. Upload PDF, CSV, or Excel files.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
  }

  // Get user's company
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Generate file path
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${user.id}/${timestamp}_${sanitizedName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Create database record
  const { data: doc, error: dbError } = await supabase
    .from('extraction_documents')
    .insert({
      company_id: profile?.company_id || null,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType,
      status: 'uploaded',
      sheet_id: sheetId || null,
    })
    .select()
    .single()

  if (dbError) {
    // Clean up uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([filePath])
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json(doc)
}
