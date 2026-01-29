import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { sheetId, supplierEmail, supplierName, productName, flaggedCount, observations } = await request.json()

    if (!supplierEmail) {
      return NextResponse.json({ error: 'Supplier email required' }, { status: 400 })
    }

    const editUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/sheets/${sheetId}/edit`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; padding: 20px; border-radius: 8px 8px 0 0; }
            .header h2 { margin: 0; color: #ffffff; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .product-name { font-size: 24px; font-weight: bold; color: #f59e0b; margin: 10px 0; }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #f59e0b;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
            }
            .flagged { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
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
              <h2>⚠️ Revision Requested</h2>
            </div>
            <div class="content">
              <p>Hello${supplierName ? ` ${supplierName}` : ''},</p>
              <p>Your customer has reviewed your submission for:</p>
              <p class="product-name">${productName}</p>
              <div class="flagged">
                <strong>${flaggedCount} answer(s) need revision</strong>
                ${observations ? `<p style="margin-top: 10px;">Comments: ${observations}</p>` : ''}
              </div>
              <p>Please review the flagged items and update your responses:</p>
              <p style="text-align: center;">
                <a href="${editUrl}" class="button">Review & Update</a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent by StacksData.</p>
            </div>
          </div>
        </body>
      </html>
    `

    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED - Revision notification to:', supplierEmail)
      return NextResponse.json({ success: true, emailBlocked: true })
    }

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: supplierEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Revision Requested: ${productName}`,
        html: emailHtml,
      })
      console.log('Revision notification sent to:', supplierEmail)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending revision notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
