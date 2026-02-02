import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type TrialEventType =
  | 'login'
  | 'page_view'
  | 'sheet_viewed'
  | 'sheet_created'
  | 'answer_submitted'
  | 'answer_updated'
  | 'file_uploaded'
  | 'export_downloaded'
  | 'discovery_started'
  | 'discovery_completed'
  | 'follow_up_completed'

interface LogEventRequest {
  event_type: TrialEventType
  event_data?: Record<string, unknown>
  page_path?: string
  email?: string // For pre-auth tracking
}

// POST - Log a trial activity event
export async function POST(request: Request) {
  try {
    const body: LogEventRequest = await request.json()
    const { event_type, event_data = {}, page_path, email: providedEmail } = body

    if (!event_type) {
      return NextResponse.json(
        { error: 'event_type is required' },
        { status: 400 }
      )
    }

    // Get current user if authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Determine email - either from auth or provided (for pre-signup tracking)
    const email = user?.email || providedEmail

    if (!email) {
      return NextResponse.json(
        { error: 'Could not determine user email' },
        { status: 400 }
      )
    }

    // Check if this is a trial user by looking up their invitation
    const adminClient = createAdminClient()
    const { data: invitation } = await adminClient
      .from('invitations')
      .select('id, invitation_type')
      .eq('email', email.toLowerCase())
      .eq('invitation_type', 'trial')
      .single()

    // Only log events for trial users (or discovery/follow-up events which happen pre-signup)
    const isTrialEvent = ['discovery_started', 'discovery_completed', 'follow_up_completed'].includes(event_type)

    if (!invitation && !isTrialEvent) {
      // Not a trial user, silently skip logging
      return NextResponse.json({ success: true, logged: false })
    }

    // Insert the event using admin client to bypass RLS
    const { error: insertError } = await adminClient
      .from('trial_activity_events')
      .insert({
        user_id: user?.id || null,
        email: email.toLowerCase(),
        event_type,
        event_data,
        page_path,
      })

    if (insertError) {
      console.error('Error logging trial event:', insertError)
      return NextResponse.json(
        { error: 'Failed to log event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, logged: true })
  } catch (error) {
    console.error('Error in trial activity endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get activity events for admin dashboard
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify user is super admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const limit = parseInt(searchParams.get('limit') || '100')

    const adminClient = createAdminClient()
    let query = adminClient
      .from('trial_activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (email) {
      query = query.eq('email', email.toLowerCase())
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching trial events:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error in trial activity GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
