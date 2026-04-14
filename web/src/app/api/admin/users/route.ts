import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Verify super admin using admin client (bypasses RLS)
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('users')
      .select('role, is_super_admin')
      .eq('id', authUser.id)
      .single()

    if (!profile?.is_super_admin && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin required' }, { status: 403 })
    }

    // Fetch all users with company names
    const { data: users } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_super_admin')
      .not('email', 'ilike', '%placeholder%')
      .order('email')

    // Fetch companies for name lookup
    const { data: companies } = await admin
      .from('companies')
      .select('id, name')

    const companyMap = new Map((companies || []).map(c => [c.id, c.name]))

    const formattedUsers = (users || []).map(u => ({
      ...u,
      company_name: u.company_id ? companyMap.get(u.company_id) || null : null,
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error: any) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
