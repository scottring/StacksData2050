/**
 * Send "Set Your Password" emails to all real users in production.
 *
 * Usage:
 *   cd stacks
 *   npx tsx --env-file=.env.production send-password-resets.ts
 *
 * Add --dry-run to preview without sending:
 *   npx tsx --env-file=.env.production send-password-resets.ts --dry-run
 *
 * Send to a single user:
 *   npx tsx --env-file=.env.production send-password-resets.ts --email kaisa.herranen@upm.com
 */

import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

const PROD_URL = process.env.PROD_SUPABASE_URL || 'https://yrguoooxamecsjtkfqcw.supabase.co'
const PROD_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.SITE_URL || 'https://beta.stacksdata.com'
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'admin@stacksdata.com'

if (!PROD_KEY) throw new Error('PROD_SUPABASE_SERVICE_ROLE_KEY env var required')
if (!SENDGRID_KEY) throw new Error('SENDGRID_API_KEY env var required')

// Skip these emails -- internal/test accounts
const SKIP_EMAILS = new Set([
  'admin@stacksdata.com',
  'scott.kaufman@stacksdata.com',
  'scott.kaufman+1@stacksdata.com',
  'scott@stacksdata.com',
  'demo-customer@stacksdata.com',
  'demo-supplier@stacksdata.com',
])

// Skip test email patterns
function shouldSkip(email: string): boolean {
  if (SKIP_EMAILS.has(email.toLowerCase()) && !singleEmail) return true
  if (email.includes('smkaufman+') && !singleEmail) return true
  if (email.includes('scott.kaufman+')) return true
  if (email.includes('placeholder')) return true
  return false
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const singleEmail = args.find((a, i) => args[i - 1] === '--email')

sgMail.setApiKey(SENDGRID_KEY)

const supabase = createClient(PROD_URL, PROD_KEY, {
  auth: { persistSession: false },
})

function buildEmailHtml(firstName: string, resetUrl: string): string {
  return `
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
            <p>Your Stacks Data account is ready. Click the button below to set your password and access the platform.</p>
            <p>Stacks Data is where your company manages supplier compliance questionnaires. You can view, edit, and submit product data sheets directly in the platform.</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Set My Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              Or copy this link: <br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
              This link expires in 1 hour. If it has expired, go to <a href="${SITE_URL}/login">${SITE_URL}/login</a> and click "Forgot password" to get a new link.
            </p>
          </div>
          <div class="footer">
            <p>Stacks Data - Supply Chain Compliance Intelligence</p>
            <p style="margin-top: 8px;">Questions? Reply to this email or contact admin@stacksdata.com</p>
          </div>
        </div>
      </body>
    </html>
  `
}

async function main() {
  console.log(dryRun ? '=== DRY RUN (no emails will be sent) ===' : '=== SENDING PASSWORD RESET EMAILS ===')
  console.log('')

  // Get all real users with auth accounts
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, company_id')
    .not('email', 'ilike', '%placeholder%')
    .neq('email', '')
    .order('email')

  if (usersError) {
    console.error('Error fetching users:', usersError.message)
    return
  }

  if (!users || users.length === 0) {
    console.log('No users found')
    return
  }

  // Get company names
  const companyIds = [...new Set(users.map(u => u.company_id).filter(Boolean))]
  const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds)
  const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

  // Filter to target users
  const targetUsers = users.filter(u => {
    if (!u.email) return false
    if (shouldSkip(u.email)) return false
    if (singleEmail && u.email.toLowerCase() !== singleEmail.toLowerCase()) return false
    return true
  })

  console.log(`Found ${targetUsers.length} users to send to:`)
  for (const u of targetUsers) {
    console.log(`  ${u.email} (${u.full_name || 'no name'}) - ${companyMap.get(u.company_id) || 'no company'}`)
  }
  console.log('')

  if (dryRun) {
    console.log('Dry run complete. Remove --dry-run to send emails.')
    return
  }

  let sent = 0
  let failed = 0

  for (const u of targetUsers) {
    try {
      // Generate recovery link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: u.email!.toLowerCase(),
        options: {
          redirectTo: `${SITE_URL}/reset-password`,
        },
      })

      if (linkError) {
        console.error(`  SKIP ${u.email}: ${linkError.message}`)
        failed++
        continue
      }

      const resetUrl = linkData.properties.action_link
      const firstName = u.full_name?.split(' ')[0] || 'there'

      // Send email
      await sgMail.send({
        to: u.email!.toLowerCase(),
        from: FROM_EMAIL,
        subject: 'Welcome to Stacks Data - Set Your Password',
        html: buildEmailHtml(firstName, resetUrl),
      })

      console.log(`  SENT: ${u.email}`)
      sent++

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200))
    } catch (err: any) {
      console.error(`  FAIL ${u.email}: ${err.message}`)
      failed++
    }
  }

  console.log('')
  console.log(`Done. Sent: ${sent}, Failed: ${failed}`)
}

main()
