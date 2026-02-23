import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
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
    const normalizedEmail = email.toLowerCase()

    // Check if auth.users exists
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()
    const existingAuthUser = authUsers?.find(u => u.email?.toLowerCase() === normalizedEmail)

    // Check if public.users exists
    const { data: existingPublicUser } = await adminClient
      .from('users')
      .select('id, email, full_name, company_id, role, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    let finalAuthUserId: string

    if (existingAuthUser) {
      // Auth user exists - just need to ensure public.users matches
      finalAuthUserId = existingAuthUser.id

      if (existingPublicUser && existingPublicUser.id !== existingAuthUser.id) {
        // ID mismatch - need to fix
        const oldUserId = existingPublicUser.id

        // Update sheets.created_by
        await adminClient
          .from('sheets')
          .update({ created_by: finalAuthUserId })
          .eq('created_by', oldUserId)

        // Update answers.created_by
        await adminClient
          .from('answers')
          .update({ created_by: finalAuthUserId })
          .eq('created_by', oldUserId)

        // Delete old public.users
        await adminClient
          .from('users')
          .delete()
          .eq('id', oldUserId)

        // Create new public.users with correct ID
        await adminClient
          .from('users')
          .insert({
            id: finalAuthUserId,
            email: existingPublicUser.email,
            full_name: existingPublicUser.full_name,
            company_id: existingPublicUser.company_id,
            role: existingPublicUser.role || 'user',
            created_at: existingPublicUser.created_at,
            updated_at: new Date().toISOString(),
          })
      }
    } else {
      // No auth user - need to create one
      if (!existingPublicUser) {
        return NextResponse.json({
          error: 'No user record found for this email'
        }, { status: 404 })
      }

      const oldUserId = existingPublicUser.id

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          full_name: existingPublicUser.full_name,
        },
      })

      if (authError) {
        return NextResponse.json({
          error: `Failed to create auth user: ${authError.message}`
        }, { status: 500 })
      }

      finalAuthUserId = authData.user.id

      // Update sheets.created_by
      const { data: sheetsUpdated } = await adminClient
        .from('sheets')
        .update({ created_by: finalAuthUserId })
        .eq('created_by', oldUserId)
        .select('id')

      // Update answers.created_by
      const { data: answersUpdated } = await adminClient
        .from('answers')
        .update({ created_by: finalAuthUserId })
        .eq('created_by', oldUserId)
        .select('id')

      // Delete old public.users
      const { error: deleteError } = await adminClient
        .from('users')
        .delete()
        .eq('id', oldUserId)

      if (deleteError) {
        // Rollback
        await adminClient.auth.admin.deleteUser(finalAuthUserId)
        return NextResponse.json({
          error: `Failed to update user record: ${deleteError.message}`
        }, { status: 500 })
      }

      // Create new public.users with correct ID
      const { error: insertError } = await adminClient
        .from('users')
        .insert({
          id: finalAuthUserId,
          email: existingPublicUser.email,
          full_name: existingPublicUser.full_name,
          company_id: existingPublicUser.company_id,
          role: existingPublicUser.role || 'user',
          created_at: existingPublicUser.created_at,
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        return NextResponse.json({
          error: `Failed to create user record: ${insertError.message}`
        }, { status: 500 })
      }

      console.log(`Fixed user ${normalizedEmail}: updated ${sheetsUpdated?.length || 0} sheets, ${answersUpdated?.length || 0} answers`)
    }

    // Generate recovery link (user sets password, then continues to app)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    })

    if (linkError) {
      return NextResponse.json({
        error: `Failed to generate magic link: ${linkError.message}`
      }, { status: 500 })
    }

    const magicLink = linkData.properties.action_link

    // Send email
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
              <p>Click the link below to set up your password and access the Stacks Data platform:</p>

              <div style="text-align: center;">
                <a href="${magicLink}" class="button">Set Up My Password →</a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                Once you've set your password, you'll be able to log in anytime.
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
Click here to set up your password and access the Stacks Data platform:

${magicLink}

Once you've set your password, you'll be able to log in anytime.
    `.trim()

    if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
      console.log('📧 EMAIL BLOCKED (DISABLE_OUTBOUND_EMAILS=true)')
      console.log('Would send magic link to:', normalizedEmail)
      console.log('Magic link:', magicLink)
      return NextResponse.json({
        success: true,
        message: 'Magic link generated (email disabled)',
        magicLink // Return link when emails are disabled for testing
      })
    }

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      await sgMail.send({
        to: normalizedEmail,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Quick access to your Stacks Data trial',
        text: emailText,
        html: emailHtml,
      })
    } else {
      return NextResponse.json({
        error: 'Email service not configured'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Magic link sent to ${normalizedEmail}`
    })

  } catch (error: any) {
    console.error('Error sending magic link:', error)
    return NextResponse.json({
      error: error.message || 'Failed to send magic link'
    }, { status: 500 })
  }
}
