import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: NextRequest) {
  try {
    const { email, redirectTo } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate the recovery link using Supabase Admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    })

    if (error) {
      console.error('Error generating reset link:', error)
      // If user doesn't exist in auth, return a generic success to avoid user enumeration
      if (error.message?.includes('User not found')) {
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
    }

    const resetUrl = data.properties.action_link

    // Send branded email via SendGrid
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
            .footer { background-color: #f9fafb; padding: 24px 30px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Stacks Data</h1>
            </div>
            <div class="content">
              <h2>Set Up Your Password</h2>
              <p>Click the button below to create your password and access the Stacks Data platform.</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Set My Password</a>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Or copy this link: <br>
                <span style="word-break: break-all;">${resetUrl}</span>
              </p>

              <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Stacks Data. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const emailText = `
Set Up Your Password

Click here to create your password and access the Stacks Data platform:
${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    `.trim()

    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
      console.log('Would send password reset to:', email)
      console.log('Reset URL:', resetUrl)
    } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Set Up Your Stacks Data Password',
        text: emailText,
        html: emailHtml,
      })
    } else {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send reset email error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
