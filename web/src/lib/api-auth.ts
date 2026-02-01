import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

export interface APIKeyAuth {
  keyId: string
  companyId: string
  scopes: string[]
  rateLimitMinute: number
  rateLimitDay: number
}

/**
 * Authenticates a request using API key from Authorization header
 * Expected format: Authorization: Bearer sk_live_...
 */
export async function authenticateAPIKey(
  request: NextRequest
): Promise<APIKeyAuth | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer sk_')) {
    return null
  }

  const apiKey = authHeader.replace('Bearer ', '')
  const keyPrefix = apiKey.substring(0, 12)
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  // Use service role client for API key validation
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('id, company_id, scopes, rate_limit_per_minute, rate_limit_per_day, is_active, expires_at')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRecord || !keyRecord.is_active) {
    return null
  }

  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return null
  }

  // Update last_used_at (non-blocking)
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)

  return {
    keyId: keyRecord.id,
    companyId: keyRecord.company_id,
    scopes: keyRecord.scopes || [],
    rateLimitMinute: keyRecord.rate_limit_per_minute || 60,
    rateLimitDay: keyRecord.rate_limit_per_day || 10000
  }
}

/**
 * Checks if the API key has the required scope
 */
export function hasScope(auth: APIKeyAuth, requiredScope: string): boolean {
  return auth.scopes.includes(requiredScope)
}

/**
 * Logs API usage for rate limiting and analytics
 */
export async function logAPIUsage(params: {
  apiKeyId: string
  companyId: string
  endpoint: string
  method: string
  statusCode: number
  responseTimeMs: number
  requestIp?: string
}): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    await supabase.from('api_usage_logs').insert({
      api_key_id: params.apiKeyId,
      company_id: params.companyId,
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      request_ip: params.requestIp || 'unknown'
    })
  } catch (error) {
    console.error('Failed to log API usage:', error)
  }
}

/**
 * Checks rate limits for an API key
 */
export async function checkRateLimit(
  keyId: string,
  limits: { minute: number; day: number }
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60000)
  const oneDayAgo = new Date(now.getTime() - 86400000)

  // Check minute limit
  const { count: minuteCount } = await supabase
    .from('api_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', keyId)
    .gte('created_at', oneMinuteAgo.toISOString())

  if ((minuteCount || 0) >= limits.minute) {
    return { allowed: false, retryAfter: 60 }
  }

  // Check day limit
  const { count: dayCount } = await supabase
    .from('api_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', keyId)
    .gte('created_at', oneDayAgo.toISOString())

  if ((dayCount || 0) >= limits.day) {
    return { allowed: false, retryAfter: 3600 }
  }

  return { allowed: true }
}

/**
 * Standard error response for API endpoints
 */
export function apiError(
  message: string,
  status: number = 400,
  details?: string
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details })
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Standard success response for API endpoints
 */
export function apiSuccess(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
