import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadReminderCandidates, isDueForReminder, sendRequestReminder } from '@/lib/email/request-reminder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily automatic reminders for open supplier requests (vercel.json cron).
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>`.
 * Rule: first reminder 7 days after the request, then every 7 days, max 3.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const candidates = await loadReminderCandidates(admin, undefined, { requireRecipient: true })
    const due = candidates.filter(c => isDueForReminder(c))

    const results: { requestId: string; product: string; to: string | null; sent: boolean; reason?: string }[] = []
    for (const c of due) {
      try {
        const r = await sendRequestReminder(admin, c)
        results.push({ requestId: c.requestId, product: c.productName, ...r })
      } catch (err) {
        results.push({ requestId: c.requestId, product: c.productName, to: null, sent: false, reason: err instanceof Error ? err.message : 'send failed' })
      }
    }

    const sent = results.filter(r => r.sent).length
    console.log(`Reminder cron: ${candidates.length} open, ${due.length} due, ${sent} sent`)
    return NextResponse.json({ open: candidates.length, due: due.length, sent, results })
  } catch (error) {
    console.error('Reminder cron error:', error)
    return NextResponse.json({ error: 'Reminder run failed' }, { status: 500 })
  }
}
