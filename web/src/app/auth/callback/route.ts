import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Helper to log trial login (non-blocking)
async function logTrialLogin(email: string, userId: string) {
  try {
    const adminClient = createAdminClient()

    // Check if this is a trial user
    const { data: invitation } = await adminClient
      .from('invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('invitation_type', 'trial')
      .single()

    if (invitation) {
      await adminClient.from('trial_activity_events').insert({
        user_id: userId,
        email: email.toLowerCase(),
        event_type: 'login',
        event_data: {},
      })
    }
  } catch (error) {
    // Silently ignore - tracking should never break login
    console.error('Trial login tracking error:', error)
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Log login for trial users (non-blocking)
      if (data.user.email) {
        logTrialLogin(data.user.email, data.user.id)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
