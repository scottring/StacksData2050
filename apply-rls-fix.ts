import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

async function applyFix() {
  const url = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  console.log('Applying RLS fix migration...\n')

  const supabase = createClient(url, serviceKey)

  // Read the migration file
  const migrationPath = path.join(__dirname, 'web', 'supabase', 'migrations', '20260130_fix_rls_for_trial.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split into individual statements (simple approach)
  // For complex migrations, you'd want to use a proper SQL parser
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  // Execute key steps manually using Supabase APIs

  // Step 1: Add is_super_admin column
  console.log('Step 1: Adding is_super_admin column...')
  const { error: col1Error } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'is_super_admin'
        ) THEN
          ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `
  })

  if (col1Error) {
    // Try alternative approach
    console.log('  RPC not available, trying direct query...')

    // Check if column exists first
    const { data: colCheck } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single()

    if (colCheck && !('is_super_admin' in colCheck)) {
      console.log('  Column does not exist. Need to add via Supabase Dashboard SQL Editor.')
      console.log('  Run this SQL:')
      console.log('    ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;')
    } else if (colCheck && 'is_super_admin' in colCheck) {
      console.log('  ✅ Column already exists')
    }
  } else {
    console.log('  ✅ Done')
  }

  // Step 2: Update demo users
  console.log('\nStep 2: Setting up demo user roles...')

  const demoUsers = [
    { email: 'kaisa.herranen@upm.com', role: 'admin' },
    { email: 'christian.torborg@sappi.com', role: 'admin' },
    { email: 'tiia.aho@kemira.com', role: 'editor' },
    { email: 'abdessamad.arbaoui@omya.com', role: 'editor' },
  ]

  for (const u of demoUsers) {
    const { error } = await supabase
      .from('users')
      .update({ role: u.role })
      .eq('email', u.email)

    if (error) {
      console.log(`  ❌ Failed to update ${u.email}:`, error.message)
    } else {
      console.log(`  ✅ ${u.email} -> ${u.role}`)
    }
  }

  // Step 3: Verify current state
  console.log('\nStep 3: Verifying current state...')

  const { data: users } = await supabase
    .from('users')
    .select('email, role, is_super_admin, company_id')
    .in('email', demoUsers.map(u => u.email))

  console.log('Demo users:')
  users?.forEach(u => {
    console.log(`  ${u.email}: role=${u.role}, super=${u.is_super_admin}, company=${u.company_id}`)
  })

  // Check if is_super_admin column exists now
  const { data: userCheck } = await supabase
    .from('users')
    .select('is_super_admin')
    .limit(1)
    .single()

  if (userCheck && 'is_super_admin' in userCheck) {
    console.log('\n✅ is_super_admin column exists')
  } else {
    console.log('\n❌ is_super_admin column STILL MISSING - run the SQL in Supabase Dashboard')
  }

  console.log('\n=== IMPORTANT ===')
  console.log('The full RLS policy fix requires running SQL in the Supabase Dashboard.')
  console.log('Go to: https://supabase.com/dashboard/project/yrguoooxamecsjtkfqcw/sql')
  console.log('And run the contents of: web/supabase/migrations/20260130_fix_rls_for_trial.sql')
}

applyFix().catch(console.error)
