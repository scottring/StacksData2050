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

export async function GET(request: NextRequest) {
  const startTime = Date.now()

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

  // Parse query params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const status = searchParams.get('status')

  // Build query
  let query = supabase
    .from('sheets')
    .select(`
      id,
      name,
      status,
      version,
      created_at,
      modified_at,
      supplier:companies!sheets_company_id_fkey(id, name),
      customer:companies!sheets_requesting_company_id_fkey(id, name)
    `, { count: 'exact' })
    .or(`company_id.eq.${auth.companyId},requesting_company_id.eq.${auth.companyId}`)
    .order('modified_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: sheets, count, error } = await query

  // Log usage
  await logAPIUsage({
    apiKeyId: auth.keyId,
    companyId: auth.companyId,
    endpoint: '/api/v1/sheets',
    method: 'GET',
    statusCode: error ? 500 : 200,
    responseTimeMs: Date.now() - startTime,
    requestIp: request.headers.get('x-forwarded-for') || undefined
  })

  if (error) {
    console.error('Failed to fetch sheets:', error)
    return apiError('Failed to fetch sheets', 500)
  }

  return apiSuccess({
    data: sheets?.map(sheet => ({
      id: sheet.id,
      name: sheet.name,
      status: sheet.status,
      version: sheet.version,
      created_at: sheet.created_at,
      modified_at: sheet.modified_at,
      supplier: sheet.supplier,
      customer: sheet.customer
    })),
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit)
    }
  })
}
