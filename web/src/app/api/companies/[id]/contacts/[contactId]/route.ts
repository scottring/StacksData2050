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
  'id, email, first_name, last_name, full_name, phone_text, job_title, is_company_main_contact, has_logged_in, company_id'

type PatchBody = {
  first_name?: string
  last_name?: string
  email?: string
  phone_text?: string | null
  job_title?: string | null
  is_primary?: boolean
}

async function authorize(companyId: string) {
  const userSupabase = await createUserClient()
  const {
    data: { user },
  } = await userSupabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 }

  const { data: me } = await userSupabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!me?.company_id) return { ok: false as const, status: 401 }

  const service = getServiceClient()
  const allowed = await companiesHaveRelationship(service, me.company_id, companyId)
  if (!allowed) return { ok: false as const, status: 403 }

  return { ok: true as const, service, myCompanyId: me.company_id }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: targetCompanyId, contactId } = await params
    const auth = await authorize(targetCompanyId)
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

    const { data: existing } = await auth.service
      .from('users')
      .select(CONTACT_FIELDS)
      .eq('id', contactId)
      .single()
    if (!existing || existing.company_id !== targetCompanyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.has_logged_in === true) {
      return NextResponse.json(
        { error: 'This contact has an active account and must edit their own profile.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as PatchBody

    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (body.email && body.email !== existing.email) {
      const { data: dup } = await auth.service
        .from('users')
        .select('id')
        .eq('company_id', targetCompanyId)
        .ilike('email', body.email.trim())
        .neq('id', contactId)
        .maybeSingle()
      if (dup) {
        return NextResponse.json(
          { error: 'A contact with that email already exists at this company' },
          { status: 409 }
        )
      }
    }

    if (body.is_primary === true) {
      await auth.service
        .from('users')
        .update({ is_company_main_contact: false })
        .eq('company_id', targetCompanyId)
        .eq('is_company_main_contact', true)
        .neq('id', contactId)
    }

    const patch: Record<string, unknown> = {}
    if (body.first_name !== undefined) patch.first_name = body.first_name.trim()
    if (body.last_name !== undefined) patch.last_name = body.last_name.trim()
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const first = (body.first_name ?? existing.first_name ?? '').trim()
      const last = (body.last_name ?? existing.last_name ?? '').trim()
      patch.full_name = `${first} ${last}`.trim()
    }
    if (body.email !== undefined) patch.email = body.email.trim()
    if (body.phone_text !== undefined)
      patch.phone_text = body.phone_text ? String(body.phone_text).trim() : null
    if (body.job_title !== undefined)
      patch.job_title = body.job_title ? String(body.job_title).trim() : null
    if (body.is_primary !== undefined) patch.is_company_main_contact = !!body.is_primary

    const { data: updated, error: updateError } = await auth.service
      .from('users')
      .update(patch)
      .eq('id', contactId)
      .select(CONTACT_FIELDS)
      .single()
    if (updateError || !updated) {
      console.error('PATCH contact error:', updateError)
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    return NextResponse.json({ contact: updated })
  } catch (error) {
    console.error('PATCH contact error:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: targetCompanyId, contactId } = await params
    const auth = await authorize(targetCompanyId)
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })

    const { data: existing } = await auth.service
      .from('users')
      .select('id, company_id, has_logged_in')
      .eq('id', contactId)
      .single()
    if (!existing || existing.company_id !== targetCompanyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.has_logged_in === true) {
      return NextResponse.json(
        { error: 'This contact has an active account and cannot be deleted here.' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await auth.service
      .from('users')
      .delete()
      .eq('id', contactId)
    if (deleteError) {
      console.error('DELETE contact error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE contact error:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
