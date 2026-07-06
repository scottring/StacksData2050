/**
 * RLS Phased Rollout Script
 * Phase 1: Test with sheets table only
 * Phase 2: Apply full migration
 * Phase 3: Verify full migration
 *
 * Uses Supabase Management API for SQL execution.
 */

import 'dotenv/config'
import fs from 'fs'

const PROJECT_REF = 'yrguoooxamecsjtkfqcw'
const SUPABASE_ACCESS_TOKEN = 'sbp_a87d8078705e0124958c2d04d3ccb7c4c0080b8f'
const MGMT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function execSQL(sql: string): Promise<any[]> {
  const response = await fetch(MGMT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SQL Error (${response.status}): ${text}`)
  }

  const data = await response.json()

  // Management API returns error objects sometimes
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(`SQL Error: ${JSON.stringify(data)}`)
  }

  return data as any[]
}

// ---- Phase 1: Test RLS on sheets only ----

async function phase1(): Promise<boolean> {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 1: Test RLS on sheets table only')
  console.log('='.repeat(60))

  // Step 1: Get baseline counts
  console.log('\n--- Baseline counts ---')
  const totalSheets = await execSQL('SELECT COUNT(*) as count FROM sheets')
  console.log(`Total sheets: ${totalSheets[0].count}`)

  // Get company info for test users
  const users = await execSQL(`
    SELECT u.id, u.email, u.company_id, u.is_super_admin, c.name as company_name
    FROM users u
    LEFT JOIN companies c ON c.id = u.company_id
    WHERE u.email IN ('scott@stacksdata.com', 'kaisa.herranen@upm.com', 'christian.torborg@sappi.com')
  `)

  console.log('\nTest users:')
  for (const user of users) {
    console.log(`  ${user.email}: company_id=${user.company_id}, company=${user.company_name}, is_super_admin=${user.is_super_admin}`)
  }

  const scottUser = users.find((u: any) => u.email === 'scott@stacksdata.com')
  const kaisaUser = users.find((u: any) => u.email === 'kaisa.herranen@upm.com')
  const christianUser = users.find((u: any) => u.email === 'christian.torborg@sappi.com')

  // Simulate RLS policy counts
  console.log('\n--- Simulated RLS counts (what each user SHOULD see) ---')
  console.log(`\nScott (super_admin): ALL ${totalSheets[0].count} sheets`)

  if (kaisaUser) {
    const kaisaSheets = await execSQL(`
      SELECT COUNT(*) as count FROM sheets
      WHERE company_id = '${kaisaUser.company_id}' OR requesting_company_id = '${kaisaUser.company_id}'
    `)
    const kaisaOwned = await execSQL(`SELECT COUNT(*) as count FROM sheets WHERE company_id = '${kaisaUser.company_id}'`)
    const kaisaRequested = await execSQL(`SELECT COUNT(*) as count FROM sheets WHERE requesting_company_id = '${kaisaUser.company_id}'`)
    console.log(`Kaisa (UPM, ${kaisaUser.company_id}): ${kaisaSheets[0].count} sheets`)
    console.log(`  - Owned (company_id): ${kaisaOwned[0].count}`)
    console.log(`  - Requested (requesting_company_id): ${kaisaRequested[0].count}`)
  }

  if (christianUser) {
    const christianSheets = await execSQL(`
      SELECT COUNT(*) as count FROM sheets
      WHERE company_id = '${christianUser.company_id}' OR requesting_company_id = '${christianUser.company_id}'
    `)
    const christianOwned = await execSQL(`SELECT COUNT(*) as count FROM sheets WHERE company_id = '${christianUser.company_id}'`)
    const christianRequested = await execSQL(`SELECT COUNT(*) as count FROM sheets WHERE requesting_company_id = '${christianUser.company_id}'`)
    console.log(`Christian (Sappi, ${christianUser.company_id}): ${christianSheets[0].count} sheets`)
    console.log(`  - Owned (company_id): ${christianOwned[0].count}`)
    console.log(`  - Requested (requesting_company_id): ${christianRequested[0].count}`)
  }

  // Step 2: Check existing policies on sheets
  console.log('\n--- Current policies on sheets ---')
  const existingPolicies = await execSQL(`
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sheets' ORDER BY policyname
  `)
  if (existingPolicies.length === 0) {
    console.log('  No existing policies')
  } else {
    for (const p of existingPolicies) {
      console.log(`  - ${p.policyname} (${p.cmd})`)
    }
  }

  // Check current RLS status
  const rlsBefore = await execSQL(`
    SELECT relrowsecurity FROM pg_class WHERE relname = 'sheets'
  `)
  console.log(`  RLS currently: ${rlsBefore[0]?.relrowsecurity ? 'ENABLED' : 'DISABLED'}`)

  // Step 3: Apply RLS policies to sheets
  console.log('\n--- Applying RLS to sheets table ---')

  const dropStatements = [
    `DROP POLICY IF EXISTS "Enable read access for all users" ON sheets`,
    `DROP POLICY IF EXISTS "Allow authenticated read" ON sheets`,
    `DROP POLICY IF EXISTS "Users can access sheets they're involved with" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_select_policy" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_insert_policy" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_update_policy" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_delete_policy" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_select" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_insert" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_update" ON sheets`,
    `DROP POLICY IF EXISTS "sheets_delete" ON sheets`,
  ]

  for (const sql of dropStatements) {
    await execSQL(sql)
  }
  console.log('  Dropped all existing policies on sheets')

  await execSQL('ALTER TABLE sheets ENABLE ROW LEVEL SECURITY')
  console.log('  Enabled RLS on sheets')

  // Create the 4 policies
  await execSQL(`
    CREATE POLICY "sheets_select"
    ON sheets FOR SELECT
    USING (
      public.is_super_admin() = true
      OR company_id = public.user_company_id()
      OR requesting_company_id = public.user_company_id()
    )
  `)
  console.log('  Created sheets_select policy')

  await execSQL(`
    CREATE POLICY "sheets_insert"
    ON sheets FOR INSERT
    WITH CHECK (
      public.is_super_admin() = true
      OR (
        (company_id = public.user_company_id() OR requesting_company_id = public.user_company_id())
        AND EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
      )
    )
  `)
  console.log('  Created sheets_insert policy')

  await execSQL(`
    CREATE POLICY "sheets_update"
    ON sheets FOR UPDATE
    USING (
      public.is_super_admin() = true
      OR (
        (company_id = public.user_company_id() OR requesting_company_id = public.user_company_id())
        AND EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role IN ('admin', 'editor', 'reviewer')
        )
      )
    )
  `)
  console.log('  Created sheets_update policy')

  await execSQL(`
    CREATE POLICY "sheets_delete"
    ON sheets FOR DELETE
    USING (public.is_super_admin() = true)
  `)
  console.log('  Created sheets_delete policy')

  // Step 4: Verify
  console.log('\n--- Verify sheets RLS ---')
  const rlsAfter = await execSQL(`SELECT relrowsecurity FROM pg_class WHERE relname = 'sheets'`)
  console.log(`  RLS enabled: ${rlsAfter[0]?.relrowsecurity}`)

  const newPolicies = await execSQL(`
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sheets' ORDER BY policyname
  `)
  console.log(`  Policies (${newPolicies.length}):`)
  for (const p of newPolicies) {
    console.log(`    - ${p.policyname} (${p.cmd})`)
  }

  // Step 5: Quick smoke test -- service role bypasses RLS, so count should remain the same
  const postRlsCount = await execSQL('SELECT COUNT(*) as count FROM sheets')
  console.log(`\n  Post-RLS total (via management API, bypasses RLS): ${postRlsCount[0].count}`)
  const countMatch = Number(postRlsCount[0].count) === Number(totalSheets[0].count)
  console.log(`  Count matches pre-RLS: ${countMatch ? 'YES' : 'NO -- PROBLEM'}`)

  // Step 6: Test with actual Supabase client as each user
  console.log('\n--- Testing with real Supabase client auth ---')
  const { createClient } = await import('@supabase/supabase-js')

  const SUPABASE_URL = process.env.SUPABASE_URL!
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTY0NTksImV4cCI6MjA4MDE5MjQ1OX0.YHwvnbd8QWJGo8BmcAn47oPvXR1vyFQ90KGA7u4_rhs'

  // Service role client -- should bypass RLS
  const srClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { count: srCount } = await srClient.from('sheets').select('*', { count: 'exact', head: true })
  console.log(`  Service role client sees: ${srCount} sheets`)

  // Sign in as each demo user and count sheets
  const demoPassword = 'demo2026'

  for (const testUser of [
    { email: 'scott@stacksdata.com', label: 'Scott (super_admin)' },
    { email: 'kaisa.herranen@upm.com', label: 'Kaisa (UPM)' },
    { email: 'christian.torborg@sappi.com', label: 'Christian (Sappi)' },
  ]) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
      email: testUser.email,
      password: demoPassword,
    })

    if (authError) {
      console.log(`  ${testUser.label}: auth failed -- ${authError.message}`)
      continue
    }

    const { count, error: queryError } = await userClient.from('sheets').select('*', { count: 'exact', head: true })
    if (queryError) {
      console.log(`  ${testUser.label}: query failed -- ${queryError.message}`)
    } else {
      console.log(`  ${testUser.label} sees: ${count} sheets`)
    }

    await userClient.auth.signOut()
  }

  console.log('\n--- Phase 1 COMPLETE ---')
  return true
}

// ---- Phase 2: Apply full migration ----

async function phase2(): Promise<boolean> {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 2: Apply full RLS migration')
  console.log('='.repeat(60))

  const migrationPath = '/Users/scottkaufman/Developer/StacksData2050/stacks/web/supabase/migrations/20260311000001_production_rls.sql'
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  // Split into individual statements. We need to be careful with semicolons inside policy bodies.
  // Approach: split on semicolons that are followed by newline (not inside parentheses)
  const statements: string[] = []
  let current = ''
  let parenDepth = 0

  for (const char of migrationSQL) {
    if (char === '(') parenDepth++
    if (char === ')') parenDepth--
    if (char === ';' && parenDepth === 0) {
      const trimmed = current.trim()
      if (trimmed && !trimmed.match(/^--/)) {
        // Remove leading comment lines but keep the SQL
        const sqlOnly = trimmed.split('\n').filter(line => {
          const l = line.trim()
          return l && !l.startsWith('--')
        }).join('\n').trim()
        if (sqlOnly) {
          statements.push(sqlOnly)
        }
      }
      current = ''
    } else {
      current += char
    }
  }

  console.log(`\nParsed ${statements.length} SQL statements from migration file`)
  console.log('Executing...\n')

  let succeeded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.replace(/\n/g, ' ').substring(0, 100)

    try {
      await execSQL(stmt)
      succeeded++
      console.log(`  [OK] ${preview}...`)
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('already exists') || msg.includes('does not exist')) {
        skipped++
        console.log(`  [SKIP] ${preview}... (${msg.substring(msg.indexOf(':') + 1, msg.indexOf(':') + 60).trim()})`)
      } else {
        failed++
        console.error(`  [FAIL] ${preview}...`)
        console.error(`         ${msg.substring(0, 200)}`)
      }
    }
  }

  console.log(`\nMigration results: ${succeeded} OK, ${skipped} skipped, ${failed} failed`)

  if (failed > 0) {
    console.log('WARNING: Some statements failed. Review errors above.')
  }

  return failed === 0
}

// ---- Phase 3: Verify full migration ----

async function phase3() {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 3: Verify full RLS migration')
  console.log('='.repeat(60))

  // Check RLS on key tables
  console.log('\n--- RLS Status ---')
  const rlsCheck = await execSQL(`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname IN (
      'sheets', 'answers', 'companies', 'users', 'sheet_statuses',
      'answer_rejections', 'requests', 'sheet_chemicals', 'chemical_inventory',
      'tags', 'question_tags', 'sheet_tags',
      'sections', 'subsections', 'questions', 'choices',
      'list_table_columns', 'list_table_rows',
      'canonical_parameters', 'canonical_parameter_tags'
    )
    ORDER BY c.relname
  `)

  for (const row of rlsCheck) {
    const status = row.rls_enabled ? 'ENABLED' : 'DISABLED'
    const icon = row.rls_enabled ? '[OK]' : '[!!]'
    console.log(`  ${icon} ${row.table_name}: RLS ${status}`)
  }

  // Policies per table
  console.log('\n--- Policies per table ---')
  const policyCounts = await execSQL(`
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies WHERE schemaname = 'public'
    GROUP BY tablename ORDER BY tablename
  `)
  for (const row of policyCounts) {
    console.log(`  ${row.tablename}: ${row.policy_count} policies`)
  }

  // All policies detail
  console.log('\n--- All policies ---')
  const allPolicies = await execSQL(`
    SELECT tablename, policyname, cmd
    FROM pg_policies WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `)
  let currentTable = ''
  for (const p of allPolicies) {
    if (p.tablename !== currentTable) {
      currentTable = p.tablename
      console.log(`\n  ${currentTable}:`)
    }
    console.log(`    - ${p.policyname} (${p.cmd})`)
  }

  // Index check
  console.log('\n\n--- Index check ---')
  const indexCheck = await execSQL(`
    SELECT indexname FROM pg_indexes WHERE tablename = 'answers' AND indexname = 'idx_answers_sheet_id'
  `)
  console.log(`  idx_answers_sheet_id: ${indexCheck.length > 0 ? 'EXISTS' : 'MISSING'}`)

  // Real user tests
  console.log('\n--- Real user session tests ---')
  const { createClient } = await import('@supabase/supabase-js')
  const SUPABASE_URL = process.env.SUPABASE_URL!
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3Vvb294YW1lY3NqdGtmcWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTY0NTksImV4cCI6MjA4MDE5MjQ1OX0.YHwvnbd8QWJGo8BmcAn47oPvXR1vyFQ90KGA7u4_rhs'
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const demoPassword = 'demo2026'

  // Total counts via service role
  const srClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { count: totalSheets } = await srClient.from('sheets').select('*', { count: 'exact', head: true })
  const { count: totalAnswers } = await srClient.from('answers').select('*', { count: 'exact', head: true })
  const { count: totalCompanies } = await srClient.from('companies').select('*', { count: 'exact', head: true })
  const { count: totalUsers } = await srClient.from('users').select('*', { count: 'exact', head: true })

  console.log(`\n  Totals (service role): ${totalSheets} sheets, ${totalAnswers} answers, ${totalCompanies} companies, ${totalUsers} users`)

  for (const testUser of [
    { email: 'scott@stacksdata.com', label: 'Scott (super_admin)' },
    { email: 'kaisa.herranen@upm.com', label: 'Kaisa (UPM)' },
    { email: 'christian.torborg@sappi.com', label: 'Christian (Sappi)' },
  ]) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY)
    const { error: authError } = await userClient.auth.signInWithPassword({
      email: testUser.email,
      password: demoPassword,
    })

    if (authError) {
      console.log(`\n  ${testUser.label}: AUTH FAILED -- ${authError.message}`)
      continue
    }

    const { count: sheets } = await userClient.from('sheets').select('*', { count: 'exact', head: true })
    const { count: answers } = await userClient.from('answers').select('*', { count: 'exact', head: true })
    const { count: companies } = await userClient.from('companies').select('*', { count: 'exact', head: true })
    const { count: userCount } = await userClient.from('users').select('*', { count: 'exact', head: true })

    console.log(`\n  ${testUser.label}:`)
    console.log(`    Sheets: ${sheets} / ${totalSheets}`)
    console.log(`    Answers: ${answers} / ${totalAnswers}`)
    console.log(`    Companies: ${companies} / ${totalCompanies}`)
    console.log(`    Users: ${userCount} / ${totalUsers}`)

    await userClient.auth.signOut()
  }

  console.log('\n--- Phase 3 COMPLETE ---')
}

// ---- Main ----

async function main() {
  console.log('RLS Phased Rollout')
  console.log('==================')
  console.log(`Project: ${PROJECT_REF}`)
  console.log(`Time: ${new Date().toISOString()}`)

  // Phase 1
  const phase1Ok = await phase1()
  if (!phase1Ok) {
    console.log('\nPhase 1 had issues. Review output.')
  }

  console.log('\n' + '='.repeat(60))
  console.log('Phase 1 done. Proceeding to Phase 2...')
  console.log('='.repeat(60))

  // Phase 2
  const phase2Ok = await phase2()

  // Phase 3
  await phase3()

  if (phase2Ok) {
    console.log('\n' + '='.repeat(60))
    console.log('ALL PHASES COMPLETE. RLS is fully deployed.')
    console.log('='.repeat(60))
  } else {
    console.log('\n' + '='.repeat(60))
    console.log('ROLLOUT COMPLETE WITH WARNINGS. Review failed statements above.')
    console.log('='.repeat(60))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
