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
    const { token, authUserId, fullName, companyName } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    if (!authUserId || typeof authUserId !== 'string') {
      return NextResponse.json({ error: 'authUserId required' }, { status: 400 })
    }
    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json({ error: 'fullName required' }, { status: 400 })
    }

    const service = getServiceClient()

    const { data: invitation, error: inviteError } = await service
      .from('invitations')
      .select('id, email, company_id, company_name, request_id, accepted_at, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (inviteError) throw inviteError
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 })
    }
    if (new Date(invitation.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
    }

    // Verify the auth user matches the invitation email
    const { data: authUser, error: authUserError } = await service.auth.admin.getUserById(authUserId)
    if (authUserError || !authUser?.user) {
      return NextResponse.json({ error: 'Auth user not found' }, { status: 404 })
    }
    if (authUser.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ error: 'Auth user email does not match invitation' }, { status: 400 })
    }

    // Resolve or create company
    let companyId = invitation.company_id
    if (!companyId) {
      const resolvedName = (companyName && companyName.trim()) || invitation.company_name || `Company for ${invitation.email}`
      const { data: newCompany, error: companyError } = await service
        .from('companies')
        .insert({ name: resolvedName })
        .select('id')
        .single()
      if (companyError) throw companyError
      companyId = newCompany.id
    }

    // Create or update the public.users row (use upsert in case it already partially exists)
    const { error: userError } = await service
      .from('users')
      .upsert(
        {
          id: authUserId,
          email: invitation.email,
          full_name: fullName,
          company_id: companyId,
          role: 'admin',
        },
        { onConflict: 'id' }
      )
    if (userError) throw userError

    // Mark invitation accepted
    await service
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // If the invitation is tied to a specific request, return the associated sheet for redirect
    let redirectSheetId: string | null = null
    if (invitation.request_id) {
      const { data: req } = await service
        .from('requests')
        .select('sheet_id')
        .eq('id', invitation.request_id)
        .maybeSingle()
      redirectSheetId = req?.sheet_id ?? null
    }

    return NextResponse.json({
      userId: authUserId,
      companyId,
      redirectSheetId,
    })
  } catch (err: any) {
    console.error('Error completing signup:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to complete signup' },
      { status: 500 }
    )
  }
}
