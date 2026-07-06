/**
 * Backfill orphan auth users produced by the pre-fix signup flow.
 *
 * Before the fix: auth.signUp created an auth.users row but the downstream
 * public.users insert was blocked (RLS / wrong role enum), leaving users
 * with a login but no app-level identity.
 *
 * This script:
 *  1. Finds auth.users rows with no matching public.users row.
 *  2. For each, looks up the most recent invitation with a valid company.
 *  3. In --apply mode, upserts the public.users row and marks that
 *     invitation accepted. Dry-run by default.
 *
 * Usage:
 *   Dry-run (read-only):
 *     npx tsx --env-file=.env.production backfill-orphan-users.ts
 *   Apply for real:
 *     npx tsx --env-file=.env.production backfill-orphan-users.ts --apply
 */

import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listAllAuthUsers() {
  const all: { id: string; email: string | null; created_at: string }[] = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    for (const u of data.users) {
      all.push({ id: u.id, email: u.email ?? null, created_at: u.created_at })
    }
    if (data.users.length < perPage) break
    page += 1
  }
  return all
}

const authUsers = await listAllAuthUsers()
console.log(`Auth users total: ${authUsers.length}`)

const authIds = authUsers.map((u) => u.id)
const { data: publicUsers, error: publicErr } = await service
  .from('users')
  .select('id')
  .in('id', authIds)
if (publicErr) throw publicErr
const publicIdSet = new Set((publicUsers ?? []).map((u) => u.id))

const orphans = authUsers.filter((u) => !publicIdSet.has(u.id))
console.log(`Orphan auth users (no public.users row): ${orphans.length}\n`)

const fixable: typeof orphans = []
const unresolved: { user: typeof orphans[number]; reason: string }[] = []
type Plan = {
  authUserId: string
  email: string
  invitationId: string
  companyId: string
  companyName: string | null
  inviteAcceptedAt: string | null
}
const plans: Plan[] = []

for (const u of orphans) {
  if (!u.email) {
    unresolved.push({ user: u, reason: 'no email on auth user' })
    continue
  }

  const { data: invitations } = await service
    .from('invitations')
    .select('id, company_id, company_name, accepted_at, expires_at, created_at')
    .ilike('email', u.email)
    .order('created_at', { ascending: false })

  if (!invitations || invitations.length === 0) {
    unresolved.push({ user: u, reason: 'no invitation found' })
    continue
  }

  const candidate =
    invitations.find((i) => i.company_id && !i.accepted_at) ??
    invitations.find((i) => i.company_id) ??
    null

  if (!candidate?.company_id) {
    unresolved.push({ user: u, reason: 'no invitation with company_id' })
    continue
  }

  const { data: company } = await service
    .from('companies')
    .select('id, name')
    .eq('id', candidate.company_id)
    .maybeSingle()

  if (!company) {
    unresolved.push({ user: u, reason: `invitation.company_id ${candidate.company_id} no longer exists` })
    continue
  }

  fixable.push(u)
  plans.push({
    authUserId: u.id,
    email: u.email,
    invitationId: candidate.id,
    companyId: company.id,
    companyName: company.name,
    inviteAcceptedAt: candidate.accepted_at,
  })
}

console.log(`Fixable: ${plans.length}`)
console.log(`Unresolved: ${unresolved.length}\n`)

for (const p of plans) {
  console.log(`  fix: ${p.email}  ->  company "${p.companyName}" (${p.companyId}), invitation ${p.invitationId}${p.inviteAcceptedAt ? ' (already accepted)' : ''}`)
}
if (plans.length > 0 && unresolved.length > 0) console.log('')
for (const u of unresolved) {
  console.log(`  skip: ${u.user.email ?? '<no email>'}  (${u.reason})`)
}

if (!APPLY) {
  console.log('\nDry-run only. Re-run with --apply to write changes.')
  process.exit(0)
}

console.log('\n--- APPLYING ---')

let successes = 0
let failures = 0

for (const p of plans) {
  const { error: upsertErr } = await service
    .from('users')
    .upsert(
      {
        id: p.authUserId,
        email: p.email,
        full_name: p.email.split('@')[0],
        company_id: p.companyId,
        role: 'admin',
      },
      { onConflict: 'id' }
    )

  if (upsertErr) {
    failures += 1
    console.error(`  FAIL ${p.email}: ${upsertErr.message}`)
    continue
  }

  if (!p.inviteAcceptedAt) {
    const { error: updateErr } = await service
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', p.invitationId)
    if (updateErr) {
      console.error(`  WARN  ${p.email}: users row ok, but invitation accept failed: ${updateErr.message}`)
    }
  }

  successes += 1
  console.log(`  ok   ${p.email}  ->  ${p.companyName}`)
}

console.log(`\nDone. Succeeded: ${successes}, Failed: ${failures}`)
