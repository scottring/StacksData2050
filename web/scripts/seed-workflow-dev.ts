// Dev seed for the Product Introduction Workflow.
//
// Idempotently upserts a plant for Dev Customer Co (code "DEV1") and grants
// admin@devcustomer.test every WORKFLOW_ROLES role at that plant, so one dev
// account can walk the entire approval pipeline locally.
//
// Usage:
//   cd stacks/web
//   npx tsx --env-file=.env.local scripts/seed-workflow-dev.ts
//
// Convention matches scripts/check-rls.ts: dotenv loads .env.local, service
// role client bypasses RLS for the seed writes. Delete-then-insert per
// stacks/seed-sappi-workflow.ts's convention (that script upserts; here we
// delete existing role rows for the user at the plant, then insert fresh so
// re-runs are exact rather than merely additive).

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { WORKFLOW_ROLES } from '../src/lib/workflows/product-introduction'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEV_CUSTOMER_CO_ID = 'aada3dc9-5fb7-4443-9c53-322ceb990dfa'
const DEV_ADMIN_EMAIL = 'admin@devcustomer.test'

async function main() {
  console.log('Seeding Dev Customer Co workflow configuration...\n')

  // 1. Look up the all-roles dev user.
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, company_id')
    .eq('email', DEV_ADMIN_EMAIL)
    .maybeSingle()

  if (userError || !user) {
    console.error(`Could not find user ${DEV_ADMIN_EMAIL}:`, userError)
    process.exit(1)
  }
  console.log(`Dev admin user: ${user.id}  (${user.email})`)

  // 2. Upsert the DEV1 plant for Dev Customer Co.
  const { data: existingPlant } = await supabase
    .from('plants')
    .select('id')
    .eq('company_id', DEV_CUSTOMER_CO_ID)
    .eq('code', 'DEV1')
    .maybeSingle()

  let plantId: string
  if (existingPlant) {
    plantId = existingPlant.id
    console.log(`Plant already exists: ${plantId}  (DEV1)`)
  } else {
    const { data: newPlant, error: plantError } = await supabase
      .from('plants')
      .insert({
        company_id: DEV_CUSTOMER_CO_ID,
        code: 'DEV1',
        name: 'Dev Plant 1',
      })
      .select('id')
      .single()

    if (plantError || !newPlant) {
      console.error('Failed to create plant:', plantError)
      process.exit(1)
    }
    plantId = newPlant.id
    console.log(`Plant created: ${plantId}  (DEV1)`)
  }

  // 3. Delete-then-insert all WORKFLOW_ROLES for the dev admin at this plant.
  const { error: deleteError } = await supabase
    .from('plant_role_assignments')
    .delete()
    .eq('plant_id', plantId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Failed to clear existing role assignments:', deleteError)
    process.exit(1)
  }

  const { data: inserted, error: insertError } = await supabase
    .from('plant_role_assignments')
    .insert(
      WORKFLOW_ROLES.map((role) => ({
        plant_id: plantId,
        user_id: user.id,
        role,
      }))
    )
    .select('role')

  if (insertError) {
    console.error('Failed to insert role assignments:', insertError)
    process.exit(1)
  }

  console.log(`\nAssigned ${inserted?.length ?? 0} roles to ${user.email} at plant ${plantId}:`)
  for (const r of inserted ?? []) console.log(`  - ${r.role}`)

  console.log(`\nDone. Plant id: ${plantId}`)
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
