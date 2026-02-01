import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// POST - Test webhook delivery
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
    const { webhook_id } = body

    if (!webhook_id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    // Fetch webhook
    const { data: webhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhook_id)
      .eq('company_id', userData.company_id)
      .single()

    if (fetchError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Create test payload
    const payload = {
      id: crypto.randomUUID(),
      event: 'test.ping',
      created_at: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Stacks',
        webhook_id: webhook.id,
        webhook_name: webhook.name
      }
    }

    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex')

    // Attempt delivery
    const startTime = Date.now()
    let statusCode = 0
    let responseBody = ''
    let errorMessage = ''

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Stacks-Signature': signature,
          'X-Stacks-Delivery-ID': payload.id,
          'X-Stacks-Event': payload.event,
          'User-Agent': 'Stacks-Webhook/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      statusCode = response.status
      responseBody = await response.text().catch(() => '')
    } catch (error: any) {
      errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message
    }

    const responseTimeMs = Date.now() - startTime

    // Log delivery attempt
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: 'test.ping',
      payload,
      response_status: statusCode,
      response_body: responseBody.substring(0, 1000),
      response_time_ms: responseTimeMs,
      attempt_number: 1,
      error_message: errorMessage || null
    })

    // Update webhook status
    const isSuccess = statusCode >= 200 && statusCode < 300

    await supabase
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode,
        failure_count: isSuccess ? 0 : webhook.failure_count + 1
      })
      .eq('id', webhook.id)

    return NextResponse.json({
      success: isSuccess,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      error: errorMessage || null
    })
  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
