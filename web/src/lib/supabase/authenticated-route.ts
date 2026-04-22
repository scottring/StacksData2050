import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    supabase,
    user,
    companyId: profile.company_id,
    role: profile.role,
    isSuperAdmin: profile.is_super_admin === true || profile.role === 'super_admin',
  }
}
