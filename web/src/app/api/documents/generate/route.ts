import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDocument, DocumentType } from '@/lib/documents/generate'

const VALID_TYPES: DocumentType[] = [
  'reach_svhc_declaration',
  'fda_compliance_letter',
  'dpp_json_ld',
  'china_gb_certificate',
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { assessment_id, document_type, language } = body

  if (!assessment_id) {
    return NextResponse.json({ error: 'assessment_id is required' }, { status: 400 })
  }

  if (!document_type || !VALID_TYPES.includes(document_type)) {
    return NextResponse.json({
      error: `Invalid document_type. Must be one of: ${VALID_TYPES.join(', ')}`,
    }, { status: 400 })
  }

  const result = await generateDocument({
    assessmentId: assessment_id,
    documentType: document_type,
    language,
  })

  if (result.status === 'failed') {
    return NextResponse.json({ error: result.error, ...result }, { status: 500 })
  }

  return NextResponse.json(result)
}

export const maxDuration = 30
