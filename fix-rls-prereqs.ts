import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PROJECT_REF = 'yrguoooxamecsjtkfqcw'
const ACCESS_TOKEN = readFileSync(join(process.env.HOME!, '.supabase', 'access-token'), 'utf-8').trim()

async function runSQL(sql: string, label: string): Promise<any[]> {
  console.log(`\n--- ${label} ---`)
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  if (!resp.ok) {
    const text = await resp.text()
    console.log(`  FAILED (${resp.status}): ${text}`)
    throw new Error(`SQL failed: ${text}`)
  }

  const data = await resp.json()
  console.log(`  OK:`, JSON.stringify(data).slice(0, 300))
  return data
}

async function main() {
  console.log('=== RLS Prerequisites Fix Script ===\n')

  // ============================================================
  // STEP 1: Add is_super_admin column + set values + create index
  // ============================================================
  console.log('\n========== STEP 1: Add is_super_admin column ==========')

  await runSQL(
    `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;`,
    'Add is_super_admin column'
  )

  await runSQL(
    `UPDATE public.users SET is_super_admin = true WHERE role = 'super_admin';`,
    'Set is_super_admin = true for super_admin users'
  )

  await runSQL(
    `CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON public.users (is_super_admin) WHERE is_super_admin = true;`,
    'Create partial index on is_super_admin'
  )

  // ============================================================
  // STEP 2: Create helper functions in PUBLIC schema
  // (auth schema is owned by supabase_admin, postgres user cannot create there)
  // ============================================================
  console.log('\n========== STEP 2: Create helper functions ==========')
  console.log('NOTE: Creating in public schema (auth schema requires supabase_admin role)')

  await runSQL(`
    CREATE OR REPLACE FUNCTION public.is_super_admin()
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT COALESCE(
        (SELECT is_super_admin FROM public.users WHERE id = auth.uid()),
        false
      );
    $$;
  `, 'Create public.is_super_admin()')

  await runSQL(`
    CREATE OR REPLACE FUNCTION public.user_company_id()
    RETURNS UUID
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT company_id FROM public.users WHERE id = auth.uid();
    $$;
  `, 'Create public.user_company_id()')

  // Grant execute to authenticated role
  await runSQL(`GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;`, 'Grant execute is_super_admin to authenticated')
  await runSQL(`GRANT EXECUTE ON FUNCTION public.user_company_id() TO authenticated;`, 'Grant execute user_company_id to authenticated')
  await runSQL(`GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;`, 'Grant execute is_super_admin to anon')
  await runSQL(`GRANT EXECUTE ON FUNCTION public.user_company_id() TO anon;`, 'Grant execute user_company_id to anon')

  // ============================================================
  // STEP 3: Assign Scott a company_id
  // ============================================================
  console.log('\n========== STEP 3: Assign Scott a company_id ==========')

  const scottId = '2033838b-49b7-4410-9741-b88bcdc91f83'

  // Find "Stacks Data" company
  const stacksCompanies = await runSQL(
    `SELECT id, name FROM public.companies WHERE LOWER(name) LIKE '%stacks%data%' OR LOWER(name) LIKE '%stacksdata%';`,
    'Find Stacks Data company'
  )

  let stacksCompanyId: string

  if (stacksCompanies && stacksCompanies.length > 0) {
    stacksCompanyId = stacksCompanies[0].id
    console.log(`  Found existing company: ${stacksCompanies[0].name} (${stacksCompanyId})`)
  } else {
    console.log('  No "Stacks Data" company found. Creating one...')
    const result = await runSQL(
      `INSERT INTO public.companies (name) VALUES ('Stacks Data') RETURNING id, name;`,
      'Create Stacks Data company'
    )
    stacksCompanyId = result[0].id
    console.log(`  Created company: ${result[0].name} (${stacksCompanyId})`)
  }

  // Update Scott's company_id
  await runSQL(
    `UPDATE public.users SET company_id = '${stacksCompanyId}' WHERE id = '${scottId}';`,
    'Update Scott company_id'
  )

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log('\n========== FINAL VERIFICATION ==========')

  await runSQL(
    `SELECT id, email, role, company_id, is_super_admin FROM public.users WHERE id = '${scottId}';`,
    'Scott final state'
  )

  await runSQL(
    `SELECT id, email, role, is_super_admin, company_id FROM public.users WHERE is_super_admin = true;`,
    'All super admin users'
  )

  await runSQL(
    `SELECT id, email, role, company_id FROM public.users WHERE company_id IS NULL;`,
    'Users with NULL company_id'
  )

  await runSQL(
    `SELECT routine_schema, routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('is_super_admin', 'user_company_id');`,
    'Helper functions in public schema'
  )

  await runSQL(
    `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_super_admin';`,
    'is_super_admin column info'
  )

  console.log('\n=== DONE ===')
  console.log('\nIMPORTANT: The RLS migration must use public.is_super_admin() and public.user_company_id()')
  console.log('instead of auth.is_super_admin() and auth.user_company_id().')
  console.log('The auth schema is owned by supabase_admin and cannot be modified via the Management API.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
