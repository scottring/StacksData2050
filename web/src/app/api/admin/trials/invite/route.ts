import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface InviteResult {
  email: string
  status: 'sent' | 'failed' | 'duplicate'
  error?: string
}

export async function POST(request: Request) {
  try {
    const { emails, batchName } = await request.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
    }

    if (emails.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 emails per batch' }, { status: 400 })
    }

    // Verify super admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Create batch record
    const { data: batch, error: batchError } = await adminClient
      .from('trial_batches')
      .insert({
        name: batchName || `Trial Batch ${new Date().toISOString().split('T')[0]}`,
        created_by: user.id,
        total_count: emails.length,
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating batch:', batchError)
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
    }

    // Check for existing invitations
    const { data: existingInvitations } = await adminClient
      .from('invitations')
      .select('email')
      .in('email', emails.map((e: string) => e.toLowerCase()))

    const existingEmails = new Set((existingInvitations || []).map(i => i.email.toLowerCase()))

    // Process each email
    const results: InviteResult[] = []
    let sentCount = 0

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()

      // Check if already invited
      if (existingEmails.has(normalizedEmail)) {
        results.push({ email: normalizedEmail, status: 'duplicate' })
        continue
      }

      try {
        // Generate token
        const token = crypto.randomUUID()

        // Create invitation
        const { data: invitation, error: invError } = await adminClient
          .from('invitations')
          .insert({
            email: normalizedEmail,
            token,
            invitation_type: 'trial',
            trial_batch_id: batch.id,
            created_by: user.id,
            expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (invError) {
          console.error('Error creating invitation:', invError)
          results.push({ email: normalizedEmail, status: 'failed', error: invError.message })
          continue
        }

        // Send email - go directly to signup (skip discovery)
        const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup?token=${token}`

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
                  <h2>You've been invited to try Stacks Data!</h2>
                  <p>As a PPvis member, you have exclusive access to our 5-day trial. Click the button below to create your account and start exploring.</p>

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
You've been invited to try Stacks Data!

As a PPvis member, you have exclusive access to our 5-day trial.

Click here to create your account: ${signupUrl}

What you'll get:
- Full access to the Stacks Data platform
- Personalized onboarding support
- 5 days to explore all features

This invitation expires in 5 days.
        `.trim()

        // Check if emails are disabled for testing
        if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
          console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
          console.log('Would send to:', normalizedEmail)
          console.log('Signup URL:', signupUrl)
        } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
          await sgMail.send({
            to: normalizedEmail,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: "You're invited to the Stacks Data Trial - PPvis Member Access",
            text: emailText,
            html: emailHtml,
          })
        } else {
          console.warn('SendGrid not configured. Email not sent.')
          console.log('Would send to:', normalizedEmail)
          console.log('Signup URL:', signupUrl)
        }

        // Update sent_at
        await adminClient
          .from('invitations')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', invitation.id)

        results.push({ email: normalizedEmail, status: 'sent' })
        sentCount++

      } catch (err: any) {
        console.error('Error processing invitation for', email, err)
        results.push({ email: normalizedEmail, status: 'failed', error: err.message })
      }
    }

    // Update batch counts
    await adminClient
      .from('trial_batches')
      .update({ sent_count: sentCount })
      .eq('id', batch.id)

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      results,
      summary: {
        total: emails.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        duplicates: results.filter(r => r.status === 'duplicate').length,
      },
    })

  } catch (error: any) {
    console.error('Error in trial invite API:', error)
    return NextResponse.json({
      error: 'Failed to process invitations',
      details: error.message,
    }, { status: 500 })
  }
}
