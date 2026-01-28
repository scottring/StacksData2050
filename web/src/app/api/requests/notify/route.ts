import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { requestId, sheetId, supplierEmail, supplierName, productName, requesterName, requesterCompany } = await request.json()

    if (!supplierEmail) {
      return NextResponse.json({ error: 'Supplier email required' }, { status: 400 })
    }

    // Generate respond URL
    const respondUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/sheets/${sheetId}/edit`

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0070f3; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h2 { margin: 0; color: #ffffff; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .product-name { font-size: 24px; font-weight: bold; color: #0070f3; margin: 10px 0; }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #0070f3;
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
              <h2>New Product Data Request</h2>
            </div>
            <div class="content">
              <p>Hello${supplierName ? ` ${supplierName}` : ''},</p>
              <p><strong>${requesterName || 'A customer'}</strong>${requesterCompany ? ` from <strong>${requesterCompany}</strong>` : ''} has requested product compliance data for:</p>
              <p class="product-name">${productName}</p>
              <p>Please click the button below to complete the questionnaire:</p>
              <p style="text-align: center;">
                <a href="${respondUrl}" class="button">Complete Questionnaire</a>
              </p>
              <p style="font-size: 14px; color: #6c757d;">Or copy and paste this link into your browser:</p>
              <p style="font-size: 12px; word-break: break-all; color: #6c757d;">${respondUrl}</p>
            </div>
            <div class="footer">
              <p>This email was sent by StacksData on behalf of ${requesterCompany || 'your customer'}.</p>
              <p>If you have questions, please contact them directly.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const emailText = `
New Product Data Request

Hello${supplierName ? ` ${supplierName}` : ''},

${requesterName || 'A customer'}${requesterCompany ? ` from ${requesterCompany}` : ''} has requested product compliance data for:

${productName}

Click here to complete the questionnaire: ${respondUrl}

This email was sent by StacksData.
    `.trim()

    // Check if emails are disabled
    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
      console.log('Would send to:', supplierEmail)
      console.log('Respond URL:', respondUrl)
      return NextResponse.json({ success: true, emailBlocked: true })
    }

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: supplierEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Product Data Request: ${productName}`,
        text: emailText,
        html: emailHtml,
      })
      console.log('Request notification sent to:', supplierEmail)
    } else {
      console.warn('SendGrid not configured. Email not sent.')
      console.log('Would send to:', supplierEmail)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending request notification:', error)
    return NextResponse.json({
      error: 'Failed to send notification',
      details: error.message
    }, { status: 500 })
  }
}
