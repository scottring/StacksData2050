import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { sheetId, customerEmail, customerName, productName } = await request.json()

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email required' }, { status: 400 })
    }

    // Generate review URL
    const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/sheets/${sheetId}/review`

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
