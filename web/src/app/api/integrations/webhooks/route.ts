import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// POST - Create new webhook
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
    const { name, url, events = ['sheet.submitted'] } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'URL must use HTTPS' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 })
    }

    // Validate events
    const validEvents = ['sheet.created', 'sheet.submitted', 'sheet.approved', 'sheet.rejected', 'sheet.updated']
    for (const event of events) {
      if (!validEvents.includes(event)) {
        return NextResponse.json({ error: `Invalid event: ${event}` }, { status: 400 })
      }
    }

    // Generate webhook secret for HMAC verification
    const secret = crypto.randomBytes(32).toString('hex')

    // Insert webhook
    const { data: webhook, error: insertError } = await supabase
      .from('webhooks')
      .insert({
        company_id: userData.company_id,
        name: name.trim(),
        url,
        secret,
        events,
        created_by: user.id
      })
      .select('id, name, url, events, is_active, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create webhook:', insertError)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        secret // Show secret only once
      }
    })
  } catch (error) {
    console.error('Webhook creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List webhooks
export async function GET(request: NextRequest) {
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

    // Fetch webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('id, name, url, events, is_active, last_triggered_at, last_status_code, failure_count, created_at')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch webhooks:', error)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Webhooks fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete webhook
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get webhook ID from URL
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
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

    // Delete webhook
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('company_id', userData.company_id)

    if (error) {
      console.error('Failed to delete webhook:', error)
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
