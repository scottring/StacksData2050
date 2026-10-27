import { SupabaseClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export const REMINDER_AFTER_DAYS = 7
export const REMINDER_INTERVAL_DAYS = 7
export const REMINDER_MAX = 3

export interface ReminderCandidate {
  requestId: string
  sheetId: string
  productName: string
  customerName: string | null
  recipientEmail: string | null
  recipientName: string | null
  supplierCompanyId: string | null
  createdAt: string
  reminderCount: number
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Sends one reminder email for an open request and records it on the
 * request row. Uses the service-role client. Resolves the recipient the same
 * way /api/requests/notify does: the recorded recipient, else the supplier's
 * main contact. Returns the address used, or null if nobody could be reached.
 */
export async function sendRequestReminder(
  admin: SupabaseClient,
  c: ReminderCandidate,
  opts: { manual?: boolean; senderName?: string | null } = {}
): Promise<{ sent: boolean; to: string | null; reason?: string }> {
  let to = c.recipientEmail
  let name = c.recipientName

  if (!to && c.supplierCompanyId) {
    const { data: contacts } = await admin
      .from('users')
      .select('email, full_name')
      .eq('company_id', c.supplierCompanyId)
      .not('email', 'ilike', '%placeholder%')
      .order('is_company_main_contact', { ascending: false, nullsFirst: false })
      .limit(1)
    if (contacts && contacts.length > 0) {
      to = contacts[0].email
      name = name || contacts[0].full_name
    }
  }

  if (!to) return { sent: false, to: null, reason: 'No supplier contact' }

  const days = Math.max(1, Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 86400000))
  const respondUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/sheets/${c.sheetId}/edit`
  const customer = c.customerName || 'your customer'
  const greeting = name ? `Hello ${name},` : 'Hello,'

  const html = `<!DOCTYPE html><html><head><style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0070f3; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; color: #fff; }
    .content { background: #fff; padding: 30px; border: 1px solid #e9ecef; }
    .product-name { font-size: 22px; font-weight: bold; color: #0070f3; margin: 10px 0; }
    .button { display: inline-block; padding: 14px 28px; background: #0070f3; color: #fff !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
  </style></head><body><div class="container">
    <div class="header"><h2>Reminder: Product Data Request</h2></div>
    <div class="content">
      <p>${escapeHtml(greeting)}</p>
      <p><strong>${escapeHtml(customer)}</strong> is still waiting for product compliance data for:</p>
      <p class="product-name">${escapeHtml(c.productName)}</p>
      <p>The request was sent ${days} day${days === 1 ? '' : 's'} ago. Please complete the questionnaire when you can:</p>
      <p style="text-align:center;"><a href="${respondUrl}" class="button">Complete Questionnaire</a></p>
      <p style="font-size:14px;color:#6c757d;">Or copy and paste this link into your browser:</p>
      <p style="font-size:12px;word-break:break-all;color:#6c757d;">${respondUrl}</p>
    </div>
    <div class="footer">
      <p>This reminder was sent by StacksData on behalf of ${escapeHtml(customer)}.</p>
      <p>If you have already responded or have questions, please contact them directly.</p>
    </div>
  </div></body></html>`

  const text = `Reminder: Product Data Request

${greeting}

${customer} is still waiting for product compliance data for:

${c.productName}

The request was sent ${days} day${days === 1 ? '' : 's'} ago. Complete the questionnaire here: ${respondUrl}

This reminder was sent by StacksData on behalf of ${customer}.`

  if (process.env.DISABLE_OUTBOUND_EMAILS === 'true') {
    console.log('EMAIL BLOCKED: reminder to', to, 'for', c.productName)
  } else if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Reminder: Product Data Request for ${c.productName}`,
      text,
      html,
    })
  } else {
    console.warn('SendGrid not configured. Reminder not sent to', to)
    return { sent: false, to, reason: 'Email not configured' }
  }

  const { error } = await admin
    .from('requests')
    .update({ last_reminder_at: new Date().toISOString(), reminder_count: c.reminderCount + 1 })
    .eq('id', c.requestId)
  if (error) console.error('Error recording reminder:', error)

  return { sent: true, to }
}

/**
 * Loads the open requests for a set of sheets (or all, when sheetIds is
 * undefined) as reminder candidates. Withdrawn requests and sheets that are
 * no longer pending/in progress are excluded.
 */
export async function loadReminderCandidates(
  admin: SupabaseClient,
  sheetIds?: string[],
  opts: { requireRecipient?: boolean } = {}
): Promise<ReminderCandidate[]> {
  let query = admin
    .from('requests')
    .select('id, sheet_id, requestor_id, requesting_from_id, recipient_email, recipient_name, created_at, reminder_count, last_reminder_at, withdrawn_at')
    .is('withdrawn_at', null)
    .not('sheet_id', 'is', null)
  if (sheetIds) query = query.in('sheet_id', sheetIds.length > 0 ? sheetIds : ['none'])
  // Automatic reminders only go to requests sent from this platform, which
  // record who received them. Legacy (Bubble-era) requests have no recipient
  // and must not be mass-mailed; a customer can still remind them by hand.
  if (opts.requireRecipient) query = query.not('recipient_email', 'is', null)

  const { data: requests, error } = await query
  if (error) throw error
  if (!requests || requests.length === 0) return []

  const ids = [...new Set(requests.map(r => r.sheet_id as string))]
  const sheets: { id: string; name: string; status: string | null; company_id: string | null; requesting_company_id: string | null }[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from('sheets')
      .select('id, name, status, company_id, requesting_company_id')
      .in('id', ids.slice(i, i + 200))
      .in('status', ['pending', 'in_progress'])
    if (data) sheets.push(...data)
  }
  const sheetMap = new Map(sheets.map(s => [s.id, s]))

  const customerIds = [...new Set(requests.map(r => r.requestor_id).filter(Boolean))] as string[]
  const { data: companies } = customerIds.length > 0
    ? await admin.from('companies').select('id, name').in('id', customerIds)
    : { data: [] }
  const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

  return requests
    .filter(r => sheetMap.has(r.sheet_id as string))
    .map(r => {
      const s = sheetMap.get(r.sheet_id as string)!
      return {
        requestId: r.id,
        sheetId: s.id,
        productName: s.name,
        customerName: r.requestor_id ? companyMap.get(r.requestor_id) || null : null,
        recipientEmail: r.recipient_email,
        recipientName: r.recipient_name,
        supplierCompanyId: r.requesting_from_id || s.company_id,
        createdAt: r.created_at || new Date().toISOString(),
        reminderCount: r.reminder_count || 0,
        lastReminderAt: r.last_reminder_at as string | null,
      }
    })
}

/** The automatic rule: first reminder 7 days after sending, then every 7 days, at most 3. */
export function isDueForReminder(c: ReminderCandidate & { lastReminderAt?: string | null }, now = Date.now()): boolean {
  if (c.reminderCount >= REMINDER_MAX) return false
  const ageDays = (now - new Date(c.createdAt).getTime()) / 86400000
  if (ageDays < REMINDER_AFTER_DAYS) return false
  if (!c.lastReminderAt) return true
  const sinceLast = (now - new Date(c.lastReminderAt).getTime()) / 86400000
  return sinceLast >= REMINDER_INTERVAL_DAYS
}
