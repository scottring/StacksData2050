import type { SupabaseClient } from '@supabase/supabase-js'

// The data has no clean customer/supplier flag (companies can be both).
// The honest signal is request direction: a company that only receives
// requests works in the Station; everyone else starts in Command.
export async function resolveLandingPath(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: userData } = await supabase.from('users').select('company_id').eq('id', userId).single()
  if (!userData?.company_id) return '/command'
  const [{ count: outgoing }, { count: incoming }] = await Promise.all([
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('requestor_id', userData.company_id),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('requesting_from_id', userData.company_id),
  ])
  if ((incoming ?? 0) > 0 && (outgoing ?? 0) === 0) return '/station'
  return '/command'
}
