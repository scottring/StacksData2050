import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { invitationId, email } = await request.json()

    if (!invitationId || !email) {
      return NextResponse.json({ error: 'Invitation ID and email are required' }, { status: 400 })
    }

    // Verify super admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Get the invitation to verify it exists and get the token
    const { data: invitation, error: invError } = await adminClient
      .from('invitations')
      .select('id, email, token, expires_at, accepted_at, invitation_type')
      .eq('id', invitationId)
      .eq('invitation_type', 'trial')
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 })
    }

    // Check if expired - if so, extend expiration
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    let newExpiresAt = invitation.expires_at

    if (expiresAt <= now) {
      // Extend by 5 days from now
      newExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      await adminClient
        .from('invitations')
        .update({ expires_at: newExpiresAt })
        .eq('id', invitationId)
    }

    // Send the email
    const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup?token=${invitation.token}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0f766e 100%); padding: 40px 30px; text-align: center; }
            .header h1 { color: #ffffff; font-size: 24px; margin: 0; }
            .header p { color: #a7f3d0; font-size: 14px; margin-top: 8px; }
            .content { background-color: #ffffff; padding: 40px 30px; }
            .content h2 { color: #1f2937; font-size: 20px; margin-top: 0; }
            .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
            .benefits { background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .benefits li { color: #166534; margin: 8px 0; }
            .footer { background-color: #f9fafb; padding: 24px 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Stacks Data</h1>
              <p>PPvis Member Trial Access</p>
            </div>
            <div class="content">
              <h2>Reminder: Your Trial Invitation</h2>
              <p>Just a friendly reminder that you have exclusive access to our 5-day trial. Click the button below to create your account and start exploring.</p>

              <div style="text-align: center;">
                <a href="${signupUrl}" class="button">Create My Account</a>
              </div>

              <div class="benefits">
                <strong>What you'll get:</strong>
                <ul>
                  <li>Full access to the Stacks Data platform</li>
                  <li>Personalized onboarding support</li>
                  <li>5 days to explore all features</li>
                </ul>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Or copy this link: <br>
                <span style="word-break: break-all;">${signupUrl}</span>
              </p>

              <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                This invitation expires in 5 days.
              </p>
            </div>
            <div class="footer">
              <p>This email was sent by Stacks Data. If you did not expect this invitation, you can safely ignore it.</p>
              <p>© 2026 Stacks Data. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const emailText = `
Reminder: Your Stacks Data Trial Invitation

Just a friendly reminder that you have exclusive access to our 5-day trial.

Click here to create your account: ${signupUrl}

What you'll get:
- Full access to the Stacks Data platform
- Personalized onboarding support
- 5 days to explore all features

This invitation expires in 5 days.
    `.trim()

    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
      console.log('Would resend to:', email)
      console.log('Signup URL:', signupUrl)
    } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Reminder: Your Stacks Data Trial Invitation',
        text: emailText,
        html: emailHtml,
      })
    } else {
      console.warn('SendGrid not configured. Email not sent.')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    // Update sent_at
    await adminClient
      .from('invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', invitationId)

    return NextResponse.json({
      success: true,
      extended: expiresAt <= now,
      newExpiresAt: newExpiresAt,
    })
  } catch (error: any) {
    console.error('Error resending invitation:', error)
    return NextResponse.json({
      error: 'Failed to resend invitation',
      details: error.message,
    }, { status: 500 })
  }
}
