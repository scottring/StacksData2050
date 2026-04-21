import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    supabase,
    user,
    companyId: profile.company_id,
    role: profile.role,
    isSuperAdmin: profile.role === 'super_admin',
  }
}
