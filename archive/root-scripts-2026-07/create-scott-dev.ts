import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: 'web/.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMAIL = 'scott.kaufman@stacksdata.com'
const PASSWORD = 'dev2026'
const FULL_NAME = 'Scott Kaufman'

async function main() {
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const found = existing.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())

  let authUserId: string
  if (found) {
    console.log(`Auth user already exists (${found.id}); resetting password`)
    const { error } = await supabase.auth.admin.updateUserById(found.id, { password: PASSWORD })
    if (error) {
      console.error('password update error', error)
      process.exit(1)
    }
    authUserId = found.id
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    })
    if (error || !created.user) {
      console.error('create auth user error', error)
      process.exit(1)
    }
    authUserId = created.user.id
    console.log(`Created auth user ${authUserId}`)
  }

  // Pick a company to attach (any existing company) — super_admin bypasses role checks anyway
  const { data: anyCompany } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)
    .single()
  if (!anyCompany) {
    console.error('No companies in dev DB to attach user to')
    process.exit(1)
  }

  const { data: pubExisting } = await supabase
    .from('users')
    .select('id')
    .eq('id', authUserId)
    .maybeSingle()

  if (pubExisting) {
    const { error } = await supabase
      .from('users')
      .update({
        email: EMAIL,
        full_name: FULL_NAME,
        first_name: 'Scott',
        last_name: 'Kaufman',
        role: 'super_admin',
        has_logged_in: true,
      })
      .eq('id', authUserId)
    if (error) console.error('public.users update error', error)
    else console.log('Updated existing public.users row')
  } else {
    const { error } = await supabase.from('users').insert({
      id: authUserId,
      email: EMAIL,
      full_name: FULL_NAME,
      first_name: 'Scott',
      last_name: 'Kaufman',
      role: 'admin',
      is_super_admin: true,
      company_id: anyCompany.id,
      has_logged_in: true,
      password_changed: true,
    })
    if (error) console.error('public.users insert error', error)
    else console.log(`Created public.users row attached to company ${anyCompany.name}`)
  }

  console.log(`\nDone. Login with ${EMAIL} / ${PASSWORD}`)
}

main()
