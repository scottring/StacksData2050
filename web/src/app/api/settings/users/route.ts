import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

// GET: list users in the caller's company
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', authUser.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Use admin client to get all users in company (bypasses RLS for cross-role visibility)
    const admin = createAdminClient()
    const { data: users } = await admin
      .from('users')
      .select('id, email, full_name, first_name, last_name, role, is_super_admin, created_at')
      .eq('company_id', profile.company_id)
      .not('email', 'ilike', '%placeholder%')
      .order('full_name')

    return NextResponse.json({ users: users || [], currentUserRole: profile.role })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: create a new user in the caller's company
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role, is_super_admin')
      .eq('id', authUser.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company' }, { status: 400 })
    }

    // Only admins can add users
    if (profile.role !== 'admin' && !profile.is_super_admin) {
      return NextResponse.json({ error: 'Only admins can add users' }, { status: 403 })
    }

    const { email, firstName, lastName, role } = await request.json()

    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Email, first name, and last name are required' }, { status: 400 })
    }

    const validRoles = ['admin', 'editor', 'reviewer', 'viewer']
    const userRole = validRoles.includes(role) ? role : 'editor'

    const admin = createAdminClient()

    // Check if user already exists in auth
    const { data: existingAuth } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existingUser = existingAuth?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let authUserId: string

    if (existingUser) {
      // User exists in auth -- check if they're already in this company
      const { data: existingProfile } = await admin
        .from('users')
        .select('id, company_id')
        .eq('id', existingUser.id)
        .single()

      if (existingProfile?.company_id === profile.company_id) {
        return NextResponse.json({ error: 'User already belongs to your company' }, { status: 409 })
      }

      // User exists in auth but different company or no profile -- update their profile
      authUserId = existingUser.id
    } else {
      // Create new auth user with a random temporary password
      const tempPassword = crypto.randomUUID() + '!A1' // meets complexity requirements
      const { data: newAuth, error: authError } = await admin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }

      authUserId = newAuth.user.id
    }

    // Upsert public.users record
    const fullName = `${firstName} ${lastName}`
    const { error: profileError } = await admin.from('users').upsert({
      id: authUserId,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      company_id: profile.company_id,
      role: userRole,
      profile_done: true,
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Send "Set your password" email
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    })

    if (!linkError && linkData?.properties?.action_link) {
      const resetUrl = linkData.properties.action_link

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
                <h2>Welcome to Stacks Data</h2>
                <p>Hi ${firstName},</p>
                <p>You've been added to your company's Stacks Data account. Click below to set your password and get started.</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Set My Password</a>
                </div>
                <p style="font-size: 14px; color: #6b7280;">
                  Or copy this link: <br>
                  <span style="word-break: break-all;">${resetUrl}</span>
                </p>
                <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                  This link expires in 1 hour.
                </p>
              </div>
              <div class="footer">
                <p>Stacks Data - Supply Chain Compliance Intelligence</p>
              </div>
            </div>
          </body>
        </html>
      `

      if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
        console.log('EMAIL BLOCKED: welcome email to', email)
        console.log('Reset URL:', resetUrl)
      } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        await sgMail.send({
          to: email.toLowerCase(),
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: 'Welcome to Stacks Data - Set Your Password',
          html: emailHtml,
        })
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: authUserId, email: email.toLowerCase(), full_name: fullName, role: userRole }
    })
  } catch (error: any) {
    console.error('Error adding user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
