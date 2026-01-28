/**
 * Admin script: Invite a user to an existing company
 *
 * Usage:
 *   npx tsx scripts/invite-to-company.ts --email user@example.com --company-id <uuid>
 *
 * Options:
 *   --email       Email address to invite (required)
 *   --company-id  UUID of existing company to link (required)
 *   --dry-run     Preview without creating invitation or sending email
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, NEXT_PUBLIC_SITE_URL
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// --- Load .env.local ---
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found at', envPath)
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnv()

// --- Parse args ---
function parseArgs(): { email: string; companyId: string; dryRun: boolean } {
  const args = process.argv.slice(2)
  let email = ''
  let companyId = ''
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[++i]
    } else if (args[i] === '--company-id' && args[i + 1]) {
      companyId = args[++i]
    } else if (args[i] === '--dry-run') {
      dryRun = true
    }
  }

  if (!email || !companyId) {
    console.error('Usage: npx tsx scripts/invite-to-company.ts --email <email> --company-id <uuid> [--dry-run]')
    process.exit(1)
  }

  return { email, companyId, dryRun }
}

async function main() {
  const { email, companyId, dryRun } = parseArgs()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const sendgridKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  // Admin client bypasses RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Verify company exists
  console.log(`🔍 Looking up company ${companyId}...`)
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    console.error(`❌ Company not found: ${companyId}`)
    console.error(companyError?.message || 'No data returned')
    process.exit(1)
  }
  console.log(`✅ Company: ${company.name}`)

  // 2. Check for existing invitation
  const { data: existing } = await supabase
    .from('invitations')
    .select('id, token, sent_at, accepted_at')
    .eq('email', email)
    .is('accepted_at', null)
    .single()

  if (existing) {
    console.warn(`⚠️  Active invitation already exists for ${email} (id: ${existing.id})`)
    console.warn(`   Sent: ${existing.sent_at || 'never'}, Token: ${existing.token}`)
    console.warn(`   Use --email with a different address, or delete the existing invitation first.`)
    process.exit(1)
  }

  // 3. Generate token and expiry
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  const signupUrl = `${siteUrl}/auth/signup?token=${token}`

  if (dryRun) {
    console.log('\n🏃 DRY RUN — no changes will be made\n')
    console.log(`  Email:      ${email}`)
    console.log(`  Company:    ${company.name} (${company.id})`)
    console.log(`  Token:      ${token}`)
    console.log(`  Expires:    ${expiresAt}`)
    console.log(`  Signup URL: ${signupUrl}`)
    console.log('\nRerun without --dry-run to create invitation and send email.')
    return
  }

  // 4. Create invitation record
  console.log(`📝 Creating invitation for ${email}...`)
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .insert({
      email,
      company_name: company.name,
      company_id: company.id,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (invError) {
    console.error('❌ Failed to create invitation:', invError.message)
    process.exit(1)
  }
  console.log(`✅ Invitation created (id: ${invitation.id})`)

  // 5. Send email via SendGrid
  if (!sendgridKey || !fromEmail) {
    console.warn('⚠️  SendGrid not configured — skipping email. Share this link manually:')
    console.log(`\n  ${signupUrl}\n`)
    return
  }

  if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
    console.warn('⚠️  DISABLE_OUTBOUND_EMAILS=true — email not sent. Share this link manually:')
    console.log(`\n  ${signupUrl}\n`)
    return
  }

  console.log(`📧 Sending invitation email to ${email}...`)

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
            <p>You've been invited to join <strong>${company.name}</strong> on StacksData.</p>
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
You've been invited to join ${company.name} on StacksData.

StacksData is a platform for managing supplier product questionnaires and compliance data.

Click here to sign up: ${signupUrl}

This invitation will expire in 30 days.
  `.trim()

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: 'StacksData' },
        subject: `You've been invited to join ${company.name} on StacksData`,
        content: [
          { type: 'text/plain', value: emailText },
          { type: 'text/html', value: emailHtml },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`SendGrid ${response.status}: ${body}`)
    }

    // Update sent_at
    await supabase
      .from('invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', invitation.id)

    console.log(`✅ Email sent to ${email}`)
    console.log(`\n📋 Summary:`)
    console.log(`  Invitation ID: ${invitation.id}`)
    console.log(`  Company:       ${company.name}`)
    console.log(`  Email:         ${email}`)
    console.log(`  Signup URL:    ${signupUrl}`)
    console.log(`  Expires:       ${expiresAt}`)
  } catch (err: any) {
    console.error('❌ Failed to send email:', err.message)
    console.log(`\n⚠️  Invitation was created but email failed. Share this link manually:`)
    console.log(`\n  ${signupUrl}\n`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
