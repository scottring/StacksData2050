import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { email, companyName, createSheet, productName, selectedTags } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const service = getServiceClient()

    const { data: userData } = await service
      .from('users')
      .select('company_id, full_name')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 400 })
    }

    const { data: newCompany, error: companyError } = await service
      .from('companies')
      .insert({ name: companyName || `Invited: ${email}` })
      .select()
      .single()

    if (companyError) throw companyError

    const token = crypto.randomUUID()
    const { data: invitation, error: inviteError } = await service
      .from('invitations')
      .insert({
        email,
        company_name: companyName || null,
        company_id: newCompany.id,
        token,
        created_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (inviteError) throw inviteError

    return NextResponse.json({
      company: newCompany,
      invitation,
      inviterName: userData.full_name,
      requestingCompanyId: userData.company_id,
    })
  } catch (error: any) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
