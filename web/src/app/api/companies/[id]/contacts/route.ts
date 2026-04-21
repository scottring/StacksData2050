import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { companiesHaveRelationship } from '@/lib/auth/has-relationship'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CONTACT_FIELDS =
  'id, email, first_name, last_name, full_name, phone_text, job_title, is_company_main_contact, has_logged_in'

function isPlaceholder(row: { email?: string | null; full_name?: string | null }) {
  return (
    !row.email ||
    row.email.includes('placeholder') ||
    !row.full_name ||
    row.full_name === 'Unknown'
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params
    const service = getServiceClient()

    const { data: contacts } = await service
      .from('users')
      .select(CONTACT_FIELDS)
      .eq('company_id', companyId)
      .order('full_name')

    const validContacts = (contacts || []).filter((c) => !isPlaceholder(c))

    return NextResponse.json(validContacts)
  } catch (error) {
    console.error('GET contacts error:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

type PostBody = {
  first_name: string
  last_name: string
  email: string
  phone_text?: string
  job_title?: string
  is_primary?: boolean
  send_invite?: boolean
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetCompanyId } = await params
    const body = (await request.json()) as PostBody

    if (!body.first_name?.trim() || !body.last_name?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { error: 'first_name, last_name, and email are required' },
        { status: 400 }
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const userSupabase = await createUserClient()
    const {
      data: { user },
    } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await userSupabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    if (!me?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = getServiceClient()
    const allowed = await companiesHaveRelationship(service, me.company_id, targetCompanyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: dup } = await service
      .from('users')
      .select('id')
      .eq('company_id', targetCompanyId)
      .ilike('email', body.email.trim())
      .maybeSingle()
    if (dup) {
      return NextResponse.json(
        { error: 'A contact with that email already exists at this company' },
        { status: 409 }
      )
    }

    if (body.is_primary) {
      await service
        .from('users')
        .update({ is_company_main_contact: false })
        .eq('company_id', targetCompanyId)
        .eq('is_company_main_contact', true)
    }

    const full_name = `${body.first_name.trim()} ${body.last_name.trim()}`.trim()
    const { data: inserted, error: insertError } = await service
      .from('users')
      .insert({
        company_id: targetCompanyId,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        full_name,
        email: body.email.trim(),
        phone_text: body.phone_text?.trim() || null,
        job_title: body.job_title?.trim() || null,
        is_company_main_contact: !!body.is_primary,
        has_logged_in: false,
      })
      .select(CONTACT_FIELDS)
      .single()

    if (insertError || !inserted) {
      console.error('Insert contact error:', insertError)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    let invite_sent = false
    if (body.send_invite) {
      const { error: inviteError } = await service.auth.admin.inviteUserByEmail(
        body.email.trim()
      )
      invite_sent = !inviteError
      if (inviteError) console.error('Invite error:', inviteError)
    }

    return NextResponse.json({ contact: inserted, invite_sent }, { status: 201 })
  } catch (error) {
    console.error('POST contact error:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
