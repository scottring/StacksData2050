import type { SupabaseClient } from '@supabase/supabase-js'

interface NotificationInput {
  type: string
  title: string
  message: string
  link: string
}

// Inserts one in-app notification per user of the company. Callers pass a
// service-role client because notifications target users other than the caller.
export async function createNotificationsForCompany(
  admin: SupabaseClient,
  companyId: string,
  n: NotificationInput
): Promise<void> {
  const { data: users, error } = await admin.from('users').select('id').eq('company_id', companyId)
  if (error || !users || users.length === 0) return
  const rows = users.map((u) => ({
    user_id: u.id,
    company_id: companyId,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: false,
  }))
  const { error: insErr } = await admin.from('notifications').insert(rows)
  if (insErr) console.error('[notifications] insert failed:', insErr.message)
}
