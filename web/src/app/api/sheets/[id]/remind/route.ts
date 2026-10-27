import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadReminderCandidates, sendRequestReminder } from '@/lib/email/request-reminder'

/**
 * POST /api/sheets/[id]/remind
 * Manual reminder to the supplier for an open request. The caller must
 * belong to the requesting company. Ignores the automatic cadence limits.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sheetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: me }, { data: sheet }] = await Promise.all([
    admin.from('users').select('company_id, full_name, is_super_admin').eq('id', user.id).single(),
    admin.from('sheets').select('id, requesting_company_id, status').eq('id', sheetId).single(),
  ])
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })
  if (!me?.is_super_admin && (!me?.company_id || me.company_id !== sheet.requesting_company_id)) {
    return NextResponse.json({ error: 'Only the requesting company can send reminders' }, { status: 403 })
  }

  const [candidate] = await loadReminderCandidates(admin, [sheetId])
  if (!candidate) {
    return NextResponse.json({ error: 'No open request for this sheet (legacy import, withdrawn, or already answered)' }, { status: 400 })
  }

  try {
    const result = await sendRequestReminder(admin, candidate, { manual: true, senderName: me?.full_name })
    if (!result.sent) return NextResponse.json({ error: result.reason || 'Could not send' }, { status: 400 })
    return NextResponse.json({ success: true, to: result.to })
  } catch (error) {
    console.error('Manual reminder error:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
