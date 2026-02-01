import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSheetExportData, verifySheetAccess } from '@/lib/export/sheet-data'
import { generateExcelWorkbook, workbookToBuffer, getContentType } from '@/lib/export/excel'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      sheet_ids,
      format = 'xlsx',
      include_metadata = true,
      sap_format = false
    } = body

    if (!sheet_ids || !Array.isArray(sheet_ids) || sheet_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one sheet_id is required' },
        { status: 400 }
      )
    }

    // Verify access to sheets
    const accessibleSheetIds = await verifySheetAccess(supabase, sheet_ids, userData.company_id)

    if (accessibleSheetIds.length === 0) {
      return NextResponse.json(
        { error: 'No accessible sheets found' },
        { status: 404 }
      )
    }

    // Fetch data for each sheet
    const sheetsData = []
    for (const sheetId of accessibleSheetIds) {
      const data = await getSheetExportData(supabase, sheetId)
      if (data) {
        sheetsData.push(data)
      }
    }

    if (sheetsData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch sheet data' },
        { status: 500 }
      )
    }

    // Generate workbook
    const workbook = generateExcelWorkbook(sheetsData, {
      includeMetadata: include_metadata,
      sapFormat: sap_format
    })

    // Convert to buffer
    const buffer = workbookToBuffer(workbook, format)

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = sheetsData.length === 1
      ? `${sheetsData[0].sheet.name.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.${format}`
      : `stacks-export-${timestamp}.${format}`

    // Log export
    await supabase.from('export_logs').insert({
      company_id: userData.company_id,
      user_id: user.id,
      export_type: format,
      sheet_ids: accessibleSheetIds,
      file_size_bytes: buffer.length
    })

    // Return file as blob
    const blob = new Blob([buffer.buffer as ArrayBuffer], { type: getContentType(format) })
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
