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

    const { data: existingUser } = await service
      .from('users')
      .select('id, company_id, full_name, email, companies:company_id (id, name)')
      .ilike('email', email)
      .maybeSingle()

    if (existingUser?.company_id) {
      if (existingUser.company_id === userData.company_id) {
        return NextResponse.json(
          { error: 'That email belongs to a user at your own company.' },
          { status: 400 }
        )
      }

      const existingCompany = Array.isArray(existingUser.companies)
        ? existingUser.companies[0]
        : existingUser.companies

      return NextResponse.json({
        existingUser: true,
        company: existingCompany ?? { id: existingUser.company_id, name: null },
        invitation: null,
        inviterName: userData.full_name,
        requestingCompanyId: userData.company_id,
      })
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
      existingUser: false,
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
