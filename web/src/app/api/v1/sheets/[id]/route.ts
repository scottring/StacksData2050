import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateAPIKey,
  hasScope,
  checkRateLimit,
  logAPIUsage,
  apiError,
  apiSuccess
} from '@/lib/api-auth'
import { getSheetExportData } from '@/lib/export/sheet-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: sheetId } = await params

  // Authenticate
  const auth = await authenticateAPIKey(request)
  if (!auth) {
    return apiError('Invalid or missing API key', 401)
  }

  // Check scope
  if (!hasScope(auth, 'sheets:read')) {
    return apiError('Insufficient permissions. Required scope: sheets:read', 403)
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
      endpoint: `/api/v1/sheets/${sheetId}`,
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
      endpoint: `/api/v1/sheets/${sheetId}`,
      method: 'GET',
      statusCode: 403,
      responseTimeMs: Date.now() - startTime
    })
    return apiError('Access denied to this sheet', 403)
  }

  // Get full sheet data
  const sheetData = await getSheetExportData(supabase, sheetId)

  // Log usage
  await logAPIUsage({
    apiKeyId: auth.keyId,
    companyId: auth.companyId,
    endpoint: `/api/v1/sheets/${sheetId}`,
    method: 'GET',
    statusCode: sheetData ? 200 : 500,
    responseTimeMs: Date.now() - startTime,
    requestIp: request.headers.get('x-forwarded-for') || undefined
  })

  if (!sheetData) {
    return apiError('Failed to fetch sheet data', 500)
  }

  return apiSuccess({
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
