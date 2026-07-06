/**
 * Dev-only — set a known password ('demo2026') on the accounts that
 * actually exist in the current DEV database so the Sappi Alfeld
 * Product Introduction Workflow demo is loginnable.
 *
 * Targets: super-admin (scott.kaufman) + the 9 fake Alfeld reviewers.
 * Idempotent. Usage: npx tsx set-demo-passwords.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const DEMO_PASSWORD = 'demo2026'

const TARGET_EMAILS = [
  'scott.kaufman@stacksdata.com',
  'b.neumann@dev-sappi-alfeld.fake',
  'r.huster@dev-sappi-alfeld.fake',
  'h.brix@dev-sappi-alfeld.fake',
  's.berdzinski@dev-sappi-alfeld.fake',
  'c.brendes@dev-sappi-alfeld.fake',
  'd.jeckstadt@dev-sappi-alfeld.fake',
  't.handke@dev-sappi-alfeld.fake',
  'r.ahrens@dev-sappi-alfeld.fake',
  'operator.alfeld@dev-sappi-alfeld.fake',
]

async function main() {
  // page through auth users to map email -> id
  let all: any[] = [], page = 1
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) { console.error('listUsers error:', error.message); break }
    all = all.concat(data.users)
    if (data.users.length < 1000) break
    page++
  }
  const byEmail = new Map(all.map(u => [u.email, u]))

  for (const email of TARGET_EMAILS) {
    const u = byEmail.get(email)
    if (!u) { console.log(`SKIP  ${email} — no auth user`); continue }
    const { error } = await sb.auth.admin.updateUserById(u.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    console.log(error ? `FAIL  ${email}: ${error.message}` : `OK    ${email}`)
  }
  console.log(`\nPassword for all: ${DEMO_PASSWORD}`)
}
main().catch(e => { console.error(e); process.exit(1) })
