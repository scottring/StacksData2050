import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { invitationId, email, companyName, inviterName } = await request.json()

    const supabase = await createClient()

    // Get invitation with token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('token')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Generate signup URL
    const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup?token=${invitation.token}`

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0070f3;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6c757d;
              border-radius: 0 0 8px 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: #0070f3;">StacksData Invitation</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p><strong>${inviterName}</strong> has invited you to join StacksData to provide product data${companyName ? ` for <strong>${companyName}</strong>` : ''}.</p>
              <p>StacksData is a platform for managing supplier product questionnaires and compliance data.</p>
              <p style="text-align: center;">
                <a href="${signupUrl}" class="button">Complete Your Signup</a>
              </p>
              <p style="font-size: 14px; color: #6c757d;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; word-break: break-all; color: #6c757d;">${signupUrl}</p>
              <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">This invitation will expire in 30 days.</p>
            </div>
            <div class="footer">
              <p>This email was sent by StacksData. If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const emailText = `
You've been invited to join StacksData

${inviterName} has invited you to provide product data${companyName ? ` for ${companyName}` : ''}.

Click here to sign up: ${signupUrl}

This invitation will expire in 30 days.
    `.trim()

    // Send email via SendGrid
    // TESTING SAFEGUARD: Check if emails are disabled
    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
      console.log('Would send to:', email)
      console.log('Signup URL:', signupUrl)
      
      // Still update sent_at for testing flow
      await supabase
        .from('invitations')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', invitationId)
      
      return NextResponse.json({ success: true, emailBlocked: true })
    }

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `You've been invited to join StacksData`,
        text: emailText,
        html: emailHtml,
      })
      console.log('Invitation email sent to:', email)
    } else {
      // Fallback: log to console if SendGrid not configured
      console.warn('SendGrid not configured. Email not sent.')
      console.log('Would send email to:', email)
      console.log('Signup URL:', signupUrl)
    }

    // Update sent_at timestamp
    await supabase
      .from('invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', invitationId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({
      error: 'Failed to send invitation',
      details: error.message
    }, { status: 500 })
  }
}
