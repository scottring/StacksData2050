import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAPIKey,
  hasScope,
  checkRateLimit,
  logAPIUsage,
  apiError
} from '@/lib/api-auth'
import { getSheetExportData } from '@/lib/export/sheet-data'
import { generateExcelWorkbook, workbookToBuffer, getContentType } from '@/lib/export/excel'
import { convertToSAPFormat, convertToSAPXML, convertToSAPSimpleJSON } from '@/lib/export/sap'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: sheetId } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  // Authenticate
  const auth = await authenticateAPIKey(request)
  if (!auth) {
    return apiError('Invalid or missing API key', 401)
  }

  // Check scope
  if (!hasScope(auth, 'sheets:export')) {
    return apiError('Insufficient permissions. Required scope: sheets:export', 403)
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(auth.keyId, {
    minute: auth.rateLimitMinute,
    day: auth.rateLimitDay
  })

  if (!rateCheck.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: rateCheck.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter)
        }
      }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify access to sheet
  const { data: sheet, error: sheetError } = await supabase
    .from('sheets')
    .select('id, company_id, requesting_company_id')
    .eq('id', sheetId)
    .single()

  if (sheetError || !sheet) {
    await logAPIUsage({
      apiKeyId: auth.keyId,
      companyId: auth.companyId,
      endpoint: `/api/v1/sheets/${sheetId}/export`,
      method: 'GET',
      statusCode: 404,
      responseTimeMs: Date.now() - startTime
    })
    return apiError('Sheet not found', 404)
  }

  // Check company access
  if (sheet.company_id !== auth.companyId && sheet.requesting_company_id !== auth.companyId) {
    await logAPIUsage({
      apiKeyId: auth.keyId,
      companyId: auth.companyId,
      endpoint: `/api/v1/sheets/${sheetId}/export`,
      method: 'GET',
      statusCode: 403,
      responseTimeMs: Date.now() - startTime
    })
    return apiError('Access denied to this sheet', 403)
  }

  // Get sheet data
  const sheetData = await getSheetExportData(supabase, sheetId)

  if (!sheetData) {
    await logAPIUsage({
      apiKeyId: auth.keyId,
      companyId: auth.companyId,
      endpoint: `/api/v1/sheets/${sheetId}/export`,
      method: 'GET',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime
    })
    return apiError('Failed to fetch sheet data', 500)
  }

  // Log export
  await supabase.from('export_logs').insert({
    company_id: auth.companyId,
    api_key_id: auth.keyId,
    export_type: format,
    sheet_ids: [sheetId]
  })

  // Generate export based on format
  let response: NextResponse

  switch (format) {
    case 'xlsx':
    case 'excel': {
      const workbook = generateExcelWorkbook([sheetData], { includeMetadata: true })
      const buffer = workbookToBuffer(workbook, 'xlsx')
      const filename = `${sheetData.sheet.name.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: getContentType('xlsx') })

      response = new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': getContentType('xlsx'),
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      }) as NextResponse
      break
    }

    case 'csv': {
      const workbook = generateExcelWorkbook([sheetData], { includeMetadata: false })
      const buffer = workbookToBuffer(workbook, 'csv')
      const filename = `${sheetData.sheet.name.replace(/[^a-zA-Z0-9]/g, '-')}.csv`
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: getContentType('csv') })

      response = new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': getContentType('csv'),
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      }) as NextResponse
      break
    }

    case 'sap':
    case 'sap_json': {
      const sapData = convertToSAPFormat(sheetData)
      const filename = `${sheetData.sheet.name.replace(/[^a-zA-Z0-9]/g, '-')}-sap.json`

      response = new NextResponse(JSON.stringify(sapData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
      break
    }

    case 'sap_xml':
    case 'idoc': {
      const xmlContent = convertToSAPXML(sheetData)
      const filename = `${sheetData.sheet.name.replace(/[^a-zA-Z0-9]/g, '-')}-idoc.xml`

      response = new NextResponse(xmlContent, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
      break
    }

    case 'sap_simple': {
      const simpleData = convertToSAPSimpleJSON(sheetData)
      const filename = `${sheetData.sheet.name.replace(/[^a-zA-Z0-9]/g, '-')}-sap-simple.json`

      response = new NextResponse(JSON.stringify(simpleData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
      break
    }

    case 'json':
    default: {
      response = NextResponse.json({
        data: {
          id: sheetData.sheet.id,
          name: sheetData.sheet.name,
          status: sheetData.sheet.status,
          version: sheetData.sheet.version,
          created_at: sheetData.sheet.created_at,
          modified_at: sheetData.sheet.modified_at,
          supplier: sheetData.supplier,
          customer: sheetData.customer,
          tags: sheetData.tags,
          sections: sheetData.sections,
          list_tables: sheetData.listTables
        }
      })
    }
  }

  // Log usage
  await logAPIUsage({
    apiKeyId: auth.keyId,
    companyId: auth.companyId,
    endpoint: `/api/v1/sheets/${sheetId}/export`,
    method: 'GET',
    statusCode: 200,
    responseTimeMs: Date.now() - startTime,
    requestIp: request.headers.get('x-forwarded-for') || undefined
  })

  return response
}
