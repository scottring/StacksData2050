import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Who at the customer may see concentration values on a sheet.
 * Only the supplier (sheets.company_id) may read the customer's user list
 * here or change the setting. Masking itself happens in the DB view
 * sheet_answers_display via concentration_restricted().
 */
async function supplierContext(sheetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }

  const admin = createAdminClient()
  const [{ data: me }, { data: sheet }] = await Promise.all([
    admin.from('users').select('company_id').eq('id', user.id).single(),
    admin.from('sheets').select('id, company_id, requesting_company_id, concentration_viewer_id').eq('id', sheetId).single(),
  ])
  if (!sheet) return { error: NextResponse.json({ error: 'Sheet not found' }, { status: 404 }) }
  if (!me?.company_id || me.company_id !== sheet.company_id) {
    return { error: NextResponse.json({ error: 'Only the supplier can change concentration visibility' }, { status: 403 }) }
  }
  return { admin, sheet }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await supplierContext(id)
  if ('error' in ctx) return ctx.error
  const { admin, sheet } = ctx

  if (!sheet.requesting_company_id) return NextResponse.json({ users: [], viewerId: null })

  const { data: users } = await admin
    .from('users')
    .select('id, full_name, email')
    .eq('company_id', sheet.requesting_company_id)
    .not('email', 'ilike', '%placeholder%')
    .order('full_name')

  return NextResponse.json({ users: users || [], viewerId: sheet.concentration_viewer_id })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await supplierContext(id)
  if ('error' in ctx) return ctx.error
  const { admin, sheet } = ctx

  const { viewerId } = await req.json().catch(() => ({ viewerId: undefined }))
  if (viewerId !== null && typeof viewerId !== 'string') {
    return NextResponse.json({ error: 'viewerId must be a user id or null' }, { status: 400 })
  }

  if (viewerId) {
    const { data: target } = await admin.from('users').select('id, company_id').eq('id', viewerId).single()
    if (!target || target.company_id !== sheet.requesting_company_id) {
      return NextResponse.json({ error: 'That person is not at the requesting company' }, { status: 400 })
    }
  }

  const { error } = await admin.from('sheets').update({ concentration_viewer_id: viewerId }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, viewerId })
}
