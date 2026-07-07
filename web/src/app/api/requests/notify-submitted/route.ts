import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createNotificationsForCompany } from '@/lib/notifications'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    // Session auth: this route has no other gate, and it triggers a
    // cross-company notification insert, so it must not be callable
    // unauthenticated.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sheetId, productName } = body
    let customerEmail = body.customerEmail
    let customerName = body.customerName

    if (!sheetId) {
      return NextResponse.json({ error: 'sheetId required' }, { status: 400 })
    }

    // Only the supplier who owns the sheet (the side that submits it and
    // calls this route) may trigger a notification to the customer.
    const { data: callerRow } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: sheet } = await supabase
      .from('sheets')
      .select('id, company_id')
      .eq('id', sheetId)
      .single()

    if (!sheet || !callerRow?.company_id || callerRow.company_id !== sheet.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Server-side lookup if email not provided but company ID is
    if (!customerEmail && body.customerCompanyId) {
      const serviceClient = getServiceClient()
      const { data: customerUsers } = await serviceClient
        .from('users')
        .select('email, full_name')
        .eq('company_id', body.customerCompanyId)
        .not('email', 'ilike', '%placeholder%')
        .limit(1)
      if (customerUsers && customerUsers.length > 0) {
        customerEmail = customerUsers[0].email
        customerName = customerName || customerUsers[0].full_name
      }
    }

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email required' }, { status: 400 })
    }

    // Look up the request so the email link and the in-app notification
    // below point at the same customer review URL.
    let requestId: string | undefined
    if (body.customerCompanyId) {
      const serviceClient = getServiceClient()
      const { data: requestRow } = await serviceClient
        .from('requests')
        .select('id')
        .eq('sheet_id', sheetId)
        .maybeSingle()
      requestId = requestRow?.id
    }

    // Generate review URL (same destination as the in-app notification link)
    const reviewUrl = requestId
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/command/review/${requestId}`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/command`

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #22c55e; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h2 { margin: 0; color: #ffffff; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .product-name { font-size: 24px; font-weight: bold; color: #22c55e; margin: 10px 0; }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #22c55e;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
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
              <h2>📋 Response Submitted</h2>
            </div>
            <div class="content">
              <p>Hello${customerName ? ` ${customerName}` : ''},</p>
              <p>Great news! Your supplier has submitted their response for:</p>
              <p class="product-name">${productName}</p>
              <p>Click the button below to review and approve the data:</p>
              <p style="text-align: center;">
                <a href="${reviewUrl}" class="button">Review Response</a>
              </p>
              <p style="font-size: 14px; color: #6c757d;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; word-break: break-all; color: #6c757d;">${reviewUrl}</p>
            </div>
            <div class="footer">
              <p>This email was sent by StacksData.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const emailText = `
Response Submitted

Hello${customerName ? ` ${customerName}` : ''},

Great news! Your supplier has submitted their response for:

${productName}

Click here to review and approve: ${reviewUrl}

This email was sent by StacksData.
    `.trim()

    // In-app notification (independent of email delivery, never blocks the response)
    if (body.customerCompanyId) {
      try {
        const serviceClient = getServiceClient()
        await createNotificationsForCompany(serviceClient, body.customerCompanyId, {
          type: 'sheet_submitted',
          title: 'Response submitted',
          message: `${productName} response is ready for review`,
          link: requestId ? `/command/review/${requestId}` : '/command',
        })
      } catch (notifyError) {
        console.error('[notify-submitted] notification failed:', notifyError)
      }
    }

    // Check if emails are disabled
    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
      console.log('Would send to:', customerEmail)
      console.log('Review URL:', reviewUrl)
      return NextResponse.json({ success: true, emailBlocked: true })
    }

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: customerEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Response Submitted: ${productName}`,
        text: emailText,
        html: emailHtml,
      })
      console.log('Submission notification sent to:', customerEmail)
    } else {
      console.warn('SendGrid not configured. Email not sent.')
      console.log('Would send to:', customerEmail)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending submission notification:', error)
    return NextResponse.json({
      error: 'Failed to send notification',
      details: error.message
    }, { status: 500 })
  }
}
