import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      email,
      company_name,
      token,
      motivation_interest,
      learning_goals,
      success_definition,
      impact_measurement,
      concerns_questions,
    } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check at least one question is answered
    const hasAnswer = [
      motivation_interest,
      learning_goals,
      success_definition,
      impact_measurement,
      concerns_questions,
    ].some(answer => answer && answer.trim().length > 0)

    if (!hasAnswer) {
      return NextResponse.json({ error: 'Please answer at least one question' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // If token provided, validate and get invitation
    let invitationId: string | null = null
    if (token) {
      const { data: invitation } = await supabase
        .from('invitations')
        .select('id, email')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (invitation) {
        invitationId = invitation.id
      }
    }

    // Check if discovery response already exists for this email
    const { data: existingResponse } = await supabase
      .from('trial_discovery_responses')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingResponse) {
      // Update existing response instead of creating duplicate
      const { error: updateError } = await supabase
        .from('trial_discovery_responses')
        .update({
          company_name,
          motivation_interest,
          learning_goals,
          success_definition,
          impact_measurement,
          concerns_questions,
          invitation_id: invitationId || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingResponse.id)

      if (updateError) {
        console.error('Error updating discovery response:', updateError)
        return NextResponse.json({ error: 'Failed to update response' }, { status: 500 })
      }
    } else {
      // Create new discovery response
      const { error: insertError } = await supabase
        .from('trial_discovery_responses')
        .insert({
          email: email.toLowerCase(),
          company_name,
          invitation_id: invitationId,
          motivation_interest,
          learning_goals,
          success_definition,
          impact_measurement,
          concerns_questions,
          responded_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error creating discovery response:', insertError)
        return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
      }
    }

    // Build redirect URL
    let redirectUrl = '/auth/signup'
    if (token) {
      redirectUrl += `?token=${token}`
    }

    return NextResponse.json({
      success: true,
      redirect_url: redirectUrl,
    })
  } catch (error: any) {
    console.error('Discovery submission error:', error)
    return NextResponse.json({
      error: 'Something went wrong. Please try again.',
      details: error.message,
    }, { status: 500 })
  }
}

// GET endpoint to check if user has already submitted discovery
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: response } = await supabase
      .from('trial_discovery_responses')
      .select('id, responded_at, trial_started_at')
      .eq('email', email.toLowerCase())
      .single()

    return NextResponse.json({
      hasSubmitted: !!response,
      response: response || null,
    })
  } catch (error: any) {
    console.error('Discovery check error:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
