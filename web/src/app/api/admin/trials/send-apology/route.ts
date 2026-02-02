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

    // Get ALL trial invitations (including accepted ones)
    const { data: invitations, error: invError } = await adminClient
      .from('invitations')
      .select('id, email, token, expires_at, accepted_at')
      .eq('invitation_type', 'trial')

    if (invError) {
      console.error('Error fetching invitations:', invError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json({ message: 'No trial invitations found', sent: 0 })
    }

    let sentCount = 0
    const errors: string[] = []

    for (const invitation of invitations) {
      try {
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
                .content { background-color: #ffffff; padding: 40px 30px; }
                .content h2 { color: #1f2937; font-size: 20px; margin-top: 0; }
                .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
                .note { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
                .note p { margin: 0; color: #92400e; }
                .success-note { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
                .success-note p { margin: 0; color: #065f46; }
                .footer { background-color: #f9fafb; padding: 24px 30px; text-align: center; font-size: 12px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Stacks Data</h1>
                </div>
                <div class="content">
                  <h2>A Quick Update on Your Trial Access</h2>

                  <div class="success-note">
                    <p><strong>Already signed in?</strong> If you've already successfully set up your password and accessed the platform, you can ignore this email—you're all set!</p>
                  </div>

                  <p>Hi there,</p>

                  <p>We wanted to reach out with a quick apology. Some of you may have experienced confusion when trying to access your Stacks Data trial—if so, we're sorry about that!</p>

                  <div class="note">
                    <p><strong>What happened:</strong> We recently migrated to a completely new platform, and some accounts from our previous system didn't transfer their login credentials properly. This caused issues for some users trying to sign up.</p>
                  </div>

                  <p>The good news? This is exactly why we do trials—to catch these kinds of issues before they affect our paying customers. Your patience helps us build a better product for everyone.</p>

                  <p>If you haven't been able to access your trial yet, click the button below to get started:</p>

                  <div style="text-align: center;">
                    <a href="${signupUrl}" class="button">Access My Trial</a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280;">
                    Or copy this link: <br>
                    <span style="word-break: break-all;">${signupUrl}</span>
                  </p>

                  <p>If you run into any issues at all, just reply to this email—we're here to help.</p>

                  <p>Thank you for your understanding,<br>
                  <strong>The Stacks Data Team</strong></p>
                </div>
                <div class="footer">
                  <p>© 2026 Stacks Data. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `

        const emailText = `
A Quick Update on Your Trial Access

ALREADY SIGNED IN? If you've already successfully set up your password and accessed the platform, you can ignore this email—you're all set!

Hi there,

We wanted to reach out with a quick apology. Some of you may have experienced confusion when trying to access your Stacks Data trial—if so, we're sorry about that!

What happened: We recently migrated to a completely new platform, and some accounts from our previous system didn't transfer their login credentials properly. This caused issues for some users trying to sign up.

The good news? This is exactly why we do trials—to catch these kinds of issues before they affect our paying customers. Your patience helps us build a better product for everyone.

If you haven't been able to access your trial yet, click the link below to get started:

${signupUrl}

If you run into any issues at all, just reply to this email—we're here to help.

Thank you for your understanding,
The Stacks Data Team
        `.trim()

        if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
          console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
          console.log('Would send apology to:', invitation.email)
          console.log('Signup URL:', signupUrl)
          sentCount++
        } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
          await sgMail.send({
            to: invitation.email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Quick Update on Your Stacks Data Trial',
            text: emailText,
            html: emailHtml,
          })
          sentCount++
        }

      } catch (err: any) {
        console.error('Error sending to', invitation.email, err)
        errors.push(`${invitation.email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: invitations.length,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error: any) {
    console.error('Error sending apology emails:', error)
    return NextResponse.json({
      error: 'Failed to send emails',
      details: error.message,
    }, { status: 500 })
  }
}
