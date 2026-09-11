import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { verifySheetAccess } from '@/lib/export/sheet-data'
import { getSheetDocument } from '@/lib/export/sheet-document'
import { SheetPdfDocument } from '@/lib/export/sheet-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/export/pdf?sheet_id=<id>
 *
 * Renders the full questionnaire response (all sections, questions,
 * answers, list tables, custom questions, attachment names) as a PDF.
 * Available to the supplier and the requesting customer of the sheet.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sheetId = request.nextUrl.searchParams.get('sheet_id')
    if (!sheetId) {
      return NextResponse.json({ error: 'sheet_id is required' }, { status: 400 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 })
    }

    const accessible = await verifySheetAccess(supabase, [sheetId], userData.company_id)
    if (accessible.length === 0) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
    }

    const doc = await getSheetDocument(supabase, sheetId)
    if (!doc) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
    }

    const element = React.createElement(SheetPdfDocument, { doc })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    const safeName = doc.sheet.name.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'sheet'
    const date = doc.generatedAt.slice(0, 10)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_${date}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
