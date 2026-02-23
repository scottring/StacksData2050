import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recipients, subject, body: emailBody } = body as {
      recipients: { email: string; firstName: string }[]
      subject: string
      body: string
    }

    if (!recipients?.length || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    let sentCount = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      try {
        const personalizedBody = emailBody.replace(/\[First Name\]/g, recipient.firstName)
        const personalizedSubject = subject.replace(/\[First Name\]/g, recipient.firstName)

        // Convert newlines to <br> for HTML, and wrap in paragraphs
        const htmlParagraphs = personalizedBody
          .split('\n\n')
          .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('')

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
                .content p { margin: 0 0 16px 0; }
                .footer { background-color: #f9fafb; padding: 24px 30px; text-align: center; font-size: 12px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Stacks Data</h1>
                </div>
                <div class="content">
                  ${htmlParagraphs}
                </div>
                <div class="footer">
                  <p>&copy; 2026 Stacks Data. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `

        if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
          console.log('EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
          console.log('Would send to:', recipient.email)
          console.log('Subject:', personalizedSubject)
          console.log('First Name:', recipient.firstName)
          sentCount++
        } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
          await sgMail.send({
            to: recipient.email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: personalizedSubject,
            text: personalizedBody,
            html: emailHtml,
          })
          sentCount++
        }
      } catch (err: any) {
        console.error('Error sending to', recipient.email, err)
        errors.push(`${recipient.email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Error sending custom emails:', error)
    return NextResponse.json({
      error: 'Failed to send emails',
      details: error.message,
    }, { status: 500 })
  }
}
