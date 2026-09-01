import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET_NAME = 'question-attachments'

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Labels for sheet-level documents. RDS = Regulatory Data Sheet,
// SDS = Safety Data Sheet -- the two suppliers send most often.
const SHEET_DOCUMENT_TYPES = ['RDS', 'SDS', 'Other']

// GET - Fetch attachments for a sheet/question
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const sheetId = searchParams.get('sheet_id')
  const questionId = searchParams.get('question_id')

  if (!sheetId) {
    return NextResponse.json({ error: 'sheet_id is required' }, { status: 400 })
  }

  let query = supabase
    .from('question_attachments')
    .select(`
      id,
      question_id,
      document_type,
      file_name,
      file_path,
      file_size,
      mime_type,
      created_at,
      user_id
    `)
    .eq('sheet_id', sheetId)
    .order('created_at', { ascending: false })

  // scope=sheet returns only the sheet-level documents (supplier RDS/SDS and
  // similar), which are the rows with no question_id.
  if (searchParams.get('scope') === 'sheet') {
    query = query.is('question_id', null)
  } else if (questionId) {
    query = query.eq('question_id', questionId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs for each attachment
  const attachmentsWithUrls = await Promise.all(
    (data || []).map(async (attachment) => {
      const { data: signedUrlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(attachment.file_path, 3600) // 1 hour expiry

      return {
        ...attachment,
        download_url: signedUrlData?.signedUrl || null,
      }
    })
  )

  return NextResponse.json(attachmentsWithUrls)
}

// POST - Upload a new attachment
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const sheetId = formData.get('sheet_id') as string | null
  const questionId = formData.get('question_id') as string | null
  const documentType = formData.get('document_type') as string | null

  // question_id is optional: without it the file attaches to the sheet as a
  // whole, which is how supplier RDS/SDS documents are stored -- they describe
  // the product rather than answering one question.
  if (!file || !sheetId) {
    return NextResponse.json(
      { error: 'file and sheet_id are required' },
      { status: 400 }
    )
  }

  if (documentType && !SHEET_DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json(
      { error: `document_type must be one of: ${SHEET_DOCUMENT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed. Allowed types: PDF, Word, Excel, CSV, TXT, PNG, JPG, GIF` },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File size exceeds 50MB limit' },
      { status: 400 }
    )
  }

  // Path: user_id/sheet_id/<question_id|_sheet>/timestamp_filename
  // Segment 2 is always the sheet id, which is what the storage RLS policies
  // read to scope access to the companies party to that sheet.
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const scopeSegment = questionId ?? '_sheet'
  const filePath = `${user.id}/${sheetId}/${scopeSegment}/${timestamp}_${sanitizedFileName}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Create database record
  const { data, error: dbError } = await supabase
    .from('question_attachments')
    .insert({
      sheet_id: sheetId,
      question_id: questionId,
      document_type: questionId ? null : documentType ?? 'Other',
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select(`
      id,
      question_id,
      document_type,
      file_name,
      file_path,
      file_size,
      mime_type,
      created_at,
      user_id
    `)
    .single()

  if (dbError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from(BUCKET_NAME).remove([filePath])
    console.error('Error creating attachment record:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Generate signed URL for the new attachment
  const { data: signedUrlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600)

  return NextResponse.json({
    ...data,
    download_url: signedUrlData?.signedUrl || null,
  })
}

// DELETE - Delete an attachment
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const attachmentId = searchParams.get('id')

  if (!attachmentId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Get the attachment to find the file path
  const { data: attachment, error: fetchError } = await supabase
    .from('question_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single()

  if (fetchError || !attachment) {
    console.error('Error fetching attachment:', fetchError)
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([attachment.file_path])

  if (storageError) {
    console.error('Error deleting file from storage:', storageError)
    // Continue to delete the database record even if storage delete fails
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('question_attachments')
    .delete()
    .eq('id', attachmentId)

  if (dbError) {
    console.error('Error deleting attachment record:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
